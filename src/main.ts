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
import AuthManager from './services/AuthManager';
import SearchService from './services/SearchService';
import SemanticSearchService from './services/SemanticSearchService';
import AnnotationService from './services/AnnotationService';
import BackendProxyService from './services/BackendProxyService';
import SamplePDFService from './services/SamplePDFService';
import LRUCache from './utils/LRUCache';
import CircuitBreaker from './utils/CircuitBreaker';
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
import ProvenanceExporter from './services/ProvenanceExporter';
import TextHighlighter from './services/TextHighlighter';

// Utilities
import {
    calculateBoundingBox,
    normalizeCoordinates,
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
 * Search for text in the PDF document using SearchService
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

    try {
        const results = await SearchService.search(query);
        
        // Display results
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<li>No results found</li>';
            } else {
                resultsContainer.innerHTML = results.map((result, idx) => {
                    const clickable = typeof result.chunkIndex === 'number';
                    return `
                        <li class="search-result" style="${clickable ? 'cursor:pointer;' : ''}" ${clickable ? `onclick="window.ClinicalExtractor.showSearchResult(${result.chunkIndex})"` : ''}>
                            <strong>Page ${result.page}</strong> (Result ${idx + 1}/${results.length})<br>
                            <em>${result.context}</em>
                        </li>
                    `;
                }).join('');
                
                SearchService.highlightResultsForPage(state.currentPage);
            }
        }

        StatusManager.show(`Found ${results.length} result(s)`, 'success');
    } catch (error) {
        console.error('Search error:', error);
        StatusManager.show('Search failed', 'error');
    }
}

// ==================== EVENT LISTENERS ====================

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // PDF Upload - Unified to single input
    const pdfUploadBtn = document.getElementById('pdf-upload-btn');
    const pdfFile = document.getElementById('pdf-file') as HTMLInputElement;

    if (pdfUploadBtn && pdfFile) {
        pdfUploadBtn.addEventListener('click', () => {
            pdfFile.value = '';
            pdfFile.click();
        });
    }

    if (pdfFile) {
        pdfFile.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                console.log('📄 PDF file selected:', file.name);
                await PDFLoader.loadPDF(file);
                (e.target as HTMLInputElement).value = '';
            }
        });
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
    if (uploadArea && pdfFile) {
        uploadArea.addEventListener('click', () => pdfFile.click());

        uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pdfFile.click();
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.background = '#e3f2fd';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.background = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.background = '';
            const file = e.dataTransfer?.files[0];
            if (file && file.type === 'application/pdf') {
                PDFLoader.loadPDF(file);
            } else {
                StatusManager.show('Please drop a valid PDF file', 'warning');
            }
        });
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

    // Export Buttons - Explicit bindings for reliability
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportAuditBtn = document.getElementById('export-audit-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportProvenanceBtn = document.getElementById('export-provenance-btn');

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            if (window.ClinicalExtractor?.exportExcel) {
                window.ClinicalExtractor.exportExcel();
            }
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (window.ClinicalExtractor?.exportJSON) {
                window.ClinicalExtractor.exportJSON();
            }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (window.ClinicalExtractor?.exportCSV) {
                window.ClinicalExtractor.exportCSV();
            }
        });
    }

    if (exportAuditBtn) {
        exportAuditBtn.addEventListener('click', () => {
            if (window.ClinicalExtractor?.exportAudit) {
                window.ClinicalExtractor.exportAudit();
            }
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (window.ClinicalExtractor?.exportAnnotatedPDF) {
                window.ClinicalExtractor.exportAnnotatedPDF();
            }
        });
    }

    if (exportProvenanceBtn) {
        exportProvenanceBtn.addEventListener('click', () => {
            if (window.ClinicalExtractor?.downloadProvenanceJSON) {
                window.ClinicalExtractor.downloadProvenanceJSON();
            }
        });
    }

    // Memory Management
    MemoryManager.registerEventListener(window, 'beforeunload', () => {
        MemoryManager.cleanup();
    });
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
        updateFigureResults(allFigures);

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

