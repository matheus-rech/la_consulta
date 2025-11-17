/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AnnotationService - PDF annotation and markup functionality
 * 
 * Provides comprehensive annotation capabilities for PDF documents:
 * - Text highlights with colors
 * - Sticky notes and comments
 * - Drawing tools (rectangles, circles, arrows)
 * - Freehand drawing
 * - Annotation persistence and export
 * - Collaborative annotation support
 */

import AppStateManager from '../state/AppStateManager';

export type AnnotationType = 'highlight' | 'note' | 'rectangle' | 'circle' | 'arrow' | 'freehand';
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'red' | 'purple' | 'orange';

export interface Annotation {
    id: string;
    type: AnnotationType;
    pageNum: number;
    color: AnnotationColor;
    coordinates: {
        x: number;
        y: number;
        width?: number;
        height?: number;
        x2?: number;
        y2?: number;
    };
    text?: string;              // For notes and highlighted text
    comment?: string;           // User comment
    author?: string;            // Who created it
    timestamp: number;          // When created
    paths?: Array<{x: number; y: number}[]>;  // For freehand drawing
}

export interface AnnotationLayer {
    pageNum: number;
    canvas: HTMLCanvasElement;
    annotations: Annotation[];
}

const COLOR_MAP: Record<AnnotationColor, string> = {
    yellow: 'rgba(255, 255, 0, 0.4)',
    green: 'rgba(0, 255, 0, 0.4)',
    blue: 'rgba(0, 150, 255, 0.4)',
    red: 'rgba(255, 0, 0, 0.4)',
    purple: 'rgba(200, 0, 255, 0.4)',
    orange: 'rgba(255, 150, 0, 0.4)',
};

const STROKE_COLOR_MAP: Record<AnnotationColor, string> = {
    yellow: 'rgba(200, 200, 0, 0.8)',
    green: 'rgba(0, 200, 0, 0.8)',
    blue: 'rgba(0, 100, 200, 0.8)',
    red: 'rgba(200, 0, 0, 0.8)',
    purple: 'rgba(150, 0, 200, 0.8)',
    orange: 'rgba(200, 100, 0, 0.8)',
};

