/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ProvenanceExporter - Export extraction data with full coordinate provenance
 * 
 * Provides comprehensive export functionality that includes:
 * - Document metadata
 * - Text chunks with coordinates
 * - Tables with bounding boxes
 * - Figures with bounding boxes
 * - Citations with bounding boxes
 * - Coordinate provenance metadata
 */

import AppStateManager from '../state/AppStateManager';
import ExtractionTracker from '../data/ExtractionTracker';
import type { TextChunk } from './CitationService';
import type { ExtractedFigure } from './FigureExtractor';
import type { ExtractedTable } from './TableExtractor';
import type { EnhancedFigure, EnhancedTable } from './AgentOrchestrator';


export interface ProvenanceExport {
    document: {
        filename: string;
        totalPages: number;
        extractionDate: string;
    };
    textChunks: Array<{
        index: number;
        text: string;
        pageNum: number;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        fontName?: string;
        fontSize?: number;
        isHeading?: boolean;
        confidence: number;
    }>;
    tables: Array<{
        id: string;
        pageNum: number;
        title?: string;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        headers: string[];
        rows: string[][];
        extractionMethod: string;
        csvExport?: string;
    }>;
    figures: Array<{
        id: string;
        pageNum: number;
        caption?: string;
        bbox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        width: number;
        height: number;
        extractionMethod: string;
        dataUrl?: string;
    }>;
    extractions: Array<{
        id: string;
        fieldName: string;
        text: string;
        pageNum: number;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        method: string;
        timestamp: string;
        confidence?: number;
    }>;
    citations: Array<{
        index: number;
        sentence: string;
        pageNum: number;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        confidence?: number;
    }>;
    coordinateProvenance: {
        method: string;
        preservesBoundingBoxes: boolean;
        scaleFactors: {
            x: number;
            y: number;
        };
        extractionDate: string;
    };
}

export const ProvenanceExporter = {
    /**
     * Export all data with full coordinate provenance
     */
    exportWithFullProvenance: (): ProvenanceExport => {
        const state = AppStateManager.getState();
        const extractions = ExtractionTracker.getExtractions();
        
        // Generate timestamp once for consistency across all fields
        const exportTimestamp = new Date().toISOString();
        
        const textChunks = state.textChunks || [];
        
        const tables = state.extractedTables || [];
        const figures = state.extractedFigures || [];
        const citationEntries = state.citationMap ? Object.values(state.citationMap) : [];
        
        const exportData: ProvenanceExport = {
            document: {
                filename: state.documentName || 'unknown',
                totalPages: state.totalPages || 0,
                extractionDate: exportTimestamp,
            },
            textChunks: textChunks.map((chunk: TextChunk) => ({
                index: chunk.index,
                text: chunk.text,
                pageNum: chunk.pageNum,
                bbox: chunk.bbox,
                fontName: chunk.fontName,
                fontSize: chunk.fontSize,
                isHeading: chunk.isHeading,
                confidence: 1.0,
            })),
            tables: tables.map((table: ExtractedTable) => ({
                id: table.id,
                pageNum: table.pageNum,
                title: (table as any).title || '',
                bbox: table.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
                headers: table.headers || [],
                rows: table.rows || [],
                extractionMethod: table.extractionMethod || 'geometric_detection',
                csvExport: generateCSV(table),
            })),
            figures: figures.map((fig: ExtractedFigure) => ({
                id: fig.id,
                pageNum: fig.pageNum,
                caption: (fig as any).caption || '',
                bbox: (fig as any).boundingBox || { x: 0, y: 0, width: fig.width, height: fig.height },
                width: fig.width,
                height: fig.height,
                extractionMethod: fig.extractionMethod || 'operator_list_interception',
                dataUrl: fig.dataUrl,
            })),
            extractions: extractions.map(ext => ({
                id: ext.id,
                fieldName: ext.fieldName,
                text: ext.text,
                pageNum: ext.page,
                bbox: {
                    x: ext.coordinates.x ?? 0,
                    y: ext.coordinates.y ?? 0,
                    width: ext.coordinates.width ?? 0,
                    height: ext.coordinates.height ?? 0,
                },
                method: ext.method,
                timestamp: ext.timestamp,
                confidence: 1.0,
            })),
            citations: citationEntries.map((citation: any) => ({
                index: citation.index,
                sentence: citation.sentence,
                pageNum: citation.pageNum,
                bbox: citation.bbox,
                confidence: citation.confidence,
            })),
            coordinateProvenance: {
                method: 'pdfjs_direct_extraction',
                preservesBoundingBoxes: true,
                scaleFactors: {
                    x: state.scale || 1.0,
                    y: state.scale || 1.0,
                },
                extractionDate: exportTimestamp,
            },
        };
        
        return exportData;
    },
    
    /**
     * Download provenance export as JSON file
     */
    downloadProvenanceJSON: (): void => {
        const data = ProvenanceExporter.exportWithFullProvenance();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.document.filename}_full_provenance_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('✅ Provenance export downloaded:', a.download);
    },
};

/**
 * Table structure for CSV generation
 */
interface TableData {
    headers?: string[];
    rows?: string[][];
}

/**
 * Helper function to generate CSV from table data
 */
function generateCSV(table: TableData): string {
    const escapeCSV = (cell: string | null | undefined): string => {
        if (cell == null) return '';
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    let csv = '';
    
    // Headers
    if (table.headers && table.headers.length > 0) {
        csv += table.headers.map(escapeCSV).join(',') + '\n';
    }
    
    // Rows
    if (table.rows && table.rows.length > 0) {
        table.rows.forEach((row: string[]) => {
            csv += row.map(escapeCSV).join(',') + '\n';
        });
    }
    
    return csv;
}

export default ProvenanceExporter;
