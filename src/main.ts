/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Main Entry Point - Clinical Extractor
 * Integrates all modules and initializes the application
 */


// ==================== IMPORTS ====================

// Core State & Configuration
import AppStateManager from './state/AppStateManager';
import ExtractionTracker from './data/ExtractionTracker';
import FormManager, { setDependencies as setFormManagerDeps } from './forms/FormManager';
import DynamicFields, {
    setDependencies as setDynamicFieldsDeps,
    addIndication,
    addIntervention,
    addArm,
    addMortality,
    addMRS,
    addComplication,
    addPredictor,
    removeElement,
    updateArmSelectors
} from './forms/DynamicFields';

// PDF Modules
import PDFLoader from './pdf/PDFLoader';
import PDFRenderer from './pdf/PDFRenderer';
import TextSelection from './pdf/TextSelection';

// Services
import {
    generatePICO,
    generateSummary,
    validateFieldWithAI,
    findMetadata,
    handleExtractTables,
    handleImageAnalysis,
    handleDeepAnalysis
} from './services/AIService';
import {
    exportJSON,
    exportCSV,
    exportExcel,
    exportAudit,
    exportAnnotatedPDF
} from './services/ExportManager';
import FigureExtractor from './services/FigureExtractor';
import TableExtractor from './services/TableExtractor';
import AgentOrchestrator from './services/AgentOrchestrator';

// Utilities
import {
    calculateBoundingBox,
    addExtractionMarker,
    addExtractionMarkersForPage,
    autoAdvanceField,
    clearSearchMarkers,
    blobToBase64
} from './utils/helpers';
import StatusManager from './utils/status';
import MemoryManager from './utils/memory';
import { initializeErrorBoundary, triggerCrashStateSave } from './utils/errorBoundary';
import { checkAndOfferRecovery, triggerManualRecovery } from './utils/errorRecovery';

// ==================== DEPENDENCY INJECTION ====================

/**
 * Set up module dependencies
 * Some modules need references to other modules to avoid circular dependencies
 */
function setupDependencies() {
    // ExtractionTracker needs AppStateManager, StatusManager, PDFRenderer
    ExtractionTracker.setDependencies({
        appStateManager: AppStateManager,
        statusManager: StatusManager,
        pdfRenderer: PDFRenderer
    });

    // DynamicFields needs FormManager (must be set before FormManager init)
    setDynamicFieldsDeps({
        formManager: FormManager
    });

    // FormManager needs multiple dependencies
    setFormManagerDeps({
        appStateManager: AppStateManager,
        statusManager: StatusManager,
        dynamicFields: DynamicFields
    });
}

// ==================== PDF.JS CONFIGURATION ====================

/**
 * Configure PDF.js worker
 */
function configurePDFJS() {
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js worker configured');
    } else {
        console.error('PDF.js library not loaded');
    }
}

// ==================== SEARCH FUNCTIONS ====================

/**
 * Toggle the search interface visibility
 */
function toggleSearchInterface() {
    document.getElementById('search-interface')?.classList.toggle('active');
}

/**
 * Search for text in the PDF document
 */
async function searchInPDF() {
    const query = (document.getElementById('search-query') as HTMLInputElement).value.trim();
    if (!query) {
        StatusManager.show('Please enter text to search', 'warning');
        return;
    }

    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first', 'warning');
        return;
    }

    StatusManager.show('Searching across all pages...', 'info');

    // Clear previous search markers
    const markers = (state.searchMarkers || []).map(m => m.element);
    clearSearchMarkers(markers);

    // This is a simplified implementation
    // Full implementation would be in a PDFSearch module
    console.log('Search Query:', query);
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<li>Search results would appear here...</li>';
    }

    StatusManager.show('Search complete (preview)', 'success');
}

