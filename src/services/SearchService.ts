/**
 * SearchService - Full-text search functionality for PDF content
 * 
 * Provides fast text search across PDF pages with highlighting support.
 */

import AppStateManager from '../state/AppStateManager';
import TextHighlighter from './TextHighlighter';
import type { TextChunk } from './CitationService';

export interface SearchResult {
    page: number;
    text: string;
    context: string;
    index: number;
    chunkIndex?: number;
    bbox?: TextChunk['bbox'];
}

export const SearchService = {
    currentQuery: '',
    currentResults: [] as SearchResult[],
    currentIndex: -1,

    /**
     * Search for text across all PDF pages
     */
    search: async (query: string): Promise<SearchResult[]> => {
        if (!query || query.trim().length === 0) {
            SearchService.clearSearch();
            return [];
        }

        const state = AppStateManager.getState();
        SearchService.currentQuery = query.toLowerCase();
        SearchService.currentResults = [];

        const textChunks: TextChunk[] = state.textChunks || [];

        if (textChunks.length > 0) {
            textChunks.forEach(chunk => {
                const chunkText = chunk.text || '';
                const matchIndex = chunkText.toLowerCase().indexOf(SearchService.currentQuery);

                if (matchIndex !== -1) {
                    SearchService.currentResults.push({
                        page: chunk.pageNum,
                        text: chunkText.substring(matchIndex, matchIndex + SearchService.currentQuery.length),
                        context: chunkText,
                        index: SearchService.currentResults.length,
                        chunkIndex: chunk.index,
                        bbox: chunk.bbox,
                    });
                }
            });
        } else {
            console.warn('No sentence-level text chunks available; falling back to slower PDF scan.');
            if (!state.pdfDoc) {
                return [];
            }

            const pdfDoc = state.pdfDoc as any;
            const totalPages = state.totalPages;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                try {
                    const page = await pdfDoc.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    const pageText = textContent.items
                        .map((item: any) => item.str)
                        .join(' ');

                    const lowerPageText = pageText.toLowerCase();
                    let startIndex = 0;

                    while (true) {
                        const matchPosition = lowerPageText.indexOf(SearchService.currentQuery, startIndex);
                        if (matchPosition === -1) break;

                        const contextStart = Math.max(0, matchPosition - 50);
                        const contextEnd = Math.min(pageText.length, matchPosition + SearchService.currentQuery.length + 50);
                        const context = pageText.substring(contextStart, contextEnd);

                        SearchService.currentResults.push({
                            page: pageNum,
                            text: pageText.substring(matchPosition, matchPosition + SearchService.currentQuery.length),
                            context,
                            index: SearchService.currentResults.length,
                        });

                        startIndex = matchPosition + SearchService.currentQuery.length;
                    }
                } catch (error) {
                    console.error(`Error searching page ${pageNum}:`, error);
                }
            }
        }

        if (SearchService.currentResults.length > 0) {
            SearchService.currentIndex = 0;
        }

        return SearchService.currentResults;
    },

    /**
     * Navigate to next search result
     */
    nextResult: (): SearchResult | null => {
        if (SearchService.currentResults.length === 0) {
            return null;
        }

        SearchService.currentIndex = (SearchService.currentIndex + 1) % SearchService.currentResults.length;
        return SearchService.currentResults[SearchService.currentIndex];
    },

    /**
     * Navigate to previous search result
     */
    previousResult: (): SearchResult | null => {
        if (SearchService.currentResults.length === 0) {
            return null;
        }

        SearchService.currentIndex = 
            (SearchService.currentIndex - 1 + SearchService.currentResults.length) % 
            SearchService.currentResults.length;
        
        return SearchService.currentResults[SearchService.currentIndex];
    },

    /**
     * Get current search result
     */
    getCurrentResult: (): SearchResult | null => {
        if (SearchService.currentIndex === -1 || SearchService.currentResults.length === 0) {
            return null;
        }

        return SearchService.currentResults[SearchService.currentIndex];
    },

    /**
     * Clear search results and markers
     */
    clearSearch: (): void => {
        SearchService.currentQuery = '';
        SearchService.currentResults = [];
        SearchService.currentIndex = -1;

        TextHighlighter.clearHighlights();
    },

    /**
     * Highlight search results on the specified page using TextHighlighter
     */
    highlightResultsForPage: (pageNum: number): void => {
        const chunkIndices = SearchService.currentResults
            .filter(result => result.page === pageNum && typeof result.chunkIndex === 'number')
            .map(result => result.chunkIndex as number);

        if (chunkIndices.length === 0) {
            TextHighlighter.clearHighlights();
            return;
        }

        TextHighlighter.highlightSearchResults(chunkIndices);
    },

    /**
     * Get search statistics
     */
    getStats: (): {
        query: string;
        totalResults: number;
        currentIndex: number;
        hasResults: boolean;
    } => {
        return {
            query: SearchService.currentQuery,
            totalResults: SearchService.currentResults.length,
            currentIndex: SearchService.currentIndex,
            hasResults: SearchService.currentResults.length > 0,
        };
    },
};

export default SearchService;
