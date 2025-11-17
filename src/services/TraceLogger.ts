/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TraceLogger
 *
 * Dedicated service for managing the Extraction Trace Log UI.
 * Keeps DOM manipulation separate from data tracking so that
 * ExtractionTracker can focus on persistence/business logic.
 */

import type { Extraction } from '../types';
import SecurityUtils from '../utils/security';

interface TraceLoggerOptions {
    /**
     * Max number of entries to keep rendered in the DOM.
     * Older entries will be removed to keep the UI responsive.
     */
    maxEntries?: number;
}

type ClickHandler = (extraction: Extraction) => void;

class TraceLogger {
    private container: HTMLElement | null = null;
    private options: Required<TraceLoggerOptions> = {
        maxEntries: 250,
    };
    private onEntryClick: ClickHandler | null = null;

    /**
     * Initialize the trace logger with a container ID and optional settings.
     */
    init(containerId = 'trace-log', options: TraceLoggerOptions = {}): void {
        this.options = {
            ...this.options,
            ...options,
        };

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`[TraceLogger] Container #${containerId} not found.`);
            return;
        }
    }

    /**
     * Register a callback invoked when an entry is clicked.
     */
    setEntryClickHandler(handler: ClickHandler): void {
        this.onEntryClick = handler;
    }

    /**
     * Remove all rendered entries.
     */
    clear(): void {
        if (!this.container) return;
        this.container.innerHTML = '';
    }

    /**
     * Render a full list of entries at once.
     */
    renderEntries(
        extractions: Extraction[],
        clickFactory: (extraction: Extraction) => ClickHandler,
    ): void {
        this.clear();
        extractions.forEach(extraction => {
            this.logExtraction(extraction, clickFactory(extraction));
        });
    }

    /**
     * Append a single extraction entry to the trace log.
     */
    logExtraction(
        extraction: Extraction,
        onClick?: () => void,
    ): void {
        if (!this.container) {
            console.warn('[TraceLogger] Container not initialized.');
            return;
        }

        // Enforce max entries to keep the DOM light-weight.
        if (this.container.childElementCount >= this.options.maxEntries) {
            const lastChild = this.container.lastElementChild;
            if (lastChild) {
                this.container.removeChild(lastChild);
            }
        }

        const entry = document.createElement('div');
        entry.className = 'trace-entry';
        entry.dataset.extractionId = extraction.id;
        entry.dataset.method = extraction.method;

        const truncatedText = extraction.text.length > 120
            ? `${extraction.text.substring(0, 117)}…`
            : extraction.text;

        entry.innerHTML = `
            <div class="trace-entry__header">
                <span class="trace-entry__field">${SecurityUtils.escapeHtml(extraction.fieldName)}</span>
                <span class="trace-entry__method badge badge-${extraction.method}">
                    ${SecurityUtils.escapeHtml(extraction.method || 'manual')}
                </span>
            </div>
            <div class="trace-entry__text">"${SecurityUtils.escapeHtml(truncatedText)}"</div>
            <div class="trace-entry__meta">
                Page ${extraction.page} • ${new Date(extraction.timestamp).toLocaleTimeString()}
            </div>
        `;

        entry.onclick = () => {
            if (onClick) {
                onClick();
                return;
            }
            if (this.onEntryClick) {
                this.onEntryClick(extraction);
            }
        };

        // Newest entries at the top.
        this.container.insertBefore(entry, this.container.firstChild);
    }
}

export default new TraceLogger();
