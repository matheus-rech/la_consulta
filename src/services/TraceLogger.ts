/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TraceLogger.ts
 * 
 * Extraction audit trail and provenance tracking service.
 * Records all extraction events with timestamps, coordinates, and methods.
 * Provides detailed trace logs for reproducible research.
 */

import SecurityUtils from '../utils/security';

interface TraceLogEntry {
    timestamp: number;
    date: string;
    action: string;
    fieldName?: string;
    text?: string;
    page?: number;
    coordinates?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    method?: string;
    confidence?: number;
    userId?: string;
    sessionId?: string;
}

class TraceLogger {
    private logs: TraceLogEntry[] = [];
    private sessionId: string;
    private userId: string = 'anonymous';
    private storageKey: string = 'clinical_extractor_trace_logs';
    private maxLogs: number = 1000; // Prevent memory overflow

    constructor() {
        this.sessionId = this.generateSessionId();
        this.loadFromStorage();
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set user ID for audit trail
     */
    setUserId(userId: string): void {
        this.userId = userId;
    }

    /**
     * Log an extraction event
     */
    logExtraction(
        fieldName: string,
        text: string,
        page: number,
        coordinates?: { x: number; y: number; width: number; height: number },
        method?: string,
        confidence?: number
    ): void {
        const entry: TraceLogEntry = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            action: 'extraction',
            fieldName,
            text: SecurityUtils.sanitizeText(text),
            page,
            coordinates,
            method,
            confidence,
            userId: this.userId,
            sessionId: this.sessionId
        };

        this.addLog(entry);
    }

    /**
     * Log a general action
     */
    logAction(action: string, details?: any): void {
        const entry: TraceLogEntry = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            action,
            ...details,
            userId: this.userId,
            sessionId: this.sessionId
        };

        this.addLog(entry);
    }

    /**
     * Add log entry and persist
     */
    private addLog(entry: TraceLogEntry): void {
        this.logs.push(entry);

        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        this.saveToStorage();
    }

    /**
     * Get all logs
     */
    getLogs(): TraceLogEntry[] {
        return [...this.logs];
    }

    /**
     * Get logs for specific session
     */
    getLogsBySession(sessionId: string): TraceLogEntry[] {
        return this.logs.filter(log => log.sessionId === sessionId);
    }

    /**
     * Get logs for specific field
     */
    getLogsByField(fieldName: string): TraceLogEntry[] {
        return this.logs.filter(log => log.fieldName === fieldName);
    }

    /**
     * Get logs by action type
     */
    getLogsByAction(action: string): TraceLogEntry[] {
        return this.logs.filter(log => log.action === action);
    }

    /**
     * Get logs within time range
     */
    getLogsByTimeRange(startTime: number, endTime: number): TraceLogEntry[] {
        return this.logs.filter(
            log => log.timestamp >= startTime && log.timestamp <= endTime
        );
    }

    /**
     * Export logs as JSON
     */
    exportJSON(): string {
        return JSON.stringify(
            {
                sessionId: this.sessionId,
                userId: this.userId,
                exportDate: new Date().toISOString(),
                totalLogs: this.logs.length,
                logs: this.logs
            },
            null,
            2
        );
    }

    /**
     * Export logs as CSV
     */
    exportCSV(): string {
        const headers = [
            'Timestamp',
            'Date',
            'Action',
            'Field Name',
            'Text',
            'Page',
            'X',
            'Y',
            'Width',
            'Height',
            'Method',
            'Confidence',
            'User ID',
            'Session ID'
        ];

        const rows = this.logs.map(log => [
            log.timestamp,
            log.date,
            log.action,
            log.fieldName || '',
            (log.text || '').replace(/"/g, '""'), // Escape quotes
            log.page || '',
            log.coordinates?.x || '',
            log.coordinates?.y || '',
            log.coordinates?.width || '',
            log.coordinates?.height || '',
            log.method || '',
            log.confidence || '',
            log.userId,
            log.sessionId
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Download trace logs as JSON file
     */
    downloadJSON(): void {
        const json = this.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-logs-${this.sessionId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Download trace logs as CSV file
     */
    downloadCSV(): void {
        const csv = this.exportCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-logs-${this.sessionId}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generate HTML audit report
     */
    generateHTMLReport(): string {
        const extractionLogs = this.logs.filter(log => log.action === 'extraction');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extraction Trace Log Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0 0 10px 0; color: #2c3e50; }
        .stats { display: flex; gap: 20px; margin-top: 15px; }
        .stat { background: #3498db; color: white; padding: 10px 20px; border-radius: 4px; }
        .log-entry { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #3498db; }
        .log-entry.manual { border-left-color: #e74c3c; }
        .log-entry.ai { border-left-color: #2ecc71; }
        .log-meta { font-size: 0.9em; color: #7f8c8d; margin-bottom: 8px; }
        .log-text { margin: 10px 0; padding: 10px; background: #ecf0f1; border-radius: 4px; }
        .coordinates { font-family: monospace; font-size: 0.85em; color: #34495e; }
        .confidence { display: inline-block; padding: 2px 8px; border-radius: 3px; background: #2ecc71; color: white; font-size: 0.85em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Extraction Trace Log Report</h1>
        <p><strong>Session ID:</strong> ${this.sessionId}</p>
        <p><strong>User ID:</strong> ${this.userId}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <div class="stats">
            <div class="stat">Total Logs: ${this.logs.length}</div>
            <div class="stat">Extractions: ${extractionLogs.length}</div>
            <div class="stat">Manual: ${extractionLogs.filter(l => l.method === 'manual').length}</div>
            <div class="stat">AI: ${extractionLogs.filter(l => l.method?.includes('gemini')).length}</div>
        </div>
    </div>

    ${extractionLogs.map(log => `
    <div class="log-entry ${log.method === 'manual' ? 'manual' : 'ai'}">
        <div class="log-meta">
            <strong>${log.fieldName}</strong> • 
            ${new Date(log.timestamp).toLocaleString()} • 
            Page ${log.page} • 
            Method: ${log.method || 'unknown'}
            ${log.confidence ? `<span class="confidence">${Math.round(log.confidence * 100)}%</span>` : ''}
        </div>
        <div class="log-text">${log.text}</div>
        ${log.coordinates ? `
        <div class="coordinates">
            📍 Coordinates: x=${log.coordinates.x.toFixed(1)}, 
            y=${log.coordinates.y.toFixed(1)}, 
            w=${log.coordinates.width.toFixed(1)}, 
            h=${log.coordinates.height.toFixed(1)}
        </div>
        ` : ''}
    </div>
    `).join('')}
</body>
</html>
        `;

        return html;
    }

    /**
     * Download HTML audit report
     */
    downloadHTMLReport(): void {
        const html = this.generateHTMLReport();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-log-report-${this.sessionId}-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        this.logs = [];
        this.saveToStorage();
    }

    /**
     * Save logs to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
        } catch (error) {
            console.error('Failed to save trace logs to storage:', error);
        }
    }

    /**
     * Load logs from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.logs = JSON.parse(stored);
                console.log(`Loaded ${this.logs.length} trace logs from storage`);
            }
        } catch (error) {
            console.error('Failed to load trace logs from storage:', error);
            this.logs = [];
        }
    }
}

// Export singleton instance
const traceLogger = new TraceLogger();
export default traceLogger;
