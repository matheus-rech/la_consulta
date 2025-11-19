/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import TextHighlighter from '../../src/services/TextHighlighter';
import AppStateManager from '../../src/state/AppStateManager';

describe('TextHighlighter', () => {
    beforeEach(() => {
        // Reset configuration before each test
        TextHighlighter.containerConfig = '.pdf-page';
        TextHighlighter.activeHighlights = [];
        
        // Set up DOM
        document.body.innerHTML = `
            <div class="pdf-page" style="position: relative; width: 500px; height: 700px;">
            </div>
        `;
    });

    afterEach(() => {
        TextHighlighter.clearHighlights();
        document.body.innerHTML = '';
    });

    describe('configure', () => {
        it('should accept a CSS selector string', () => {
            TextHighlighter.configure({ container: '.custom-container' });
            expect(TextHighlighter.containerConfig).toBe('.custom-container');
        });

        it('should accept an HTMLElement', () => {
            const element = document.createElement('div');
            TextHighlighter.configure({ container: element });
            expect(TextHighlighter.containerConfig).toBe(element);
        });

        it('should use default .pdf-page selector if not configured', () => {
            expect(TextHighlighter.containerConfig).toBe('.pdf-page');
        });
    });

    describe('_getContainer', () => {
        it('should return element when configured with string selector', () => {
            TextHighlighter.configure({ container: '.pdf-page' });
            const container = TextHighlighter._getContainer();
            expect(container).not.toBeNull();
            expect(container?.className).toBe('pdf-page');
        });

        it('should return element when configured with HTMLElement', () => {
            const element = document.querySelector('.pdf-page') as HTMLElement;
            TextHighlighter.configure({ container: element });
            const container = TextHighlighter._getContainer();
            expect(container).toBe(element);
        });

        it('should return null if selector does not match any element', () => {
            TextHighlighter.configure({ container: '.non-existent' });
            const container = TextHighlighter._getContainer();
            expect(container).toBeNull();
        });
    });

    describe('highlightBoundingBox', () => {
        beforeEach(() => {
            // Mock AppStateManager state
            jest.spyOn(AppStateManager, 'getState').mockReturnValue({
                scale: 1.0,
            } as any);
        });

        it('should create highlight overlay in configured container', () => {
            const bbox = { x: 100, y: 200, width: 300, height: 20 };
            
            TextHighlighter.highlightBoundingBox(bbox, {
                color: 'rgba(255, 0, 0, 0.5)',
                borderColor: 'red',
            });

            const container = document.querySelector('.pdf-page');
            const highlights = container?.querySelectorAll('.text-highlight-overlay');
            
            expect(highlights?.length).toBe(1);
            expect(TextHighlighter.activeHighlights.length).toBe(1);
        });

        it('should not create highlight if container not found', () => {
            TextHighlighter.configure({ container: '.non-existent' });
            
            const bbox = { x: 100, y: 200, width: 300, height: 20 };
            TextHighlighter.highlightBoundingBox(bbox);

            expect(TextHighlighter.activeHighlights.length).toBe(0);
        });

        it('should work with custom container', () => {
            // Create custom container
            const customContainer = document.createElement('div');
            customContainer.className = 'custom-pdf-container';
            customContainer.style.position = 'relative';
            document.body.appendChild(customContainer);

            TextHighlighter.configure({ container: '.custom-pdf-container' });

            const bbox = { x: 50, y: 100, width: 200, height: 15 };
            TextHighlighter.highlightBoundingBox(bbox);

            const highlights = customContainer.querySelectorAll('.text-highlight-overlay');
            expect(highlights.length).toBe(1);
        });
    });

    describe('clearHighlights', () => {
        beforeEach(() => {
            jest.spyOn(AppStateManager, 'getState').mockReturnValue({
                scale: 1.0,
            } as any);
        });

        it('should remove all highlight overlays', () => {
            const bbox1 = { x: 100, y: 200, width: 300, height: 20 };
            const bbox2 = { x: 100, y: 250, width: 300, height: 20 };
            
            TextHighlighter.highlightBoundingBox(bbox1);
            TextHighlighter.highlightBoundingBox(bbox2);

            expect(TextHighlighter.activeHighlights.length).toBe(2);

            TextHighlighter.clearHighlights();

            expect(TextHighlighter.activeHighlights.length).toBe(0);
            const container = document.querySelector('.pdf-page');
            const highlights = container?.querySelectorAll('.text-highlight-overlay');
            expect(highlights?.length).toBe(0);
        });

        it('should handle detached highlights gracefully', () => {
            const bbox = { x: 100, y: 200, width: 300, height: 20 };
            TextHighlighter.highlightBoundingBox(bbox);

            // Manually remove highlight from DOM (simulating external DOM changes)
            const highlight = TextHighlighter.activeHighlights[0];
            highlight.parentNode?.removeChild(highlight);

            // Should not throw error
            expect(() => TextHighlighter.clearHighlights()).not.toThrow();
            expect(TextHighlighter.activeHighlights.length).toBe(0);
        });
    });
});
