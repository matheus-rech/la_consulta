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

    /**
     * Initialize annotation layer for a page
     */
    initializeLayer: (pageNum: number, container: HTMLElement): HTMLCanvasElement => {
        if (AnnotationService.layers.has(pageNum)) {
            const layer = AnnotationService.layers.get(pageNum)!;
            return layer.canvas;
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'annotation-layer';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '10';

        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        container.appendChild(canvas);

        const layer: AnnotationLayer = {
            pageNum,
            canvas,
            annotations: [],
        };
        AnnotationService.layers.set(pageNum, layer);

        console.log(`📝 Initialized annotation layer for page ${pageNum}`);
        return canvas;
    },

    /**
     * Add a new annotation
     */
    addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'author'>): Annotation => {
        const newAnnotation: Annotation = {
            ...annotation,
            id: `ann_${crypto.randomUUID()}`,
            timestamp: Date.now(),
            author: AnnotationService.currentAuthor,
        };

        AnnotationService.annotations.push(newAnnotation);

        const layer = AnnotationService.layers.get(annotation.pageNum);
        if (layer) {
            layer.annotations.push(newAnnotation);
        }

        console.log(`✅ Added ${annotation.type} annotation on page ${annotation.pageNum}`);
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

        const ctx = layer.canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

        layer.annotations.forEach(annotation => {
            AnnotationService.renderAnnotation(ctx, annotation);
        });

        console.log(`🎨 Rendered ${layer.annotations.length} annotations on page ${pageNum}`);
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

        AnnotationService.annotations[index] = {
            ...AnnotationService.annotations[index],
            ...updates,
        };

        const pageNum = AnnotationService.annotations[index].pageNum;
        AnnotationService.renderAnnotations(pageNum);

        console.log(`✏️ Updated annotation ${id}`);
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

        console.log(`🗑️ Deleted annotation ${id}`);
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
        console.log('🗑️ Cleared all annotations');
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

            console.log(`📥 Imported ${data.annotations.length} annotations`);
            return true;
        } catch (error) {
            console.error('Failed to import annotations:', error);
            return false;
        }
    },

    /**
     * Set current tool
     */
    setTool: (tool: AnnotationType): void => {
        AnnotationService.currentTool = tool;
        console.log(`🔧 Tool changed to: ${tool}`);
    },

    /**
     * Set current color
     */
    setColor: (color: AnnotationColor): void => {
        AnnotationService.currentColor = color;
        console.log(`🎨 Color changed to: ${color}`);
    },

    /**
     * Set author name
     */
    setAuthor: (author: string): void => {
        AnnotationService.currentAuthor = author;
        console.log(`👤 Author set to: ${author}`);
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
        console.log('🧹 Annotation layers cleaned up');
    },
};

export default AnnotationService;