// ==================== EVENT LISTENERS ====================

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // PDF Upload
    const pdfUploadBtn = document.getElementById('pdf-upload-btn');
    const pdfFile = document.getElementById('pdf-file') as HTMLInputElement;
    const pdfFile2 = document.getElementById('pdf-file-2') as HTMLInputElement;

    if (pdfUploadBtn && pdfFile) {
        pdfUploadBtn.onclick = () => pdfFile.click();
    }

    if (pdfFile) {
        pdfFile.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) PDFLoader.loadPDF(file);
        };
    }

    if (pdfFile2) {
        pdfFile2.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) PDFLoader.loadPDF(file);
        };
    }

    // PDF Navigation
    const prevPageBtn = document.getElementById('pdf-prev-page');
    const nextPageBtn = document.getElementById('pdf-next-page');
    const pageNumInput = document.getElementById('page-num') as HTMLInputElement;

    if (prevPageBtn) {
        prevPageBtn.onclick = () => {
            const state = AppStateManager.getState();
            if (state.currentPage > 1) {
                PDFRenderer.renderPage(state.currentPage - 1, TextSelection);
            }
        };
    }

    if (nextPageBtn) {
        nextPageBtn.onclick = () => {
            const state = AppStateManager.getState();
            if (state.currentPage < state.totalPages) {
                PDFRenderer.renderPage(state.currentPage + 1, TextSelection);
            }
        };
    }

    if (pageNumInput) {
        pageNumInput.onchange = (e) => {
            const pageNum = parseInt((e.target as HTMLInputElement).value);
            const state = AppStateManager.getState();
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= state.totalPages) {
                PDFRenderer.renderPage(pageNum, TextSelection);
            } else {
                // Reset to current page if invalid
                (e.target as HTMLInputElement).value = state.currentPage.toString();
            }
        };
    }

    // Zoom Controls
    const zoomSelect = document.getElementById('zoom-level') as HTMLSelectElement;
    const fitWidthBtn = document.getElementById('fit-width');

    if (zoomSelect) {
        zoomSelect.onchange = (e) => {
            const scale = parseFloat((e.target as HTMLSelectElement).value);
            AppStateManager.setState({ scale });
            PDFRenderer.renderPage(AppStateManager.getState().currentPage, TextSelection);
        };
    }

    if (fitWidthBtn) {
        fitWidthBtn.onclick = async () => {
            const state = AppStateManager.getState();
            if (!state.pdfDoc) return;

            const container = document.getElementById('pdf-container');
            if (!container) return;

            const containerWidth = container.clientWidth - 40; // Account for padding
            try {
                const page = await state.pdfDoc.getPage(state.currentPage);
                const viewport = page.getViewport({ scale: 1.0 });
                const newScale = containerWidth / viewport.width;

                AppStateManager.setState({ scale: newScale });
                if (zoomSelect) {
                    zoomSelect.value = newScale.toFixed(2);
                }
                await PDFRenderer.renderPage(state.currentPage, TextSelection);
            } catch (error) {
                console.error('Fit Width Error:', error);
                StatusManager.show('Could not fit PDF to width', 'error');
            }
        };
    }

    // Drag and Drop for Upload Area
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.onclick = () => pdfFile2?.click();

        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.style.background = '#e3f2fd';
        };

        uploadArea.ondragleave = () => {
            uploadArea.style.background = '';
        };

        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.style.background = '';
            const file = e.dataTransfer?.files[0];
            if (file && file.type === 'application/pdf') {
                PDFLoader.loadPDF(file);
            } else {
                StatusManager.show('Please drop a valid PDF file', 'warning');
            }
        };
    }

    // Image Upload for Analysis
    const imageUploadInput = document.getElementById('image-upload-input') as HTMLInputElement;
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const preview = document.getElementById('image-preview') as HTMLImageElement;
                const analyzeBtn = document.getElementById('analyze-image-btn') as HTMLButtonElement;

                if (preview) {
                    preview.src = URL.createObjectURL(file);
                    preview.style.display = 'block';
                    preview.onload = () => URL.revokeObjectURL(preview.src);
                }

                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                }
            }
        });
    }

    // Memory Management
    MemoryManager.registerEventListener(window, 'beforeunload', () => {
        MemoryManager.cleanup();
    });

    // Register cleanup with MemoryManager (only if elements exist)
    if (pdfUploadBtn) MemoryManager.registerEventListener(pdfUploadBtn, 'click', pdfUploadBtn.onclick!);
    if (prevPageBtn) MemoryManager.registerEventListener(prevPageBtn, 'click', prevPageBtn.onclick!);
    if (nextPageBtn) MemoryManager.registerEventListener(nextPageBtn, 'click', nextPageBtn.onclick!);
    if (zoomSelect) MemoryManager.registerEventListener(zoomSelect, 'change', zoomSelect.onchange!);
    if (fitWidthBtn) MemoryManager.registerEventListener(fitWidthBtn, 'click', fitWidthBtn.onclick!);
}

