/**
 * TableExtractor.ts
 *
 * Extracts tables from PDF using geometric detection algorithm.
 * Implements the methodology from pdf-data-extraction-guide.md
 *
 * Key technique: Tables aren't stored as tables in PDFs - they're just text
 * positioned to look like grids. This service reconstructs table structure by
 * analyzing text item positions (Y-clustering for rows, X-clustering for columns).
 */

interface TextItem {
    text: string
    x: number
    y: number
    width: number
    height: number
    fontName: string
}

interface BoundingBox {
    x: number
    y: number
    width: number
    height: number
}

interface ExtractedTable {
    id: string
    pageNum: number
    headers: string[]
    rows: string[][]
    rawGrid: string[][]
    columnPositions: number[]
    boundingBox: BoundingBox
    extractionMethod: string
}

class TableExtractor {
    /**
     * Extract all tables from a PDF page using geometric detection
     */
    async extractTablesFromPage(page: any, pageNum: number): Promise<ExtractedTable[]> {
        // Step 1: Get text with positions
        const textItems = await this.extractTextWithPositions(page)

        // Step 2: Group into rows
        const rows = this.groupItemsByRow(textItems)

        // Step 3: Detect table regions
        const tableRegions = this.detectTableRegions(rows)

        // Step 4: Convert to structured format
        const tables = tableRegions.map((region, idx) => {
            const structured = this.convertToStructuredTable(region)

            return {
                id: `table-${pageNum}-${idx + 1}`,
                pageNum,
                ...structured,
                extractionMethod: 'geometric_detection',
            }
        })

        return tables
    }

    /**
     * Step 1: Extract text items with coordinate data
     */
    private async extractTextWithPositions(page: any): Promise<TextItem[]> {
        const textContent = await page.getTextContent()
        const viewport = page.getViewport({ scale: 1.0 })

        return textContent.items.map((item: any) => ({
            text: item.str,
            x: item.transform[4],
            y: viewport.height - item.transform[5],  // Flip Y axis
            width: item.width,
            height: item.height,
            fontName: item.fontName,
        }))
    }

    /**
     * Step 2: Group text items into rows based on Y-coordinate
     * Items with similar Y values (within tolerance) belong to the same row
     */
    private groupItemsByRow(items: TextItem[], tolerance = 5): TextItem[][] {
        // Sort by Y coordinate
        const sorted = [...items].sort((a, b) => a.y - b.y)

        const rows: TextItem[][] = []
        let currentRow: TextItem[] = []
        let lastY = -Infinity

        sorted.forEach(item => {
            if (Math.abs(item.y - lastY) > tolerance) {
                // New row detected
                if (currentRow.length > 0) {
                    rows.push(currentRow.sort((a, b) => a.x - b.x))  // Sort by X
                }
                currentRow = [item]
                lastY = item.y
            } else {
                // Same row - add to current
                currentRow.push(item)
            }
        })

        // Don't forget the last row
        if (currentRow.length > 0) {
            rows.push(currentRow.sort((a, b) => a.x - b.x))
        }

        return rows
    }

    /**
     * Step 3: Detect column positions by clustering X coordinates
     * Items that align vertically (similar X positions) form columns
     */
    private detectColumnPositions(row: TextItem[], gapThreshold = 24): number[] {
        if (row.length === 0) return []

        const columns: number[] = []
        let currentCluster: TextItem[] = [row[0]]
        let lastRight = row[0].x + row[0].width

        for (let i = 1; i < row.length; i++) {
            const item = row[i]
            const gap = item.x - lastRight

            if (gap > gapThreshold) {
                columns.push(this.averageX(currentCluster))
                currentCluster = [item]
            } else {
                currentCluster.push(item)
            }

            lastRight = Math.max(lastRight, item.x + item.width)
        }

        columns.push(this.averageX(currentCluster))
        return columns.sort((a, b) => a - b)
    }

    private averageX(items: TextItem[]): number {
        if (items.length === 0) return 0
        const sum = items.reduce((total, item) => total + item.x, 0)
        return sum / items.length
    }