function updateFigureResults(figures: any[]): void {
    const container = document.getElementById('figure-extraction-results');
    if (!container) return;

    container.innerHTML = '';

    if (!figures || figures.length === 0) {
        container.innerHTML = '<p style="color:#666;">No figures detected in this document.</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
    grid.style.gap = '8px';

    figures.forEach((figure: any, index: number) => {
        const card = document.createElement('div');
        card.style.border = '1px solid #ececec';
        card.style.borderRadius = '4px';
        card.style.padding = '6px';
        card.style.background = '#fff';
        card.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';

        const thumb = document.createElement('img');
        thumb.src = figure.dataUrl;
        thumb.alt = figure.id || `figure-${index + 1}`;
        thumb.style.width = '100%';
        thumb.style.height = 'auto';
        thumb.style.display = 'block';
        thumb.style.borderRadius = '4px';
        thumb.loading = 'lazy';

        const caption = document.createElement('div');
        caption.style.fontSize = '12px';
        caption.style.marginTop = '4px';
        caption.textContent = `${figure.id || `Figure ${index + 1}`} • Page ${figure.pageNum}`;

        card.appendChild(thumb);
        card.appendChild(caption);
        grid.appendChild(card);
    });

    container.appendChild(grid);
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
        updateFigureResults(enhancedFigures);

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
 * Toggle semantic search panel
 */
function toggleSemanticSearch() {
    const panel = document.getElementById('semantic-search-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Perform semantic search
 */
async function performSemanticSearch() {
    const input = document.getElementById('semantic-search-input') as HTMLInputElement;
    const resultsDiv = document.getElementById('semantic-search-results');
    
    if (!input || !resultsDiv) return;
    
    const query = input.value.trim();
    if (!query) {
        StatusManager.show('Please enter a search query', 'warning');
        return;
    }
    
    try {
        StatusManager.showLoading(true);
        const results = await SemanticSearchService.search(query);
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<p style="color: #666; font-style: italic;">No results found</p>';
        } else {
            resultsDiv.innerHTML = results.map((result, idx) => `
                <div style="padding: 8px; margin: 4px 0; background: white; border-left: 3px solid #0288d1; border-radius: 4px; cursor: pointer;" onclick="window.ClinicalExtractor.showSemanticResult(${result.chunkIndex})">
                    <div style="font-size: 12px; color: #666;">Result ${idx + 1} • Page ${result.pageNum} • Score: ${result.score.toFixed(2)}</div>
                    <div style="margin-top: 4px;">${result.text.substring(0, 150)}${result.text.length > 150 ? '...' : ''}</div>
                </div>
            `).join('');
        }
        
        StatusManager.show(`Found ${results.length} results`, 'success');
    } catch (error) {
        console.error('Semantic search error:', error);
        StatusManager.show('Search failed. Check console for details.', 'error');
    } finally {
        StatusManager.showLoading(false);
    }
}

/**
 * Jump to specific page
 */
async function jumpToPage(pageNum: number) {
    const state = AppStateManager.getState();
    if (!state.pdfDoc) {
        StatusManager.show('No PDF loaded', 'warning');
        return;
    }
    
    await PDFRenderer.renderPage(pageNum, TextSelection);
}

/**
 * Ensure the chunk for a given index is visible, rendering the correct page if necessary
 */
async function ensureChunkVisible(chunkIndex: number) {
    const state = AppStateManager.getState();
    const chunk = (state.textChunks || []).find(c => c.index === chunkIndex);
    if (!chunk) {
        StatusManager.show('Unable to locate that section of the document.', 'warning');
        return null;
    }

    if (chunk.pageNum !== state.currentPage) {
        await PDFRenderer.renderPage(chunk.pageNum, TextSelection);
    }

    return chunk;
}

async function showSearchResult(chunkIndex: number) {
    if (typeof chunkIndex !== 'number' || chunkIndex < 0) return;
    const chunk = await ensureChunkVisible(chunkIndex);
    if (!chunk) return;

    TextHighlighter.highlightChunks([chunkIndex], { flash: true });
}

async function showSemanticResult(chunkIndex: number) {
    if (typeof chunkIndex !== 'number' || chunkIndex < 0) return;
    const chunk = await ensureChunkVisible(chunkIndex);
    if (!chunk) return;

    TextHighlighter.highlightChunks([chunkIndex], { flash: true });
}

async function highlightCitation(index: number) {
    if (typeof index !== 'number' || index < 0) return;
    const chunk = await ensureChunkVisible(index);
    if (!chunk) return;

    TextHighlighter.highlightCitation(index);
    AppStateManager.setState({ activeCitationIndex: index });
}

/**
 * Toggle annotation tools panel
 */
function toggleAnnotationTools() {
    const panel = document.getElementById('annotation-tools-panel');
    if (panel) {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        
        const state = AppStateManager.getState();
        const pageElement = document.querySelector('.pdf-page') as HTMLElement | null;

        if (!isVisible && pageElement && state.currentPage) {
            AnnotationService.enableInteraction(pageElement, state.currentPage);
            AnnotationService.renderAnnotations(state.currentPage);
            StatusManager.show('Annotation tools enabled. Click and drag on the PDF to annotate.', 'info');
        } else if (isVisible) {
            AnnotationService.disableInteraction();
            StatusManager.show('Annotation tools hidden.', 'info');
        }
    }
}

/**
 * Set annotation tool
 */
function setAnnotationTool(tool: string) {
    const colorSelect = document.getElementById('annotation-color') as HTMLSelectElement;
    const color = colorSelect ? colorSelect.value : 'yellow';
    
    AnnotationService.setTool(tool as any);
    AnnotationService.setColor(color as any);
    
    if (AnnotationService.interactionLayer) {
        AnnotationService.interactionLayer.style.cursor = tool === 'note' ? 'pointer' : 'crosshair';
    }
    
    StatusManager.show(`Annotation tool: ${tool} (${color})`, 'info');
}

/**
 * Configure backend proxy
 */
function configureBackendProxy() {
    const baseURL = prompt('Enter backend API base URL:', 'https://api.example.com');
    if (!baseURL) return;
    
    const timeout = parseInt(prompt('Enter timeout (ms):', '5000') || '5000');
    const retryAttempts = parseInt(prompt('Enter retry attempts:', '3') || '3');
    
    BackendProxyService.configure({
        baseURL,
        timeout,
        retryAttempts,
        retryDelay: 1000,
        cacheEnabled: true,
        cacheTTL: 60000,
        rateLimitPerSecond: 10
    });
    
    StatusManager.show(`Backend proxy configured: ${baseURL}`, 'success');
}

/**
 * Expose all functions to the window object for HTML onclick handlers
 */
function exposeWindowAPI() {
    window.ClinicalExtractor = {
        // Helper Functions (7)
        calculateBoundingBox,
        normalizeCoordinates,
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
        
        exportWithFullProvenance: ProvenanceExporter.exportWithFullProvenance,
        downloadProvenanceJSON: ProvenanceExporter.downloadProvenanceJSON,

        // Search Functions (2)
        toggleSearchInterface,
        searchInPDF,
        showSearchResult,
        showSemanticResult,

        // New: Figure/Table Extraction & Visualization (4)
        extractFiguresFromPDF,
        extractTablesFromPDF,
        toggleBoundingBoxes,
        toggleTableRegions,

        // New: Multi-Agent Pipeline (1)
        runFullAIPipeline,

        SemanticSearchService,
        AnnotationService,
        BackendProxyService,
        SamplePDFService,
        TextHighlighter,

        toggleSemanticSearch,
        performSemanticSearch,
        jumpToPage,
        toggleAnnotationTools,
        setAnnotationTool,
        configureBackendProxy,
        highlightCitation,

        triggerCrashStateSave,
        triggerManualRecovery
    };

    // Also expose individual functions for backward compatibility with HTML onclick handlers
    Object.assign(window, window.ClinicalExtractor);

    console.log('Clinical Extractor API exposed to window');
}

// ==================== CLEANUP REGISTRATION ====================

/**
 * Register cleanup functions for all modules that need cleanup
 * This creates a central cleanup registry without circular dependencies
 */
function registerCleanupCallbacks() {
    // Register PDFRenderer cleanup
    MemoryManager.registerCleanup('PDFRenderer', () => {
        PDFRenderer.cleanup();
    });

    // Register AnnotationService cleanup
    MemoryManager.registerCleanup('AnnotationService', () => {
        AnnotationService.cleanup();
    });

    console.log('Cleanup callbacks registered');
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

        // Configure TextHighlighter with PDF container
        TextHighlighter.configure({ container: '.pdf-page' });
        console.log('✓ Text Highlighter configured');

        // Initialize backend authentication
        await AuthManager.initialize();
        console.log('✓ Backend authentication initialized');

        // 3. Configure PDF.js
        configurePDFJS();
        console.log('✓ PDF.js configured');

        // 4. Register cleanup callbacks
        registerCleanupCallbacks();
        console.log('✓ Cleanup callbacks registered');

        // 5. Set up event listeners
        setupEventListeners();
        console.log('✓ Event listeners configured');

        // 6. Expose window API
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
