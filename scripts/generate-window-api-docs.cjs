#!/usr/bin/env node
/**
 * Auto-generate Window API documentation from main.ts
 * This ensures the documentation stays in sync with the actual code
 */

const fs = require('fs');
const path = require('path');

const MAIN_TS_PATH = path.join(__dirname, '../src/main.ts');
const OUTPUT_PATH = path.join(__dirname, '../docs/WINDOW_API.md');

function parseWindowAPI() {
    const content = fs.readFileSync(MAIN_TS_PATH, 'utf-8');

    // Extract the window.ClinicalExtractor object
    const windowAPIMatch = content.match(/window\.ClinicalExtractor = \{([\s\S]*?)\};/);

    if (!windowAPIMatch) {
        throw new Error('Could not find window.ClinicalExtractor definition in main.ts');
    }

    const apiContent = windowAPIMatch[1];
    const lines = apiContent.split('\n');

    const categories = {};
    let currentCategory = 'Uncategorized';

    for (const line of lines) {
        // Check for category comments
        const categoryMatch = line.match(/\/\/\s*(.+?)\s*\((\d+)\)/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1];
            categories[currentCategory] = {
                count: parseInt(categoryMatch[2]),
                items: []
            };
            continue;
        }

        // Extract function/service names
        const itemMatch = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),?\s*$/);
        if (itemMatch) {
            if (!categories[currentCategory]) {
                categories[currentCategory] = { count: 0, items: [] };
            }
            categories[currentCategory].items.push(itemMatch[1]);
        }
    }

    return categories;
}

function generateMarkdown(categories) {
    let markdown = `# Window API Reference

**Auto-generated from \`src/main.ts\`**
Last updated: ${new Date().toISOString().split('T')[0]}

The Clinical Extractor exposes ${getTotalCount(categories)} functions and services via \`window.ClinicalExtractor\` for use in HTML onclick handlers.

## Summary

`;

    // Table of contents
    for (const [category, data] of Object.entries(categories)) {
        markdown += `- **${category}** (${data.items.length}): ${data.items.join(', ')}\n`;
    }

    markdown += '\n## Detailed Reference\n\n';

    // Detailed sections
    for (const [category, data] of Object.entries(categories)) {
        markdown += `### ${category} (${data.items.length})\n\n`;
        for (const item of data.items) {
            markdown += `- \`${item}\`\n`;
        }
        markdown += '\n';
    }

    markdown += `\n## Usage\n\n`;
    markdown += '```html\n';
    markdown += '<button onclick="generatePICO()">Generate PICO</button>\n';
    markdown += '<!-- Automatically resolved to window.ClinicalExtractor.generatePICO() -->\n';
    markdown += '```\n\n';

    markdown += '```javascript\n';
    markdown += '// Also accessible via window object\n';
    markdown += 'generatePICO();\n';
    markdown += '// or\n';
    markdown += 'window.ClinicalExtractor.generatePICO();\n';
    markdown += '```\n';

    return markdown;
}

function getTotalCount(categories) {
    return Object.values(categories).reduce((sum, cat) => sum + cat.items.length, 0);
}

function main() {
    try {
        console.log('Parsing Window API from main.ts...');
        const categories = parseWindowAPI();

        console.log(`Found ${getTotalCount(categories)} items in ${Object.keys(categories).length} categories`);

        const markdown = generateMarkdown(categories);

        // Ensure docs directory exists
        const docsDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_PATH, markdown);
        console.log(`✓ Window API documentation generated: ${OUTPUT_PATH}`);

        // Also output a summary for CLAUDE.md
        const summary = `## Window API (${getTotalCount(categories)} Functions & Services)\n\n`;
        console.log('\n--- Copy this to CLAUDE.md ---\n');
        console.log(summary);
        for (const [category, data] of Object.entries(categories)) {
            console.log(`- **${category} (${data.items.length}):** ${data.items.join(', ')}`);
        }
        console.log('\n--- End ---\n');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
