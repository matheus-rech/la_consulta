/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PDF Loading Module
 *
 * Handles PDF document loading using PDF.js library.
 * Provides centralized PDF loading functionality with:
 * - File to ArrayBuffer conversion
 * - PDF.js document loading with configuration
 * - State management integration
 * - DOM updates for UI elements
 * - Error handling and status updates
 *
 * @module PDFLoader
 */

import AppStateManager from '../state/AppStateManager';
import StatusManager from '../utils/status';
import SecurityUtils from '../utils/security';
import { PDFConfig } from '../config';
import PDFRenderer from './PDFRenderer';
import TextSelection from './TextSelection';

/**
 * PDF.js library types
 *
 * @remarks
 * PDF.js is loaded globally via CDN and attached to window.pdfjsLib.
 * Window interface is now in types/window.d.ts
 */

/**
 * PDF document loading task options
 */
interface PDFDocumentLoadingTask {
  /** PDF data as ArrayBuffer or Uint8Array */
  data: ArrayBuffer | Uint8Array;
  /** URL to character map files */
  cMapUrl?: string;
  /** Whether character maps are packed */
  cMapPacked?: boolean;
  /** Password for encrypted PDFs */
  password?: string;
}

/**
 * PDF document proxy returned by PDF.js
 */
interface PDFDocumentProxy {
  /** Total number of pages in the document */
  numPages: number;
  /** Get a specific page */
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  /** Clean up resources */
  destroy: () => Promise<void>;
}

/**
 * PDF page proxy for rendering and text extraction
 */
interface PDFPageProxy {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Get page viewport for rendering */
  getViewport: (params: { scale: number }) => PDFPageViewport;
  /** Render page to canvas */
  render: (params: PDFRenderParams) => PDFRenderTask;
  /** Get text content for extraction */
  getTextContent: () => Promise<PDFTextContent>;
}

/**
 * PDF page viewport for rendering calculations
 */
interface PDFPageViewport {
  width: number;
  height: number;
  scale: number;
}

/**
 * PDF render parameters
 */
interface PDFRenderParams {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFPageViewport;
}

/**
 * PDF render task
 */
interface PDFRenderTask {
  promise: Promise<void>;
}

/**
 * PDF text content structure
 */
interface PDFTextContent {
  items: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
  }>;
}

/**
 * PDFLoader Object
 *
 * Provides methods for loading PDF documents and managing PDF.js configuration.
 */
const PDFLoader = {
  /**
   * Load a PDF file and initialize the application state
   *
   * @param file - The PDF file to load
   * @returns Promise resolving to the loaded PDF document proxy
   *
   * @throws Error if PDF loading fails
   *
   * @remarks
   * This method:
   * 1. Sets processing state and shows loading indicator
   * 2. Converts file to ArrayBuffer
   * 3. Loads PDF using PDF.js with configuration
   * 4. Updates application state with document info
   * 5. Updates DOM elements (total pages, visibility)
   * 6. Shows success/error status
   * 7. Triggers first page render
   *
   * @example
   * ```typescript
   * const fileInput = document.querySelector('input[type="file"]');
   * fileInput.addEventListener('change', async (e) => {
   *   const file = e.target.files[0];
   *   try {
   *     const pdfDoc = await PDFLoader.loadPDF(file);
   *     console.log(`Loaded PDF with ${pdfDoc.numPages} pages`);
   *   } catch (error) {
   *     console.error('Failed to load PDF:', error);
   *   }
   * });
   * ```
   */
  loadPDF: async (file: File): Promise<PDFDocumentProxy> => {
    // Set processing state
    AppStateManager.setState({ isProcessing: true });
    StatusManager.showLoading(true);

    try {
      // Cleanup previous PDF rendering to prevent memory leaks
      PDFRenderer.cleanup();

      // Convert file to ArrayBuffer for PDF.js
      const arrayBuffer = await file.arrayBuffer();

      // Configure PDF.js worker (must be set before first getDocument call)
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded. Ensure pdf.js is included in your HTML.');
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFConfig.workerSrc;

      // Load PDF document with configuration
      const pdfDoc = await window.pdfjsLib.getDocument({
        data: arrayBuffer,
        ...PDFConfig.documentOptions
      }).promise;

      // Sanitize filename for security
      const sanitizedName = SecurityUtils.sanitizeText(file.name);

      // Update application state
      AppStateManager.setState({
        pdfDoc,
        totalPages: pdfDoc.numPages,
        documentName: sanitizedName,
        isProcessing: false,
        pdfTextCache: new Map() // Clear cache on new load
      });

      // Update DOM elements
      const totalPagesElement = document.getElementById('total-pages');
      const uploadAreaElement = document.getElementById('upload-area');
      const pdfPagesElement = document.getElementById('pdf-pages');

      if (totalPagesElement) {
        totalPagesElement.textContent = pdfDoc.numPages.toString();
      }

      if (uploadAreaElement) {
        uploadAreaElement.style.display = 'none';
      }

      if (pdfPagesElement) {
        pdfPagesElement.style.display = 'block';
      }

      // Show success status
      StatusManager.showLoading(false);
      StatusManager.show('PDF loaded successfully', 'success');

      // Render first page with text selection enabled
      await PDFRenderer.renderPage(1, TextSelection);

      return pdfDoc;

    } catch (error) {
      // Handle errors
      console.error('PDF Load Error:', error);

      StatusManager.showLoading(false);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error';

      StatusManager.show(
        `Failed to load PDF: ${errorMessage}`,
        'error'
      );

      AppStateManager.setState({ isProcessing: false });

      throw error;
    }
  }
};

/**
 * Export PDFLoader as default
 */
export default PDFLoader;

/**
 * Export TypeScript types for external use
 */
export type {
  PDFDocumentProxy,
  PDFPageProxy,
  PDFPageViewport,
  PDFRenderParams,
  PDFRenderTask,
  PDFTextContent
};
