/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core type definitions for the Clinical Extractor application.
 * Contains all interfaces, types, and type definitions used throughout the application.
 *
 * 🏆 Including Phase 3 Citation Provenance System for Nobel-worthy research!
 */

// Import citation provenance types
import type { TextChunk, CitationMap } from '../services/CitationService';

// ==================== EXTRACTION TYPES ====================

/**
 * Coordinates defining a bounding box for extracted text on a PDF page.
 */
export interface Coordinates {
  /** Left/X position in PDF coordinates */
  left?: number;
  x?: number;
  /** Top/Y position in PDF coordinates */
  top?: number;
  y?: number;
  /** Width of the bounding box */
  width: number;
  /** Height of the bounding box */
  height: number;
}

/**
 * Method used for data extraction.
 * - 'manual': User-selected text from PDF
 * - 'gemini-pico': AI-generated PICO analysis
 * - 'gemini-summary': AI-generated summary
 * - 'gemini-metadata': AI-extracted metadata
 * - 'gemini-table': AI-extracted table data
 * - 'gemini-deep': Deep AI analysis
 */
export type ExtractionMethod =
  | 'manual'
  | 'gemini-pico'
  | 'gemini-summary'
  | 'gemini-metadata'
  | 'gemini-table'
  | 'gemini-deep';

/**
 * Represents a single data extraction from the PDF or AI analysis.
 */
export interface Extraction {
  /** Unique identifier for the extraction */
  id: string;
  /** Timestamp when extraction was created */
  timestamp: string;
  /** Name of the form field this extraction populates */
  fieldName: string;
  /** Extracted text content */
  text: string;
  /** PDF page number (0 for AI-generated extractions) */
  page: number;
  /** Bounding box coordinates on the PDF page */
  coordinates: Coordinates;
  /** Method used to extract the data */
  method: ExtractionMethod;
  /** Name of the source document */
  documentName: string;
}

// ==================== APP STATE TYPES ====================

/**
 * Text item from PDF.js text layer with DOM element reference.
 */
export interface TextItem {
  /** Text content */
  str?: string;
  text?: string;
  /** DOM element containing the text */
  element?: HTMLElement;
  /** Transform matrix [scaleX, 0, 0, scaleY, x, y] */
  transform?: number[];
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
}

/**
 * Search marker for highlighting search results in PDF.
 */
export interface SearchMarker {
  /** DOM element of the marker */
  element: HTMLElement;
  /** Page number where marker appears */
  page: number;
}

/**
 * Global application state managed by AppStateManager.
 */
export interface AppState {
  /** PDF.js document object (null if no PDF loaded) */
  pdfDoc: any | null;
  /** Current page number being displayed */
  currentPage: number;
  /** Total number of pages in the PDF */
  totalPages: number;
  /** Current zoom scale (1.0 = 100%) */
  scale: number;
  /** Currently active form field name (null if none selected) */
  activeField: string | null;
  /** DOM element of the active field (null if none selected) */
  activeFieldElement: HTMLElement | null;
  /** Name of the loaded document */
  documentName: string;
  /** Array of all extractions made */
  extractions: Extraction[];
  /** Current step in the extraction wizard (0-based) */
  currentStep: number;
  /** Total number of steps in the wizard */
  totalSteps: number;
  /** Cached markdown content for AI processing */
  markdownContent: string;
  /** Whether markdown content has been loaded */
  markdownLoaded: boolean;
  /** Cache of extracted text per page (page number -> text) */
  pdfTextCache: Map<number, string>;
  /** Active search result markers on the PDF */
  searchMarkers: SearchMarker[];
  /** Maximum size of the text cache */
  maxCacheSize: number;
  /** Whether a processing operation is in progress */
  isProcessing: boolean;
  /** ID of the last Google Sheets submission (null if none) */
  lastSubmissionId: string | null;

  // ==================== PHASE 3: CITATION PROVENANCE SYSTEM 🏆 ====================
  /**
   * All sentence chunks with coordinates for citation tracking
   * Each chunk has a global index [0], [1], [2]... for AI citation
   * Nobel-worthy reproducible research provenance!
   */
  textChunks: TextChunk[];
  /**
   * Citation map for fast lookup: index → {sentence, page, coordinates}
   * Enables clickable citations that jump to exact source location
   */
  citationMap: CitationMap;
  /**
   * Currently highlighted citation index (null if none active)
   * Used for visual highlighting and scrolling
   */
  activeCitationIndex: number | null;

  // ==================== NEW: FIGURE & TABLE EXTRACTION 🖼️📊 ====================
  /**
   * Extracted figures from PDF using operator interception
   * Each figure includes data URL, dimensions, and extraction metadata
   */
  extractedFigures?: any[];
  /**
   * Extracted tables from PDF using geometric detection
   * Each table includes headers, rows, column positions, and bounding box
   */
  extractedTables?: any[];
}