// ==================== EXTRACTION HANDLERS ====================

/**
 * Extract all figures from current PDF
 */
async function extractFiguresFromPDF() {
    const state = AppStateManager.getState();

    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first', 'warning');
        return;
    }

    if (state.isProcessing) {
        StatusManager.show('Already processing...', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);
    StatusManager.show('Extracting figures from PDF...', 'info');

    try {
        const allFigures: any[] = [];
        const allDiagnostics: any[] = [];

        // Extract from all pages
        for (let pageNum = 1; pageNum <= state.pdfDoc.numPages; pageNum++) {
            const page = await state.pdfDoc.getPage(pageNum);
            const { figures, diagnostics } = await FigureExtractor.extractFiguresFromPage(page, pageNum);

            allFigures.push(...figures);
            allDiagnostics.push(diagnostics);

            console.log(`Page ${pageNum}: ${figures.length} figures (${diagnostics.processingTime}ms)`);
        }

        // Update state with extracted figures
        AppStateManager.setState({ extractedFigures: allFigures });

        StatusManager.show(
            `Successfully extracted ${allFigures.length} figures from ${state.pdfDoc.numPages} pages`,
            'success'
        );

        console.log('Figure extraction diagnostics:', allDiagnostics);
        console.log('Extracted figures:', allFigures);

    } catch (error: any) {
        console.error('Figure extraction error:', error);
        StatusManager.show(`Failed to extract figures: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        StatusManager.showLoading(false);
    }
}

/**
 * Extract all tables from current PDF
 */
async function extractTablesFromPDF() {
    const state = AppStateManager.getState();

    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first', 'warning');
        return;
    }

    if (state.isProcessing) {
        StatusManager.show('Already processing...', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);
    StatusManager.show('Extracting tables from PDF...', 'info');

    try {
        const allTables: any[] = [];

        // Extract from all pages
        for (let pageNum = 1; pageNum <= state.pdfDoc.numPages; pageNum++) {
            const page = await state.pdfDoc.getPage(pageNum);
            const tables = await TableExtractor.extractTablesFromPage(page, pageNum);

            allTables.push(...tables);

            console.log(`Page ${pageNum}: ${tables.length} tables`);
        }

        // Update state with extracted tables
        AppStateManager.setState({ extractedTables: allTables });

        // Render table regions if visualization is enabled
        if (PDFRenderer.showTableRegions && state.currentPage) {
            const pageTables = allTables.filter(t => t.pageNum === state.currentPage);
            PDFRenderer.renderTableRegions(pageTables, state.scale);
        }

        StatusManager.show(
            `Successfully extracted ${allTables.length} tables from ${state.pdfDoc.numPages} pages`,
            'success'
        );

        console.log('Extracted tables:', allTables);

    } catch (error: any) {
        console.error('Table extraction error:', error);
        StatusManager.show(`Failed to extract tables: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        StatusManager.showLoading(false);
    }
}

/**
 * Toggle bounding box visualization and re-render
 */
async function toggleBoundingBoxes() {
    PDFRenderer.toggleBoundingBoxes();
    const state = AppStateManager.getState();
    if (state.currentPage) {
        await PDFRenderer.renderPage(state.currentPage, TextSelection);
    }
}

/**
 * Toggle table region visualization and re-render
 */
async function toggleTableRegions() {
    PDFRenderer.toggleTableRegions();
    const state = AppStateManager.getState();

    // Extract tables if not already done
    if (!state.extractedTables || state.extractedTables.length === 0) {
        await extractTablesFromPDF();
    }

    if (state.currentPage) {
        await PDFRenderer.renderPage(state.currentPage, TextSelection);
    }
}

/**
 * FULL MULTI-AGENT PIPELINE
 * Extract → Classify → Route → Enhance → Validate
 */
async function runFullAIPipeline() {
    const state = AppStateManager.getState();

    if (!state.pdfDoc) {
        StatusManager.show('Please load a PDF first', 'warning');
        return;
    }

    if (state.isProcessing) {
        StatusManager.show('Already processing...', 'warning');
        return;
    }

    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);
    StatusManager.show('🚀 Starting Multi-Agent Pipeline...', 'info');

    try {
        // Step 1: Extract figures and tables geometrically
        console.log('📊 Step 1: Geometric Extraction...');
        const figures = state.extractedFigures || await extractAndReturnFigures();
        const tables = state.extractedTables || await extractAndReturnTables();

        StatusManager.show(`Extracted ${figures.length} figures and ${tables.length} tables. Routing to AI agents...`, 'info');

        // Step 2: Route to specialized medical agents
        console.log('🤖 Step 2: Multi-Agent Analysis...');
        const { enhancedFigures, enhancedTables, pipelineStats } =
            await AgentOrchestrator.processExtractedData(figures, tables);

        // Step 3: Update state with enhanced data
        AppStateManager.setState({
            extractedFigures: enhancedFigures,
            extractedTables: enhancedTables
        });

        // Step 4: Display results
        displayPipelineResults(enhancedTables, enhancedFigures, pipelineStats);

        StatusManager.show(
            `✅ Pipeline Complete! Processed ${pipelineStats.tablesProcessed} tables + ${pipelineStats.figuresProcessed} figures with ${pipelineStats.agentsInvoked} agent calls (Avg confidence: ${(pipelineStats.averageConfidence * 100).toFixed(1)}%)`,
            'success'
        );

        console.log('🎉 Multi-Agent Pipeline Results:', {
            enhancedTables,
            enhancedFigures,
            pipelineStats
        });

    } catch (error: any) {
        console.error('Pipeline error:', error);
        StatusManager.show(`Pipeline failed: ${error.message}`, 'error');
    } finally {
        AppStateManager.setState({ isProcessing: false });
        StatusManager.showLoading(false);
    }
}

