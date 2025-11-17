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
    private detectColumnPositions(row: TextItem[], tolerance = 10): number[] {
        const positions = row.map(item => item.x)

        // Cluster nearby X positions
        const clusters: number[][] = []

        positions.forEach(pos => {
            const existingCluster = clusters.find(cluster =>
                cluster.some(p => Math.abs(p - pos) < tolerance)
            )

            if (existingCluster) {
                existingCluster.push(pos)
            } else {
                clusters.push([pos])
            }
        })

        // Return average of each cluster (the column position)
        return clusters
            .map(cluster => cluster.reduce((sum, val) => sum + val, 0) / cluster.length)
            .sort((a, b) => a - b)
    }

    /**
     * Step 4: Find table regions by detecting grid patterns
     * A table is: multiple consecutive rows with aligned columns
     * 
     * Improved filtering to reduce false positives:
     * - Requires at least 2 columns (not 4) but with better validation
     * - Minimum 3 rows (unchanged)
     * - Row must have multiple distinct text items (not just spacing)
     * - Column alignment must be consistent across rows
     */
    private detectTableRegions(rows: TextItem[][]): any[] {
        const tableRegions: any[] = []
        let currentTable: any = null

        rows.forEach((row, rowIndex) => {
            // Filter out rows with too few items (likely not table rows)
            if (row.length < 2) {
                // End current table if exists
                if (currentTable && currentTable.rows.length >= 3) {
                    tableRegions.push(currentTable)
                }
                currentTable = null
                return
            }

            const columnPositions = this.detectColumnPositions(row)

            // Require at least 2 columns, but validate it's a real table structure
            // A real table should have multiple distinct text items aligned in columns
            const hasTableStructure = columnPositions.length >= 2 && 
                                     this.hasValidTableStructure(row, columnPositions)
            
            const alignsWithTable = currentTable &&
                this.alignsWithColumns(columnPositions, currentTable.columnPositions)

            if (alignsWithTable && hasTableStructure) {
                // Continue existing table
                currentTable.rows.push(row)
            } else if (hasTableStructure) {
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
     * Validate that a row has a valid table structure
     * Filters out false positives like:
     * - Single long text spans with accidental spacing
     * - Lists with bullets (not tables)
     * - Headers/footers with centered text
     */
    private hasValidTableStructure(row: TextItem[], columnPositions: number[]): boolean {
        // Must have at least 2 distinct text items
        if (row.length < 2) {
            return false
        }

        // Check that items are distributed across columns (not all in one column)
        const itemsPerColumn = new Map<number, number>()
        row.forEach(item => {
            const colIndex = this.findClosestColumn(item.x, columnPositions)
            itemsPerColumn.set(colIndex, (itemsPerColumn.get(colIndex) || 0) + 1)
        })

        // At least 2 columns should have items
        const columnsWithItems = Array.from(itemsPerColumn.keys()).length
        if (columnsWithItems < 2) {
            return false
        }

        // Filter out rows that are just single words with spacing (common false positive)
        // A real table row should have multiple distinct text segments
        const distinctTextSegments = new Set(row.map(item => item.text.trim()).filter(t => t.length > 0))
        if (distinctTextSegments.size < 2) {
            return false
        }

        // Check for list-like patterns (bullets, numbers) - these aren't tables
        const hasListPattern = row.some(item => 
            /^[\u2022\u2023\u25E6\u2043\u2219\-\*\d+\.\)]\s/.test(item.text.trim())
        )
        if (hasListPattern && row.length <= 3) {
            return false
        }

        return true
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

        return {
            headers,
            rows: dataRows,
            rawGrid: grid,
            columnPositions,
            boundingBox: this.calculateBoundingBox(rows.flat()),
        }
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