// Re-export citation types for convenience
export type { TextChunk, Citation, CitationMap, BoundingBox, AIResponse } from '../services/CitationService';

// ==================== VALIDATION TYPES ====================

/**
 * Validation types for form inputs.
 */
export type ValidationType = 'doi' | 'pmid' | 'year' | 'number' | 'text';

/**
 * Result of input validation.
 */
export interface ValidationResult {
  /** Whether the input is valid */
  valid: boolean;
  /** Error message if validation failed (optional) */
  message?: string;
}

// ==================== STATUS TYPES ====================

/**
 * Status message types for user notifications.
 */
export type StatusType = 'success' | 'warning' | 'error' | 'info';

// ==================== MANAGER TYPES ====================

/**
 * Event listener registration for memory management.
 */
export interface EventListenerRegistration {
  /** DOM element with the listener */
  el: HTMLElement | Document | Window;
  /** Event type (e.g., 'click', 'keydown') */
  type: string;
  /** Event handler function */
  handler: EventListener;
}

// ==================== DYNAMIC FIELD TYPES ====================

/**
 * Types of dynamic fields that can be added to the form.
 */
export type DynamicFieldType =
  | 'indication'
  | 'intervention'
  | 'arm'
  | 'mortality'
  | 'mrs'
  | 'complication'
  | 'predictor';

/**
 * Surgical intervention types.
 */
export type SurgicalType = 'SDC_EVD' | 'SDC_ALONE' | 'EVD_ALONE' | '';

// ==================== WINDOW EXTENSIONS ====================

/**
 * Extended window interface with global functions and objects.
 * These are exposed globally for use in inline event handlers and external scripts.
 */
declare global {
  interface Window {
    /** Callback when Google API client loads */
    gapiLoaded: () => void;
    /** Callback when Google Identity Services loads */
    gisLoaded: () => void;
    /** PDF.js library object */
    pdfjsLib: any;
    /** Google API object */
    google: any;
    /** Google API client */
    gapi: any;
    /** Memory manager for cleanup */
    MemoryManager: any;
    /** Calculate bounding box from text items */
    calculateBoundingBox: (items: TextItem[]) => Coordinates;
    /** Add visual marker for an extraction */
    addExtractionMarker: (extraction: Extraction) => void;
    /** Add all extraction markers for a page */
    addExtractionMarkersForPage: (pageNum: number) => void;
    /** Automatically advance to next field */
    autoAdvanceField: () => void;
    /** Clear all search markers from PDF */
    clearSearchMarkers: () => void;
    /** Add indication field */
    addIndication: () => void;
    /** Add intervention field */
    addIntervention: () => void;
    /** Add study arm field */
    addArm: () => void;
    /** Add mortality outcome field */
    addMortality: () => void;
    /** Add mRS outcome field */
    addMRS: () => void;
    /** Add complication field */
    addComplication: () => void;
    /** Add predictor field */
    addPredictor: () => void;
    /** Remove dynamic field element */
    removeElement: (btn: HTMLElement) => void;
    /** Update arm selector dropdowns */
    updateArmSelectors: () => void;
    /** Export data as JSON */
    exportJSON: () => void;
    /** Export data as CSV */
    exportCSV: () => void;
    /** Export audit log */
    exportAudit: () => void;
    /** Export annotated PDF */
    exportAnnotatedPDF: () => void;
    /** Toggle search interface visibility */
    toggleSearchInterface: () => void;
    /** Search for text in PDF */
    searchInPDF: () => Promise<void>;
    /** Generate PICO analysis with AI */
    generatePICO: () => Promise<void>;
    /** Generate summary with AI */
    generateSummary: () => Promise<void>;
    /** Validate field with AI */
    validateFieldWithAI: (fieldId: string) => Promise<void>;
    /** Find metadata with AI */
    findMetadata: () => Promise<void>;
    /** Extract tables with AI */
    handleExtractTables: () => Promise<void>;
    /** Analyze images with AI */
    handleImageAnalysis: () => Promise<void>;
    /** Perform deep analysis with AI */
    handleDeepAnalysis: () => Promise<void>;
    /** Submit data to Google Sheets */
    handleSubmitToGoogleSheets: (e: Event) => Promise<void>;

    // New: Figure/Table Extraction & Visualization
    /** Extract figures from PDF using operator interception */
    extractFiguresFromPDF: () => Promise<void>;
    /** Extract tables from PDF using geometric detection */
    extractTablesFromPDF: () => Promise<void>;
    /** Toggle bounding box provenance visualization */
    toggleBoundingBoxes: () => Promise<void>;
    /** Toggle table region visualization */
    toggleTableRegions: () => Promise<void>;

    // New: Multi-Agent Pipeline
    /** Run full multi-agent AI pipeline */
    runFullAIPipeline: () => Promise<void>;
  }
}

export {};
