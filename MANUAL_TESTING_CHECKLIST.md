# Manual Testing Checklist - Frontend Features

## Prerequisites

1. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Server should start on `http://localhost:5173` (or port shown in terminal)

2. **Load Test PDF:**
   - Use `public/Kim2016.pdf` (9-page sample document)
   - Click "📄 Load PDF" button or drag-and-drop

3. **Open Browser DevTools:**
   - Press F12 or Right-click → Inspect
   - Go to Console tab for error checking
   - Go to Network tab to monitor API calls

---

## ✅ Feature 1: Table Extraction False Positives Fix

### Test Steps:
1. Load `Kim2016.pdf`
2. Click "📊 Tables" button in extraction toolbar
3. Check browser console for extraction results

### Expected Results:
- ✅ Should detect **0-5 tables** (NOT 65+)
- ✅ Only valid tables with 4+ rows and 2+ columns
- ✅ Single-word rows filtered out
- ✅ Console shows: `Page X: Y tables` (where Y ≤ 5)

### Screenshot:
- Take screenshot of console output showing table count
- Take screenshot of PDF with table regions highlighted (if toggle enabled)

---

## ✅ Feature 2: Search Highlighting Integration

### Test Steps:
1. Load `Kim2016.pdf`
2. Click "🔍 Search" button in services toolbar
3. Enter search query: `"mortality"` or `"decompressive"`
4. Click "Search" button
5. Navigate between pages using Next/Previous buttons

### Expected Results:
- ✅ Search results appear in semantic search panel
- ✅ Yellow highlights appear on PDF for matching text
- ✅ Highlights persist when navigating pages
- ✅ Clicking a result jumps to that page and highlights it
- ✅ "Clear" button removes all highlights

### Screenshot:
- Take screenshot showing search results panel with highlighted text
- Take screenshot showing PDF with yellow highlights visible

---

## ✅ Feature 3: Annotation Tools Integration

### Test Steps:
1. Load `Kim2016.pdf`
2. Click "✏️ Annotate" button in services toolbar
3. Select annotation tool (e.g., "🖍️ Highlight")
4. Select color (e.g., Yellow)
5. Click and drag on PDF to create annotation
6. Try different tools: Note, Rectangle, Circle, Arrow, Freehand
7. Refresh page (F5)

### Expected Results:
- ✅ Annotation toolbar appears when "Annotate" clicked
- ✅ Cursor changes to crosshair/pointer based on tool
- ✅ Annotations appear immediately when drawn
- ✅ Annotations persist after page refresh
- ✅ Different annotation types work correctly
- ✅ Color selection works

### Screenshot:
- Take screenshot showing annotation toolbar
- Take screenshot showing PDF with multiple annotations (highlight, note, rectangle)

---

## ✅ Feature 4: Provenance Export Button

### Test Steps:
1. Load `Kim2016.pdf`
2. Perform some extractions (manual or AI)
3. Scroll to "Export Options" section in trace panel
4. Click "🔗 Provenance" button

### Expected Results:
- ✅ Button exists in export section
- ✅ Clicking button downloads JSON file
- ✅ Downloaded file contains:
  - Document metadata
  - Text chunks with coordinates
  - Tables with bounding boxes
  - Figures with bounding boxes
  - Citations with sentence-level provenance

### Screenshot:
- Take screenshot showing export buttons section with Provenance button
- Take screenshot of downloaded JSON file (first few lines)

---

## ✅ Feature 5: Trace Log Display

### Test Steps:
1. Load `Kim2016.pdf`
2. Perform manual extraction: Click a form field, select text in PDF
3. Run AI extraction: Click "✨ Generate PICO-T Summary"
4. Check trace log panel (right side)

### Expected Results:
- ✅ Each extraction creates a trace log entry
- ✅ Entries show:
  - Field name (bold)
  - Extracted text preview
  - Method badge (manual = green border, gemini = purple border)
  - Timestamp and page number
- ✅ Clicking entry highlights source in PDF (if coordinates available)
- ✅ Entries persist after page refresh

### Screenshot:
- Take screenshot showing trace log with multiple entries
- Show both manual (green) and AI (purple) entries

---

## ✅ Feature 6: Bounding Box Overlay Toggle

### Test Steps:
1. Load `Kim2016.pdf`
2. Perform some extractions (manual or AI)
3. Click "🔲 Provenance" button in visualization toolbar
4. Observe PDF canvas
5. Click "🔲 Provenance" again to toggle off

