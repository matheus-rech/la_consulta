/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TextHighlighter - Canvas-based text highlighting for search results and citations
 * 
 * Provides visual highlighting functionality that overlays on the PDF canvas:
 * - Search result highlighting with yellow overlay
 * - Citation highlighting with customizable colors
 * - Smooth scrolling to highlighted text
 * - Flash animations for emphasis
 */

import AppStateManager from '../state/AppStateManager';
import type { TextChunk } from './CitationService';

export interface HighlightOptions {
    color?: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
    flash?: boolean;
    scrollIntoView?: boolean;
}

export const TextHighlighter = {
    /** Active highlight overlays */
    activeHighlights: [] as HTMLElement[],
    
    /**
     * Highlight text chunks on the current page
     * 
     * @param chunkIndices - Array of text chunk indices to highlight
     * @param options - Highlighting options
     */
    highlightChunks: (chunkIndices: number[], options: HighlightOptions = {}): void => {
        const {
            color = 'rgba(255, 255, 0, 0.4)',
            opacity = 0.4,
            borderColor = 'rgba(255, 193, 7, 0.8)',
            borderWidth = 2,
            flash = false,
            scrollIntoView = true,
        } = options;
        
        TextHighlighter.clearHighlights();
        
        const state = AppStateManager.getState();
        const textChunks = state.textChunks || [];
        const currentPage = state.currentPage;
        
        if (!currentPage || textChunks.length === 0) {
            console.warn('No page or text chunks available for highlighting');
            return;
        }
        
        const pdfContainer = document.querySelector('.pdf-page');
        if (!pdfContainer) {
            console.warn('PDF container not found');
            return;
        }
        
        const chunksToHighlight = textChunks.filter(
            (chunk: TextChunk) => 
                chunkIndices.includes(chunk.index) && 
                chunk.pageNum === currentPage
        );
        
        if (chunksToHighlight.length === 0) {
            console.log('No chunks to highlight on current page');
            return;
        }
        
        chunksToHighlight.forEach((chunk: TextChunk, idx: number) => {
            const highlight = document.createElement('div');
            highlight.className = 'text-highlight-overlay';
            highlight.style.position = 'absolute';
            highlight.style.backgroundColor = color;
            highlight.style.border = `${borderWidth}px solid ${borderColor}`;
            highlight.style.pointerEvents = 'none';
            highlight.style.zIndex = '100';
            highlight.style.boxSizing = 'border-box';
            
            const bbox = chunk.bbox;
            const scale = state.scale || 1.0;
            
            highlight.style.left = (bbox.x * scale) + 'px';
            highlight.style.top = (bbox.y * scale) + 'px';
            highlight.style.width = (bbox.width * scale) + 'px';
            highlight.style.height = (bbox.height * scale) + 'px';
            
            if (flash) {
                highlight.style.animation = 'highlight-flash 1.5s ease-in-out';
            }
            
            pdfContainer.appendChild(highlight);
            TextHighlighter.activeHighlights.push(highlight);
            
            if (idx === 0 && scrollIntoView) {
                setTimeout(() => {
                    highlight.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }, 100);
            }
        });
        
        console.log(`✨ Highlighted ${chunksToHighlight.length} text chunks`);
    },
    
    /**
     * Highlight a single citation by index
     * 
     * @param citationIndex - Citation index to highlight
     * @param options - Highlighting options
     */
    highlightCitation: (citationIndex: number, options: HighlightOptions = {}): void => {
        const defaultOptions: HighlightOptions = {
            color: 'rgba(255, 235, 59, 0.6)',
            borderColor: 'rgba(255, 193, 7, 1)',
            borderWidth: 3,
            flash: true,
            scrollIntoView: true,
        };
        
        TextHighlighter.highlightChunks([citationIndex], { ...defaultOptions, ...options });
    },
    
    /**
     * Highlight search results on the current page
     * 
     * @param searchResults - Array of search result indices
     */
    highlightSearchResults: (searchResults: number[]): void => {
        TextHighlighter.highlightChunks(searchResults, {
            color: 'rgba(255, 255, 0, 0.3)',
            borderColor: 'rgba(255, 200, 0, 0.8)',
            borderWidth: 1,
            flash: false,
            scrollIntoView: false,
        });
    },
    
    /**
     * Clear all active highlights
     */
    /**
     * Clear all active highlights.
     * 
     * Note: If the PDF container is cleared or replaced externally,
     * you should call clearHighlights() to avoid memory leaks from
     * lingering references to detached DOM nodes.
     */
    clearHighlights: (): void => {
        // Only attempt to remove highlights still attached to the DOM
        TextHighlighter.activeHighlights = TextHighlighter.activeHighlights.filter(highlight => {
            if (highlight.parentNode) {
                highlight.parentNode.removeChild(highlight);
                return false; // removed from DOM, don't keep reference
            }
            // If already detached, just drop reference
            return false;
        });
    },
    
    /**
     * Highlight text at specific coordinates
     * 
     * @param bbox - Bounding box coordinates
     * @param options - Highlighting options
     */
    highlightBoundingBox: (
        bbox: { x: number; y: number; width: number; height: number },
        options: HighlightOptions = {}
    ): void => {
        const {
            color = 'rgba(255, 255, 0, 0.4)',
            borderColor = 'rgba(255, 193, 7, 0.8)',
            borderWidth = 2,
            flash = false,
        } = options;
        
        const pdfContainer = document.querySelector('.pdf-page');
        if (!pdfContainer) {
            console.warn('PDF container not found');
            return;
        }
        
        const state = AppStateManager.getState();
        const scale = state.scale || 1.0;
        
        const highlight = document.createElement('div');
        highlight.className = 'text-highlight-overlay';
        highlight.style.position = 'absolute';
        highlight.style.backgroundColor = color;
        highlight.style.border = `${borderWidth}px solid ${borderColor}`;
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '100';
        highlight.style.boxSizing = 'border-box';
        
        highlight.style.left = (bbox.x * scale) + 'px';
        highlight.style.top = (bbox.y * scale) + 'px';
        highlight.style.width = (bbox.width * scale) + 'px';
        highlight.style.height = (bbox.height * scale) + 'px';
        
        if (flash) {
            highlight.style.animation = 'highlight-flash 1.5s ease-in-out';
        }
        
        pdfContainer.appendChild(highlight);
        TextHighlighter.activeHighlights.push(highlight);
    },
};

if (typeof document !== 'undefined') {
    const styleId = 'text-highlighter-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes highlight-flash {
                0%, 100% { 
                    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
                    opacity: 1;
                }
                50% { 
                    box-shadow: 0 0 0 8px rgba(255, 193, 7, 0);
                    opacity: 0.8;
                }
            }
            
            .text-highlight-overlay {
                transition: opacity 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

export default TextHighlighter;