export const AnnotationService = {
    annotations: [] as Annotation[],
    layers: new Map<number, AnnotationLayer>(),
    currentTool: 'highlight' as AnnotationType,
    currentColor: 'yellow' as AnnotationColor,
    isDrawing: false,
    currentPath: [] as Array<{x: number; y: number}>,
    currentAuthor: 'Anonymous',
    interactionLayer: null as HTMLElement | null,
    interactionPage: null as number | null,
    interactionEnabled: false,
    interactionState: {
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        freehandPath: [] as Array<{x: number; y: number}>,
    },

    /**
     * Initialize annotation layer for a page
     */
    initializeLayer: (pageNum: number, container: HTMLElement): HTMLCanvasElement => {
        const existingLayer = AnnotationService.layers.get(pageNum);
        const rect = typeof container.getBoundingClientRect === 'function'
            ? container.getBoundingClientRect()
            : { width: 0, height: 0 };
        const width = rect.width || container.clientWidth || container.scrollWidth || 800;
        const height = rect.height || container.clientHeight || container.scrollHeight || 1000;

        if (existingLayer) {
            const canvas = existingLayer.canvas;
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            if (canvas.parentElement !== container) {
                container.appendChild(canvas);
            }

            return canvas;
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'annotation-layer';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '10';

        // Use clientWidth/clientHeight for reliable sizing, and set CSS style width/height to match
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        container.appendChild(canvas);

        const layer: AnnotationLayer = {
            pageNum,
            canvas,
            annotations: [],
        };
        AnnotationService.layers.set(pageNum, layer);

        return canvas;
    },

    /**
     * Add a new annotation
     */
    addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'author'>): Annotation => {
        const newAnnotation: Annotation = {
            ...annotation,
            id: `ann_${typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)}`,
            timestamp: Date.now(),
            author: AnnotationService.currentAuthor,
        };

        AnnotationService.annotations.push(newAnnotation);

        const layer = AnnotationService.layers.get(annotation.pageNum);
        if (layer) {
            layer.annotations.push(newAnnotation);
            AnnotationService.renderAnnotations(annotation.pageNum);
        }

        AnnotationService.saveToStorage();

        return newAnnotation;
    },

    /**
     * Create highlight annotation
     */
    createHighlight: (
        pageNum: number,
        x: number,
        y: number,
        width: number,
        height: number,
        text?: string,
        comment?: string
    ): Annotation => {
        return AnnotationService.addAnnotation({
            type: 'highlight',
            pageNum,
            color: AnnotationService.currentColor,
            coordinates: { x, y, width, height },
            text,
            comment,
        });
    },

    /**
     * Create note annotation
     */
    createNote: (
        pageNum: number,
        x: number,
        y: number,
        comment: string
    ): Annotation => {
        return AnnotationService.addAnnotation({
            type: 'note',
            pageNum,
            color: AnnotationService.currentColor,
            coordinates: { x, y, width: 30, height: 30 },
            comment,
        });
    },

    /**
     * Create shape annotation (rectangle, circle, arrow)
     */
    createShape: (
        type: 'rectangle' | 'circle' | 'arrow',
        pageNum: number,
        x: number,
        y: number,
        x2: number,
        y2: number,
        comment?: string
    ): Annotation => {
        return AnnotationService.addAnnotation({
            type,
            pageNum,
            color: AnnotationService.currentColor,
            coordinates: { x, y, x2, y2 },
            comment,
        });
    },

    /**
     * Create freehand drawing annotation
     */
    createFreehand: (
        pageNum: number,
        paths: Array<{x: number; y: number}[]>,
        comment?: string
    ): Annotation => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        paths.forEach(path => {
            path.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
        });

        return AnnotationService.addAnnotation({
            type: 'freehand',
            pageNum,
            color: AnnotationService.currentColor,
            coordinates: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
            paths,
            comment,
        });
    },

    /**
     * Render all annotations on a page
     */
    renderAnnotations: (pageNum: number): void => {
        const layer = AnnotationService.layers.get(pageNum);
        if (!layer) {
            console.warn(`No annotation layer found for page ${pageNum}`);
            return;
        }

        let ctx: CanvasRenderingContext2D | null = null;
        try {
            ctx = layer.canvas.getContext('2d');
        } catch (error) {
            console.warn('Canvas context not available for annotations.', error);
            return;
        }
        if (!ctx) return;

        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

        layer.annotations.forEach(annotation => {
            AnnotationService.renderAnnotation(ctx, annotation);
        });
    },

    /**
     * Render a single annotation
     */
    renderAnnotation: (ctx: CanvasRenderingContext2D, annotation: Annotation): void => {
        const fillColor = COLOR_MAP[annotation.color];
        const strokeColor = STROKE_COLOR_MAP[annotation.color];

        ctx.save();

        switch (annotation.type) {
            case 'highlight':
                ctx.fillStyle = fillColor;
                ctx.fillRect(
                    annotation.coordinates.x,
                    annotation.coordinates.y,
                    annotation.coordinates.width || 0,
                    annotation.coordinates.height || 0
                );
                break;

            case 'note':
                ctx.fillStyle = fillColor;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    annotation.coordinates.x + 15,
                    annotation.coordinates.y + 15,
                    15,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.stroke();
                
                ctx.fillStyle = '#000';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('i', annotation.coordinates.x + 15, annotation.coordinates.y + 15);
                break;

            case 'rectangle':
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    annotation.coordinates.x,
                    annotation.coordinates.y,
                    (annotation.coordinates.x2 || 0) - annotation.coordinates.x,
                    (annotation.coordinates.y2 || 0) - annotation.coordinates.y
                );
                break;

            case 'circle':
                const centerX = (annotation.coordinates.x + (annotation.coordinates.x2 || 0)) / 2;
                const centerY = (annotation.coordinates.y + (annotation.coordinates.y2 || 0)) / 2;
                const radiusX = Math.abs((annotation.coordinates.x2 || 0) - annotation.coordinates.x) / 2;
                const radiusY = Math.abs((annotation.coordinates.y2 || 0) - annotation.coordinates.y) / 2;
                
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'arrow':
                ctx.strokeStyle = strokeColor;
                ctx.fillStyle = strokeColor;
                ctx.lineWidth = 3;
                
                const x1 = annotation.coordinates.x;
                const y1 = annotation.coordinates.y;
                const x2 = annotation.coordinates.x2 || 0;
                const y2 = annotation.coordinates.y2 || 0;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowLength = 15;
                ctx.beginPath();
                ctx.moveTo(x2, y2);
                ctx.lineTo(
                    x2 - arrowLength * Math.cos(angle - Math.PI / 6),
                    y2 - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    x2 - arrowLength * Math.cos(angle + Math.PI / 6),
                    y2 - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
                break;

            case 'freehand':
                if (annotation.paths && annotation.paths.length > 0) {
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    annotation.paths.forEach(path => {
                        if (path.length < 2) return;
                        
                        ctx.beginPath();
                        ctx.moveTo(path[0].x, path[0].y);
                        for (let i = 1; i < path.length; i++) {
                            ctx.lineTo(path[i].x, path[i].y);
                        }
                        ctx.stroke();
                    });
                }
                break;
        }

        ctx.restore();
    },

    /**
     * Get annotations for a specific page
     */
    getAnnotationsForPage: (pageNum: number): Annotation[] => {
        return AnnotationService.annotations.filter(a => a.pageNum === pageNum);
    },

    /**
     * Get annotation by ID
     */
    getAnnotationById: (id: string): Annotation | null => {
        return AnnotationService.annotations.find(a => a.id === id) || null;
    },

    /**
     * Update annotation
     */
    updateAnnotation: (id: string, updates: Partial<Annotation>): boolean => {
        const index = AnnotationService.annotations.findIndex(a => a.id === id);
        if (index === -1) return false;

        // Prevent updating id and pageNum
        const { id: _id, pageNum: _pageNum, ...safeUpdates } = updates;
        AnnotationService.annotations[index] = {
            ...AnnotationService.annotations[index],
            ...safeUpdates,
        };

        const pageNum = AnnotationService.annotations[index].pageNum;
        AnnotationService.renderAnnotations(pageNum);

        return true;
    },

    /**
     * Delete annotation
     */
    deleteAnnotation: (id: string): boolean => {
        const annotation = AnnotationService.getAnnotationById(id);
        if (!annotation) return false;

        AnnotationService.annotations = AnnotationService.annotations.filter(a => a.id !== id);

        const layer = AnnotationService.layers.get(annotation.pageNum);
        if (layer) {
            layer.annotations = layer.annotations.filter(a => a.id !== id);
        }

        AnnotationService.renderAnnotations(annotation.pageNum);

        AnnotationService.saveToStorage();

        return true;
    },

    /**
     * Clear all annotations
     */
    clearAllAnnotations: (): void => {
        AnnotationService.annotations = [];
        AnnotationService.layers.forEach(layer => {
            layer.annotations = [];
            const ctx = layer.canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            }
        });

        AnnotationService.saveToStorage();
    },

    /**
     * Export annotations to JSON
     */
    exportAnnotations: (): string => {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            documentName: AppStateManager.getState().documentName || 'unknown',
            annotations: AnnotationService.annotations,
        };
        return JSON.stringify(exportData, null, 2);
    },

    /**
     * Import annotations from JSON
     */
    importAnnotations: (jsonData: string): boolean => {
        try {
            const data = JSON.parse(jsonData);
            if (!data.annotations || !Array.isArray(data.annotations)) {
                throw new Error('Invalid annotation data format');
            }

            AnnotationService.annotations = data.annotations;
            
            AnnotationService.annotations.forEach(annotation => {
                const layer = AnnotationService.layers.get(annotation.pageNum);
                if (layer && !layer.annotations.find(a => a.id === annotation.id)) {
                    layer.annotations.push(annotation);
                }
            });

            AnnotationService.layers.forEach((layer, pageNum) => {
                AnnotationService.renderAnnotations(pageNum);
            });

            AnnotationService.saveToStorage();

            return true;
        } catch (error) {
            console.error('Failed to import annotations:', error);
            return false;
        }
    },

    /**
     * Save annotations to localStorage
     * Persists all annotations for recovery on page reload
     */
    saveToStorage: (): void => {
        try {
            const documentName = AppStateManager.getState().documentName || 'unknown';
            const storageKey = `clinical_annotations_${documentName}`;
            
            const storageData = {
                version: '1.0',
                documentName,
                saveDate: new Date().toISOString(),
                annotations: AnnotationService.annotations,
            };
            
            localStorage.setItem(storageKey, JSON.stringify(storageData));
            console.log(`💾 Saved ${AnnotationService.annotations.length} annotations to localStorage`);
        } catch (error) {
            console.error('Failed to save annotations to localStorage:', error);
        }
    },

    /**
     * Load annotations from localStorage
     * Restores annotations for the current document
     */
    loadFromStorage: (documentName?: string): boolean => {
        try {
            const docName = documentName || AppStateManager.getState().documentName || 'unknown';
            const storageKey = `clinical_annotations_${docName}`;
            
            const saved = localStorage.getItem(storageKey);
            if (!saved) {
                console.log('No saved annotations found for this document');
                return false;
            }

            const data = JSON.parse(saved);
            if (!data.annotations || !Array.isArray(data.annotations)) {
                console.warn('Invalid annotation data in localStorage');
                return false;
            }

            AnnotationService.annotations = data.annotations;
            
            // Rebuild layer annotations
            AnnotationService.annotations.forEach(annotation => {
                const layer = AnnotationService.layers.get(annotation.pageNum);
                if (layer && !layer.annotations.find(a => a.id === annotation.id)) {
                    layer.annotations.push(annotation);
                }
            });

            // Re-render all layers that have annotations
            AnnotationService.layers.forEach((layer, pageNum) => {
                if (layer.annotations.length > 0) {
                    AnnotationService.renderAnnotations(pageNum);
                }
            });

            console.log(`✅ Loaded ${AnnotationService.annotations.length} annotations from localStorage (saved: ${data.saveDate})`);
            return true;
        } catch (error) {
            console.error('Failed to load annotations from localStorage:', error);
            return false;
        }
    },

    /**
     * Set current tool
     */
    setTool: (tool: AnnotationType): void => {
        AnnotationService.currentTool = tool;
    },

    /**
     * Set current color
     */
    setColor: (color: AnnotationColor): void => {
        AnnotationService.currentColor = color;
    },

    /**
     * Set author name
     */
    setAuthor: (author: string): void => {
        AnnotationService.currentAuthor = author;
    },

    /**
     * Cleanup annotation layers
     */
    cleanup: (): void => {
        AnnotationService.layers.forEach(layer => {
            if (layer.canvas.parentNode) {
                layer.canvas.parentNode.removeChild(layer.canvas);
            }
        });
        AnnotationService.layers.clear();
        AnnotationService.disableInteraction();
    },

    /**
     * Enable pointer interaction overlay for annotations
     */
    enableInteraction: (pageElement: HTMLElement, pageNum: number): void => {
        AnnotationService.interactionEnabled = true;
        AnnotationService.interactionPage = pageNum;

        if (AnnotationService.interactionLayer && AnnotationService.interactionLayer.parentElement !== pageElement) {
            AnnotationService.interactionLayer.parentElement?.removeChild(AnnotationService.interactionLayer);
            AnnotationService.interactionLayer = null;
        }

        if (!AnnotationService.interactionLayer) {
            const overlay = document.createElement('div');
            overlay.className = 'annotation-interaction-layer';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '20';
            overlay.style.pointerEvents = 'auto';
            overlay.style.cursor = AnnotationService.currentTool === 'note' ? 'pointer' : 'crosshair';

            overlay.addEventListener('mousedown', AnnotationService.handlePointerDown);
            window.addEventListener('mousemove', AnnotationService.handlePointerMove);
            window.addEventListener('mouseup', AnnotationService.handlePointerUp);

            pageElement.appendChild(overlay);
            AnnotationService.interactionLayer = overlay;
        } else {
            AnnotationService.interactionLayer.style.cursor = AnnotationService.currentTool === 'note' ? 'pointer' : 'crosshair';
        }
    },

    /**
     * Disable annotation interaction overlay
     */
    disableInteraction: (): void => {
        AnnotationService.interactionEnabled = false;
        AnnotationService.interactionPage = null;
        AnnotationService.isDrawing = false;
        AnnotationService.interactionState.freehandPath = [];

        if (AnnotationService.interactionLayer) {
            AnnotationService.interactionLayer.removeEventListener('mousedown', AnnotationService.handlePointerDown);
            window.removeEventListener('mousemove', AnnotationService.handlePointerMove);
            window.removeEventListener('mouseup', AnnotationService.handlePointerUp);
            AnnotationService.interactionLayer.parentElement?.removeChild(AnnotationService.interactionLayer);
            AnnotationService.interactionLayer = null;
        }
    },

    /**
     * Ensure interaction layer stays in sync with rendered page
     */
    syncInteractionLayer: (pageNum: number, pageElement: HTMLElement): void => {
        if (!AnnotationService.interactionEnabled) {
            AnnotationService.disableInteraction();
            return;
        }
        AnnotationService.enableInteraction(pageElement, pageNum);
    },

    handlePointerDown: (event: MouseEvent): void => {
        if (!AnnotationService.interactionLayer || !AnnotationService.interactionEnabled) return;

        const pageNum = AnnotationService.interactionPage ?? AppStateManager.getState().currentPage;
        if (!pageNum) return;

        const rect = AnnotationService.interactionLayer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (AnnotationService.currentTool === 'note') {
            const comment = window.prompt('Note', '');
            if (comment) {
                AnnotationService.createNote(pageNum, x - 15, y - 15, comment);
                AnnotationService.renderAnnotations(pageNum);
            }
            return;
        }

        AnnotationService.isDrawing = true;
        AnnotationService.interactionState.startX = x;
        AnnotationService.interactionState.startY = y;
        AnnotationService.interactionState.currentX = x;
        AnnotationService.interactionState.currentY = y;
        AnnotationService.interactionState.freehandPath = [{ x, y }];
    },

    handlePointerMove: (event: MouseEvent): void => {
        if (!AnnotationService.isDrawing || !AnnotationService.interactionLayer) return;

        const rect = AnnotationService.interactionLayer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        AnnotationService.interactionState.currentX = x;
        AnnotationService.interactionState.currentY = y;

        if (AnnotationService.currentTool === 'freehand') {
            AnnotationService.interactionState.freehandPath.push({ x, y });
        }
    },

    handlePointerUp: (): void => {
        if (!AnnotationService.isDrawing) return;

        AnnotationService.isDrawing = false;

        const pageNum = AnnotationService.interactionPage ?? AppStateManager.getState().currentPage;
        if (!pageNum) return;

        const { startX, startY, currentX, currentY, freehandPath } = AnnotationService.interactionState;
        const width = currentX - startX;
        const height = currentY - startY;

        switch (AnnotationService.currentTool) {
            case 'highlight':
                if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                    AnnotationService.createHighlight(pageNum, Math.min(startX, currentX), Math.min(startY, currentY), Math.abs(width), Math.abs(height));
                }
                break;
            case 'rectangle':
            case 'circle':
                if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                    AnnotationService.createShape(
                        AnnotationService.currentTool,
                        pageNum,
                        startX,
                        startY,
                        currentX,
                        currentY,
                    );
                }
                break;
            case 'arrow':
                if (Math.abs(width) > 5 || Math.abs(height) > 5) {
                    AnnotationService.createShape('arrow', pageNum, startX, startY, currentX, currentY);
                }
                break;
            case 'freehand':
                if (freehandPath.length > 2) {
                    AnnotationService.createFreehand(pageNum, [freehandPath.slice()]);
                }
                break;
        }

        AnnotationService.renderAnnotations(pageNum);
        AnnotationService.interactionState.freehandPath = [];
    },
};

export default AnnotationService;
