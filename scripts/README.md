# Documentation Scripts

Automated tools to keep documentation in sync with the codebase and prevent drift.

## Available Scripts

### 📝 generate-window-api-docs.cjs

**Purpose:** Auto-generate Window API documentation from `src/main.ts`

**Usage:**
```bash
npm run docs:api
```

**What it does:**
- Parses `window.ClinicalExtractor` object from `main.ts`
- Extracts all exposed functions and services
- Categorizes them based on code comments
- Generates `docs/WINDOW_API.md` with complete reference
- Outputs summary for CLAUDE.md

**Output:**
- `docs/WINDOW_API.md` - Complete Window API reference
- Console output with categorized function list

### ✅ validate-docs.cjs

**Purpose:** Validate numeric counts in CLAUDE.md against actual codebase

**Usage:**
```bash
npm run docs:validate
```

**What it validates:**
- TypeScript module count (should match `find src -name "*.ts"`)
- `main.ts` line count (should be within ±10 lines)
- Window API function count (should match actual exports)
- Test file count (unit + e2e)
- Service count
- Utility count
- Markdown documentation count

**Exit codes:**
- `0` - All validations passed
- `1` - Errors found (documentation is outdated)

**Example output:**
```
🔍 Validating CLAUDE.md against codebase...

📊 Actual Counts:
  TypeScript Modules: 33
  main.ts Lines: 947
  Window API Functions: 46
  Test Files: 7 (6 unit + 1 e2e)

❌ Errors:
  - Window API count outdated: claimed 40+, actual 46

💡 Suggestions:
  - Update Window API to: "Window API (46 Functions & Services)"
```

### 🔄 Combined Check

**Usage:**
```bash
npm run docs:check
```

**What it does:**
1. Runs `docs:validate` to check for drift
2. Runs `docs:api` to regenerate Window API docs

Use this before committing documentation changes.

## Integration with CI/CD

Add to your CI pipeline to prevent documentation drift:

```yaml
# .github/workflows/docs.yml
name: Documentation Check

on: [pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run docs:validate
```

## Maintenance

These scripts are designed to be **zero-maintenance**:
- They parse actual code structure
- No hardcoded values
- Self-documenting output
- Fail-fast on errors

If the scripts fail, it means the documentation needs updating, not the scripts.

## Why This Matters

**Problem:** Manual documentation drifts from reality
- Someone adds a function but forgets to update docs
- Counts become outdated over time
- AI assistants get wrong information

**Solution:** Auto-generate and validate
- ✅ Documentation always matches code
- ✅ CI catches drift before merge
- ✅ Zero maintenance overhead
- ✅ Trustworthy numbers

## Adding New Validations

To add a new validation check:

1. Add a counting function to `validate-docs.cjs`:
```javascript
function countNewThing() {
    const result = execSync('your command here', { cwd: ROOT });
    return parseInt(result.toString().trim());
}
```

2. Add to the `actual` object in `validate()`:
```javascript
const actual = {
    newThing: countNewThing(),
    // ... existing counts
};
```

3. Add extraction logic for claimed count:
```javascript
const newThingMatch = claudeMd.match(/Your Pattern: (\d+)/);
if (newThingMatch) claims.newThing = parseInt(newThingMatch[1]);
```

4. Add validation logic:
```javascript
if (claimed.newThing && claimed.newThing !== actual.newThing) {
    errors.push(`New thing mismatch: claimed ${claimed.newThing}, actual ${actual.newThing}`);
}
```

## License

Apache-2.0 (same as project)
