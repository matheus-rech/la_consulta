# Window API Reference

**Auto-generated from `src/main.ts`**
Last updated: 2026-05-16

The Clinical Extractor exposes 46 functions and services via `window.ClinicalExtractor` for use in HTML onclick handlers.

## Summary

- **Helper Functions** (6): calculateBoundingBox, addExtractionMarker, addExtractionMarkersForPage, autoAdvanceField, clearSearchMarkers, blobToBase64
- **Field Management Functions** (9): addIndication, addIntervention, addArm, addMortality, addMRS, addComplication, addPredictor, removeElement, updateArmSelectors
- **AI Functions** (7): generatePICO, generateSummary, validateFieldWithAI, findMetadata, handleExtractTables, handleImageAnalysis, handleDeepAnalysis
- **Export Functions** (5): exportJSON, exportCSV, exportExcel, exportAudit, exportAnnotatedPDF
- **Search Functions** (2): toggleSearchInterface, searchInPDF
- **New: Figure/Table Extraction & Visualization** (4): extractFiguresFromPDF, extractTablesFromPDF, toggleBoundingBoxes, toggleTableRegions
- **New: Multi-Agent Pipeline** (13): runFullAIPipeline, SemanticSearchService, AnnotationService, BackendProxyService, SamplePDFService, toggleSemanticSearch, performSemanticSearch, jumpToPage, toggleAnnotationTools, setAnnotationTool, configureBackendProxy, triggerCrashStateSave, triggerManualRecovery

## Detailed Reference

### Helper Functions (6)

- `calculateBoundingBox`
- `addExtractionMarker`
- `addExtractionMarkersForPage`
- `autoAdvanceField`
- `clearSearchMarkers`
- `blobToBase64`

### Field Management Functions (9)

- `addIndication`
- `addIntervention`
- `addArm`
- `addMortality`
- `addMRS`
- `addComplication`
- `addPredictor`
- `removeElement`
- `updateArmSelectors`

### AI Functions (7)

- `generatePICO`
- `generateSummary`
- `validateFieldWithAI`
- `findMetadata`
- `handleExtractTables`
- `handleImageAnalysis`
- `handleDeepAnalysis`

### Export Functions (5)

- `exportJSON`
- `exportCSV`
- `exportExcel`
- `exportAudit`
- `exportAnnotatedPDF`

### Search Functions (2)

- `toggleSearchInterface`
- `searchInPDF`

### New: Figure/Table Extraction & Visualization (4)

- `extractFiguresFromPDF`
- `extractTablesFromPDF`
- `toggleBoundingBoxes`
- `toggleTableRegions`

### New: Multi-Agent Pipeline (13)

- `runFullAIPipeline`
- `SemanticSearchService`
- `AnnotationService`
- `BackendProxyService`
- `SamplePDFService`
- `toggleSemanticSearch`
- `performSemanticSearch`
- `jumpToPage`
- `toggleAnnotationTools`
- `setAnnotationTool`
- `configureBackendProxy`
- `triggerCrashStateSave`
- `triggerManualRecovery`


## Usage

```html
<button onclick="generatePICO()">Generate PICO</button>
<!-- Automatically resolved to window.ClinicalExtractor.generatePICO() -->
```

```javascript
// Also accessible via window object
generatePICO();
// or
window.ClinicalExtractor.generatePICO();
```