/**
 * Helper: Extract figures and return them
 */
async function extractAndReturnFigures() {
    const state = AppStateManager.getState();
    const allFigures: any[] = [];

    for (let pageNum = 1; pageNum <= state.pdfDoc.numPages; pageNum++) {
        const page = await state.pdfDoc.getPage(pageNum);
        const { figures } = await FigureExtractor.extractFiguresFromPage(page, pageNum);
        allFigures.push(...figures);
    }

    AppStateManager.setState({ extractedFigures: allFigures });
    return allFigures;
}

/**
 * Helper: Extract tables and return them
 */
async function extractAndReturnTables() {
    const state = AppStateManager.getState();
    const allTables: any[] = [];

    for (let pageNum = 1; pageNum <= state.pdfDoc.numPages; pageNum++) {
        const page = await state.pdfDoc.getPage(pageNum);
        const tables = await TableExtractor.extractTablesFromPage(page, pageNum);
        allTables.push(...tables);
    }

    AppStateManager.setState({ extractedTables: allTables });
    return allTables;
}

/**
 * Display pipeline results in UI
 */
function displayPipelineResults(enhancedTables: any[], enhancedFigures: any[], stats: any) {
    console.log('\n=== 🎯 MULTI-AGENT PIPELINE RESULTS ===\n');

    // Display enhanced tables
    enhancedTables.forEach((table, idx) => {
        console.log(`\n📊 Table ${idx + 1} (${table.id}):`);
        console.log(`  Data Type: ${table.aiEnhancement?.clinicalDataType || 'unknown'}`);
        console.log(`  Overall Confidence: ${(table.aiEnhancement?.overallConfidence * 100).toFixed(1)}%`);
        console.log(`  Agents Called: ${table.aiEnhancement?.agentResults.length || 0}`);

        table.aiEnhancement?.agentResults.forEach((result: any) => {
            console.log(`    - ${result.agentName}: ${(result.confidence * 100).toFixed(1)}% (${result.validationStatus})`);
        });

        if (table.aiEnhancement?.consensusData) {
            console.log(`  Consensus: ${table.aiEnhancement.consensusData.primaryAgent}`);
        }
    });

    // Display enhanced figures
    enhancedFigures.forEach((figure, idx) => {
        console.log(`\n🖼️ Figure ${idx + 1} (${figure.id}):`);
        console.log(`  Type: ${figure.aiAnalysis?.figureType || 'unknown'}`);
        console.log(`  Confidence: ${(figure.aiAnalysis?.overallConfidence * 100).toFixed(1)}%`);
        console.log(`  Insights: ${figure.aiAnalysis?.clinicalInsights.length || 0}`);
    });

    console.log('\n=== 📈 PIPELINE STATISTICS ===');
    console.log(`Total Processing Time: ${stats.totalProcessingTime}ms`);
    console.log(`Agents Invoked: ${stats.agentsInvoked}`);
    console.log(`Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
    console.log('\n=====================================\n');
}

// ==================== WINDOW API EXPOSURE ====================

/**
 * Expose all functions to the window object for HTML onclick handlers
 */
function exposeWindowAPI() {
    window.ClinicalExtractor = {
        // Helper Functions (6)
        calculateBoundingBox,
        addExtractionMarker,
        addExtractionMarkersForPage,
        autoAdvanceField,
        clearSearchMarkers,
        blobToBase64,

        // Field Management Functions (9)
        addIndication,
        addIntervention,
        addArm,
        addMortality,
        addMRS,
        addComplication,
        addPredictor,
        removeElement,
        updateArmSelectors,

        // AI Functions (7)
        generatePICO,
        generateSummary,
        validateFieldWithAI,
        findMetadata,
        handleExtractTables,
        handleImageAnalysis,
        handleDeepAnalysis,

        // Export Functions (5)
        exportJSON,
        exportCSV,
        exportExcel,
        exportAudit,
        exportAnnotatedPDF,

        // Search Functions (2)
        toggleSearchInterface,
        searchInPDF,

        // New: Figure/Table Extraction & Visualization (4)
        extractFiguresFromPDF,
        extractTablesFromPDF,
        toggleBoundingBoxes,
        toggleTableRegions,

        // New: Multi-Agent Pipeline (1)
        runFullAIPipeline,

        triggerCrashStateSave,
        triggerManualRecovery
    };

    // Also expose individual functions for backward compatibility with HTML onclick handlers
    Object.assign(window, window.ClinicalExtractor);

    console.log('Clinical Extractor API exposed to window');
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('Initializing Clinical Extractor...');

        initializeErrorBoundary();
        console.log('✓ Error Boundary initialized');

        // 1. Set up module dependencies
        setupDependencies();
        console.log('✓ Dependencies configured');

        // 2. Initialize core modules
        ExtractionTracker.init();
        console.log('✓ Extraction Tracker initialized');

        FormManager.initialize();
        console.log('✓ Form Manager initialized');

        // 3. Configure PDF.js
        configurePDFJS();
        console.log('✓ PDF.js configured');

        // 4. Set up event listeners
        setupEventListeners();
        console.log('✓ Event listeners configured');

        // 5. Expose window API
        exposeWindowAPI();
        console.log('✓ Window API exposed');

        await checkAndOfferRecovery();
        console.log('✓ Crash recovery check complete');

        // 7. Show initial status
        StatusManager.show('Clinical Extractor Ready. Load a PDF to begin.', 'info');
        console.log('✓ Clinical Extractor initialization complete');

    } catch (error) {
        console.error('Failed to initialize Clinical Extractor:', error);
        StatusManager.show('Failed to initialize application. Check console for details.', 'error');
    }
}

// ==================== ENTRY POINT ====================

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

// Export for debugging
export { AppStateManager, ExtractionTracker, FormManager, StatusManager };
