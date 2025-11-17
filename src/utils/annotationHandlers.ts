/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Annotation Handlers - Mouse event handling for PDF annotations
 * 
 * Provides mouse event handlers for drawing annotations on PDF canvas:
 * - Highlight: Click and drag to select text area
 * - Note: Click to place sticky note
 * - Rectangle: Click and drag to draw rectangle
 * - Circle: Click and drag to draw circle
 * - Arrow: Click start point, drag to end point
 * - Freehand: Mouse move while pressed to draw
 */

import AnnotationService, { AnnotationType } from '../services/AnnotationService';
import AppStateManager from '../state/AppStateManager';

interface DrawingState {
    isDrawing: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    currentPath: Array<{x: number; y: number}>;
}

let drawingState: DrawingState = {
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    currentPath: [],
};

/**
 * Initialize annotation handlers for a PDF container
 */
export function initializeAnnotationHandlers(container: HTMLElement, pageNum: number): void {
    // Remove existing handlers if any
    cleanupAnnotationHandlers(container);

    // Get annotation layer
    const layer = AnnotationService.layers.get(pageNum);
    if (!layer) {
        console.warn(`No annotation layer found for page ${pageNum}`);
        return;
    }

    const canvas = layer.canvas;
    
    // Enable pointer events on annotation canvas
    canvas.style.pointerEvents = 'auto';
    canvas.style.cursor = getCursorForTool(AnnotationService.currentTool);

    // Mouse down - start drawing
    canvas.addEventListener('mousedown', handleMouseDown);
    
    // Mouse move - update drawing
    canvas.addEventListener('mousemove', handleMouseMove);
    
    // Mouse up - finish drawing
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Mouse leave - cancel drawing
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Store handlers for cleanup
    (canvas as any).__annotationHandlers = {
        mousedown: handleMouseDown,
        mousemove: handleMouseMove,
        mouseup: handleMouseUp,
        mouseleave: handleMouseLeave,
    };

    function handleMouseDown(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        drawingState.isDrawing = true;
        drawingState.startX = x;
        drawingState.startY = y;
        drawingState.currentX = x;
        drawingState.currentY = y;
        drawingState.currentPath = [{ x, y }];

        // For freehand, start path immediately
        if (AnnotationService.currentTool === 'freehand') {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = AnnotationService.getStrokeColor();
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(x, y);
            }
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (!drawingState.isDrawing) {
            // Update cursor position for preview
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        drawingState.currentX = x;
        drawingState.currentY = y;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Redraw all annotations
        AnnotationService.renderAnnotations(pageNum);

        // Draw preview of current annotation
        ctx.save();
        ctx.globalAlpha = 0.5;

        switch (AnnotationService.currentTool) {
            case 'highlight':
                ctx.fillStyle = AnnotationService.getFillColor();
                ctx.fillRect(
                    drawingState.startX,
                    drawingState.startY,
                    x - drawingState.startX,
                    y - drawingState.startY
                );
                break;

            case 'rectangle':
                ctx.strokeStyle = AnnotationService.getStrokeColor();
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    drawingState.startX,
                    drawingState.startY,
                    x - drawingState.startX,
                    y - drawingState.startY
                );
                break;

            case 'circle':
                const centerX = (drawingState.startX + x) / 2;
                const centerY = (drawingState.startY + y) / 2;
                const radiusX = Math.abs(x - drawingState.startX) / 2;
                const radiusY = Math.abs(y - drawingState.startY) / 2;
                
                ctx.strokeStyle = AnnotationService.getStrokeColor();
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'arrow':
                ctx.strokeStyle = AnnotationService.getStrokeColor();
                ctx.fillStyle = AnnotationService.getStrokeColor();
                ctx.lineWidth = 3;
                
                ctx.beginPath();
                ctx.moveTo(drawingState.startX, drawingState.startY);
                ctx.lineTo(x, y);
                ctx.stroke();
                
                const angle = Math.atan2(y - drawingState.startY, x - drawingState.startX);
                const arrowLength = 15;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(
                    x - arrowLength * Math.cos(angle - Math.PI / 6),
                    y - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    x - arrowLength * Math.cos(angle + Math.PI / 6),
                    y - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
                break;

            case 'freehand':
                drawingState.currentPath.push({ x, y });
                ctx.strokeStyle = AnnotationService.getStrokeColor();
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(drawingState.currentPath[drawingState.currentPath.length - 2].x,
                          drawingState.currentPath[drawingState.currentPath.length - 2].y);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    function handleMouseUp(e: MouseEvent) {
        if (!drawingState.isDrawing) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        drawingState.isDrawing = false;

        // Create annotation based on tool type
        switch (AnnotationService.currentTool) {
            case 'highlight':
                AnnotationService.createHighlight(
                    pageNum,
                    Math.min(drawingState.startX, x),
                    Math.min(drawingState.startY, y),
                    Math.abs(x - drawingState.startX),
                    Math.abs(y - drawingState.startY)
                );
                break;

            case 'note':
                AnnotationService.createNote(pageNum, x, y);
                break;

            case 'rectangle':
                AnnotationService.createRectangle(
                    pageNum,
                    drawingState.startX,
                    drawingState.startY,
                    x,
                    y
                );
                break;

            case 'circle':
                AnnotationService.createCircle(
                    pageNum,
                    drawingState.startX,
                    drawingState.startY,
                    x,
                    y
                );
                break;

            case 'arrow':
                AnnotationService.createArrow(
                    pageNum,
                    drawingState.startX,
                    drawingState.startY,
                    x,
                    y
                );
                break;

            case 'freehand':
                if (drawingState.currentPath.length > 1) {
                    AnnotationService.createFreehand(
                        pageNum,
                        [drawingState.currentPath]
                    );
                }
                break;
        }

        // Redraw all annotations
        AnnotationService.renderAnnotations(pageNum);
        
        // Reset drawing state
        drawingState.currentPath = [];
    }

    function handleMouseLeave(e: MouseEvent) {
        if (drawingState.isDrawing) {
            // Cancel drawing if mouse leaves canvas
            drawingState.isDrawing = false;
            AnnotationService.renderAnnotations(pageNum);
            drawingState.currentPath = [];
        }
    }
}

/**
 * Cleanup annotation handlers for a container
 */
export function cleanupAnnotationHandlers(container: HTMLElement): void {
    const canvas = container.querySelector('.annotation-layer') as HTMLCanvasElement;
    if (!canvas || !(canvas as any).__annotationHandlers) return;

    const handlers = (canvas as any).__annotationHandlers;
    canvas.removeEventListener('mousedown', handlers.mousedown);
    canvas.removeEventListener('mousemove', handlers.mousemove);
    canvas.removeEventListener('mouseup', handlers.mouseup);
    canvas.removeEventListener('mouseleave', handlers.mouseleave);

    delete (canvas as any).__annotationHandlers;
}

/**
 * Get cursor style for tool type
 */
function getCursorForTool(tool: AnnotationType): string {
    switch (tool) {
        case 'highlight':
            return 'crosshair';
        case 'note':
            return 'pointer';
        case 'rectangle':
        case 'circle':
            return 'crosshair';
        case 'arrow':
            return 'crosshair';
        case 'freehand':
            return 'crosshair';
        default:
            return 'default';
    }
}

// Extend AnnotationService with helper methods for colors
declare module '../services/AnnotationService' {
    interface AnnotationService {
        getFillColor(): string;
        getStrokeColor(): string;
    }
}

// Add helper methods to AnnotationService
const COLOR_MAP: Record<string, string> = {
    yellow: 'rgba(255, 255, 0, 0.4)',
    green: 'rgba(0, 255, 0, 0.4)',
    blue: 'rgba(0, 150, 255, 0.4)',
    red: 'rgba(255, 0, 0, 0.4)',
    purple: 'rgba(200, 0, 255, 0.4)',
    orange: 'rgba(255, 150, 0, 0.4)',
};

const STROKE_COLOR_MAP: Record<string, string> = {
    yellow: 'rgba(200, 200, 0, 0.8)',
    green: 'rgba(0, 200, 0, 0.8)',
    blue: 'rgba(0, 100, 200, 0.8)',
    red: 'rgba(200, 0, 0, 0.8)',
    purple: 'rgba(150, 0, 200, 0.8)',
    orange: 'rgba(200, 100, 0, 0.8)',
};

(AnnotationService as any).getFillColor = function(): string {
    return COLOR_MAP[AnnotationService.currentColor] || COLOR_MAP.yellow;
};

(AnnotationService as any).getStrokeColor = function(): string {
    return STROKE_COLOR_MAP[AnnotationService.currentColor] || STROKE_COLOR_MAP.yellow;
};
