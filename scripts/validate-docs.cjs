#!/usr/bin/env node
/**
 * Validate numeric counts in CLAUDE.md against actual codebase
 * Prevents documentation drift
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');

function countTypeScriptFiles() {
    const result = execSync('find src -type f -name "*.ts" ! -name "*.d.ts" | wc -l', { cwd: ROOT });
    return parseInt(result.toString().trim());
}

function countLinesInFile(filePath) {
    const result = execSync(`wc -l "${filePath}" | awk '{print $1}'`, { cwd: ROOT });
    return parseInt(result.toString().trim());
}

function countTestFiles() {
    const unitTests = execSync('find tests/unit -type f -name "*.test.ts" | wc -l', { cwd: ROOT }).toString().trim();
    const e2eTests = execSync('find tests/e2e -type f -name "*.test.ts" | wc -l', { cwd: ROOT }).toString().trim();
    return {
        unit: parseInt(unitTests),
        e2e: parseInt(e2eTests),
        total: parseInt(unitTests) + parseInt(e2eTests)
    };
}

function countServices() {
    const result = execSync('ls -1 src/services/*.ts | wc -l', { cwd: ROOT });
    return parseInt(result.toString().trim());
}

function countUtilities() {
    const result = execSync('ls -1 src/utils/*.ts | wc -l', { cwd: ROOT });
    return parseInt(result.toString().trim());
}

function countWindowAPIFunctions() {
    const mainTs = fs.readFileSync(path.join(ROOT, 'src/main.ts'), 'utf-8');
    const windowAPIMatch = mainTs.match(/window\.ClinicalExtractor = \{([\s\S]*?)\};/);

    if (!windowAPIMatch) return 0;

    const apiContent = windowAPIMatch[1];
    const items = apiContent.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*,?\s*$/gm);

    return items ? items.length : 0;
}

function countMarkdownDocs() {
    const result = execSync('find . -name "*.md" ! -path "./node_modules/*" ! -path "./backend/poetry.lock" | wc -l', { cwd: ROOT });
    return parseInt(result.toString().trim());
}

function readClaudeMarkdown() {
    return fs.readFileSync(CLAUDE_MD, 'utf-8');
}

function extractClaimedCounts(claudeMd) {
    const claims = {};

    // Extract claimed module count
    const moduleMatch = claudeMd.match(/\*\*Total Modules:\*\* (\d+)/);
    if (moduleMatch) claims.modules = parseInt(moduleMatch[1]);

    // Extract claimed main.ts lines
    const mainLinesMatch = claudeMd.match(/main\.ts.*?(\d+) lines/);
    if (mainLinesMatch) claims.mainLines = parseInt(mainLinesMatch[1]);

    // Extract claimed Window API count
    const windowAPIMatch = claudeMd.match(/Window API \((\d+)\+? Functions/);
    if (windowAPIMatch) claims.windowAPI = parseInt(windowAPIMatch[1]);

    // Extract claimed test count
    const testMatch = claudeMd.match(/(\d+) test files \((\d+) unit \+ (\d+) e2e\)/);
    if (testMatch) {
        claims.testFiles = {
            total: parseInt(testMatch[1]),
            unit: parseInt(testMatch[2]),
            e2e: parseInt(testMatch[3])
        };
    }

    return claims;
}

function validate() {
    console.log('🔍 Validating CLAUDE.md against codebase...\n');

    const actual = {
        modules: countTypeScriptFiles(),
        mainLines: countLinesInFile('src/main.ts'),
        windowAPI: countWindowAPIFunctions(),
        testFiles: countTestFiles(),
        services: countServices(),
        utils: countUtilities(),
        docs: countMarkdownDocs()
    };

    const claudeMd = readClaudeMarkdown();
    const claimed = extractClaimedCounts(claudeMd);

    console.log('📊 Actual Counts:');
    console.log(`  TypeScript Modules: ${actual.modules}`);
    console.log(`  main.ts Lines: ${actual.mainLines}`);
    console.log(`  Window API Functions: ${actual.windowAPI}`);
    console.log(`  Test Files: ${actual.testFiles.total} (${actual.testFiles.unit} unit + ${actual.testFiles.e2e} e2e)`);
    console.log(`  Services: ${actual.services}`);
    console.log(`  Utilities: ${actual.utils}`);
    console.log(`  Markdown Docs: ${actual.docs}`);

    console.log('\n📝 Claimed in CLAUDE.md:');
    console.log(`  TypeScript Modules: ${claimed.modules || 'NOT FOUND'}`);
    console.log(`  main.ts Lines: ${claimed.mainLines || 'NOT FOUND'}`);
    console.log(`  Window API Functions: ${claimed.windowAPI || 'NOT FOUND'}+`);
    if (claimed.testFiles) {
        console.log(`  Test Files: ${claimed.testFiles.total} (${claimed.testFiles.unit} unit + ${claimed.testFiles.e2e} e2e)`);
    }

    // Validation
    const errors = [];
    const warnings = [];

    if (claimed.modules && claimed.modules !== actual.modules) {
        errors.push(`Module count mismatch: claimed ${claimed.modules}, actual ${actual.modules}`);
    }

    if (claimed.mainLines && Math.abs(claimed.mainLines - actual.mainLines) > 10) {
        warnings.push(`main.ts line count drift: claimed ${claimed.mainLines}, actual ${actual.mainLines}`);
    }

    if (claimed.windowAPI && claimed.windowAPI < actual.windowAPI - 5) {
        errors.push(`Window API count outdated: claimed ${claimed.windowAPI}+, actual ${actual.windowAPI}`);
    }

    if (claimed.testFiles && claimed.testFiles.total !== actual.testFiles.total) {
        errors.push(`Test count mismatch: claimed ${claimed.testFiles.total}, actual ${actual.testFiles.total}`);
    }

    console.log('\n');

    if (errors.length > 0) {
        console.log('❌ Errors:');
        errors.forEach(err => console.log(`  - ${err}`));
    }

    if (warnings.length > 0) {
        console.log('⚠️  Warnings:');
        warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All counts validated successfully!');
    }

    console.log('\n💡 Suggestions:');
    console.log(`  - Update Window API to: "Window API (${actual.windowAPI} Functions & Services)"`);
    console.log(`  - Update module count to: ${actual.modules}`);
    console.log(`  - Update main.ts lines to: ${actual.mainLines}`);

    process.exit(errors.length > 0 ? 1 : 0);
}

validate();