### Expected Results:
- ✅ First click: Bounding boxes appear around all text items
- ✅ Color coding:
  - Red boxes: Manual extractions
  - Green boxes: AI extractions
  - Blue boxes: Standard text
- ✅ Second click: Bounding boxes disappear
- ✅ Toggle state persists when navigating pages

### Screenshot:
- Take screenshot showing PDF with bounding boxes visible
- Show color-coded boxes (red/green/blue)

---

## ✅ Feature 7: LRU Cache Integration (Background)

### Test Steps:
1. Load `Kim2016.pdf`
2. Open DevTools Console
3. Navigate through pages multiple times
4. Watch console for cache eviction messages

### Expected Results:
- ✅ No console errors
- ✅ After 50+ pages accessed, see: `LRU Cache: Evicted page X`
- ✅ Application remains responsive

### Verification:
- Check `AppStateManager.getState().pdfTextCache.size()` in console
- Should never exceed 50

---

## ✅ Feature 8: Circuit Breaker Integration (Background)

### Test Steps:
1. Load `Kim2016.pdf`
2. Disconnect internet or stop backend server
3. Try AI function: Click "✨ Generate PICO-T Summary"
4. Try multiple times (5+ failures)
5. Reconnect internet / restart backend
6. Try AI function again

### Expected Results:
- ✅ First few attempts: Show error messages
- ✅ After 5 failures: Circuit breaker opens, immediate rejection
- ✅ Error message mentions circuit breaker state
- ✅ After timeout (60s) or backend recovery: Attempts resume
- ✅ After 2 successes: Circuit closes, normal operation

### Verification:
- Check console for circuit breaker state messages
- Look for: "Circuit breaker: Transitioning to OPEN" and "CLOSED (recovered)"

---

## Complete Workflow Test

### End-to-End Scenario:
1. **Load PDF:** `Kim2016.pdf`
2. **Extract Tables:** Click "📊 Tables" → Verify 0-5 tables detected
3. **Search:** Enter "mortality" → Verify highlights appear
4. **Annotate:** Draw highlight on important text
5. **AI Extraction:** Click "✨ Generate PICO-T Summary"
6. **Verify Trace Log:** Check entries appear with correct styling
7. **Toggle Bounding Boxes:** Enable → Verify color-coded boxes
8. **Export Provenance:** Click "🔗 Provenance" → Verify JSON download
9. **Navigate Pages:** Use Next/Previous → Verify highlights/annotations persist
10. **Refresh Page:** F5 → Verify annotations and extractions restored

### Expected Overall Result:
- ✅ All features work together seamlessly
- ✅ No console errors
- ✅ UI remains responsive
- ✅ Data persists across page refreshes

---

## Screenshots Required

Please capture **2-3 screenshots** showing:

1. **Screenshot 1:** PDF with search highlights + annotations visible
   - Show yellow search highlights
   - Show annotation (highlight/note)
   - Show trace log panel with entries

2. **Screenshot 2:** Bounding boxes toggle enabled
   - Show color-coded bounding boxes (red/green/blue)
   - Show table regions if detected

3. **Screenshot 3:** Export section with Provenance button
   - Show all export buttons including "🔗 Provenance"
   - Show trace log with extraction entries

---

## Known Issues / Notes

### Test Environment Limitations:
- ⚠️ Screenshots cannot be captured in headless environment
- ⚠️ Manual browser testing required for UI verification
- ⚠️ Some TypeScript errors remain in test files (non-blocking)

### Figure Extraction UX:
- ⚠️ Figure detection logic matches previous implementation
- ⚠️ UX wiring complete, but detection algorithm unchanged
- ✅ Figure extraction button works and displays results

### Next Steps:
1. ✅ Run `npm run dev` locally
2. ✅ Load `public/Kim2016.pdf`
3. ✅ Exercise all 6 features
4. ✅ Capture 2-3 screenshots
5. ✅ Verify no console errors
6. ✅ Test data persistence (refresh page)

---

## Quick Test Commands

```bash
# Type check (should show 0 production errors)
npm run lint

# Run E2E tests (should pass 18/18)
npm test -- tests/e2e/frontend-features-comprehensive.test.ts

# Start dev server
npm run dev

# Build for production
npm run build
```

---

**Status:** ✅ All 6 Frontend Features Implemented  
**Testing:** ⏸️ Manual browser testing required  
**Screenshots:** 📸 Capture 2-3 screenshots in browser