    /**
     * Step 4: Find table regions by detecting grid patterns
     * A table is: multiple consecutive rows with aligned columns
     */
    private detectTableRegions(rows: TextItem[][]): any[] {
        const tableRegions: any[] = []
        let currentTable: any = null

        rows.forEach((row, rowIndex) => {
            const columnPositions = this.detectColumnPositions(row)

            // Row heuristics
            const rowWidth = row.length ? (row[row.length - 1].x + row[row.length - 1].width) - row[0].x : 0
            const hasMultipleColumns = columnPositions.length >= 3
            const isWideEnough = rowWidth >= 150
            const hasDensity = row.length >= columnPositions.length
            const qualifiesAsTableRow = hasMultipleColumns && isWideEnough && hasDensity

            const alignsWithTable = currentTable &&
                this.alignsWithColumns(columnPositions, currentTable.columnPositions)

            if (alignsWithTable) {
                // Continue existing table
                currentTable.rows.push(row)
            } else if (qualifiesAsTableRow) {
                // Start new table
                if (currentTable && currentTable.rows.length >= 3) {
                    tableRegions.push(currentTable)
                }
                currentTable = {
                    startRow: rowIndex,
                    rows: [row],
                    columnPositions: columnPositions,
                }
            } else {
                // Not a table row - end current table if exists
                if (currentTable && currentTable.rows.length >= 3) {
                    tableRegions.push(currentTable)
                }
                currentTable = null
            }
        })

        // Don't forget the last table
        if (currentTable && currentTable.rows.length >= 3) {
            tableRegions.push(currentTable)
        }

        return tableRegions
    }

    /**
     * Check if column positions align with existing table columns
     * At least 80% of positions must align within tolerance
     */
    private alignsWithColumns(
        positions: number[],
        tableColumns: number[],
        tolerance = 15
    ): boolean {
        const aligned = positions.filter(pos =>
            tableColumns.some(col => Math.abs(pos - col) < tolerance)
        )

        return aligned.length >= positions.length * 0.8
    }

    /**
     * Step 5: Convert table region to structured grid format
     */
    private convertToStructuredTable(tableRegion: any): Omit<ExtractedTable, 'id' | 'pageNum' | 'extractionMethod'> {
        const rows = tableRegion.rows
        const columnPositions = tableRegion.columnPositions

        // Create empty grid
        const grid: string[][] = []

        rows.forEach(row => {
            const gridRow: string[] = new Array(columnPositions.length).fill('')

            row.forEach((item: TextItem) => {
                // Find which column this item belongs to
                const colIndex = this.findClosestColumn(item.x, columnPositions)

                // Concatenate text if multiple items in same cell
                gridRow[colIndex] = (gridRow[colIndex] + ' ' + item.text).trim()
            })

            grid.push(gridRow)
        })

        // First row is typically headers
        const headers = grid[0]
        const dataRows = grid.slice(1)

        const structured = {
            headers,
            rows: dataRows,
            rawGrid: grid,
            columnPositions,
            boundingBox: this.calculateBoundingBox(rows.flat()),
        }

        return structured
    }

    /**
     * Find the closest column index for a given X position
     */
    private findClosestColumn(x: number, columns: number[]): number {
        let minDist = Infinity
        let closestIdx = 0

        columns.forEach((col, idx) => {
            const dist = Math.abs(x - col)
            if (dist < minDist) {
                minDist = dist
                closestIdx = idx
            }
        })

        return closestIdx
    }

    /**
     * Calculate bounding box that encompasses all text items
     */
    private calculateBoundingBox(items: TextItem[]): BoundingBox {
        const xs = items.map(i => i.x)
        const ys = items.map(i => i.y)
        const rights = items.map(i => i.x + i.width)
        const bottoms = items.map(i => i.y + i.height)

        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...rights) - Math.min(...xs),
            height: Math.max(...bottoms) - Math.min(...ys),
        }
    }

    /**
     * Generate HTML table for preview/export
     */
    generateHTMLTable(table: ExtractedTable): string {
        let html = '<table class="extracted-table">'

        // Headers
        if (table.headers && table.headers.length > 0) {
            html += '<thead><tr>'
            table.headers.forEach((header: string) => {
                html += `<th>${header}</th>`
            })
            html += '</tr></thead>'
        }

        // Body
        html += '<tbody>'
        table.rows.forEach((row: string[]) => {
            html += '<tr>'
            row.forEach((cell: string) => {
                html += `<td>${cell}</td>`
            })
            html += '</tr>'
        })
        html += '</tbody></table>'

        return html
    }

    /**
     * Generate CSV for export
     */
    generateCSV(table: ExtractedTable): string {
        const escapeCSV = (cell: any) => {
            if (cell == null) return '""'
            const str = String(cell)
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return `"${str}"`
        }

        let csv = ''

        // Headers
        if (table.headers) {
            csv += table.headers.map(escapeCSV).join(',') + '\n'
        }

        // Rows
        table.rows.forEach((row: string[]) => {
            csv += row.map(escapeCSV).join(',') + '\n'
        })

        return csv
    }
}

// Export singleton instance
export default new TableExtractor()
export type { ExtractedTable, TextItem, BoundingBox }
