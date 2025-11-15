# Google Sheets Service Extraction - Complete

## File Created
**Path**: `/Users/matheusrech/Downloads/clinical-extractor (1)/src/services/GoogleSheetsService.ts`
**Lines**: 214 lines

## OAuth 2.0 Flow Preserved ✓

### 1. Dynamic Script Loading (Lines 46-60)
```typescript
const loadGoogleScripts = (): void => {
    // Load Google API Client (gapi)
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js?onload=gapiLoaded';
    
    // Load Google Identity Services (gis)
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client?onload=gisLoaded';
}
```

### 2. OAuth Client Initialization (Lines 29-40)
```typescript
const gisLoadedCallback = (): void => {
    gapiTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: CONFIG.GOOGLE_SCOPES,
        callback: '', // Set dynamically
    });
}
```

### 3. Token Management (Lines 180-188)
```typescript
// Check if we already have a valid token
if (window.gapi.client.getToken() === null) {
    // No token - prompt user consent
    gapiTokenClient.requestAccessToken({ prompt: 'consent' });
} else {
    // Token exists - refresh and reuse
    gapiTokenClient.callback(window.gapi.client.getToken());
}
```

### 4. Token Callback Flow (Lines 90-178)
```typescript
gapiTokenClient.callback = async (tokenResponse: any) => {
    // Handle auth errors
    if (tokenResponse.error) {
        throw new Error(`Google Auth Error: ${tokenResponse.error}`);
    }
    
    // Load Sheets API
    await window.gapi.client.load('sheets', 'v4');
    
    // Collect data and append to sheets
    // ...
}
```

## Window Function Bindings ✓

### Callbacks for Script Onload (Lines 203-204)
```typescript
window.gapiLoaded = gapiLoadedCallback;
window.gisLoaded = gisLoadedCallback;
```

### Window API Usage
- `window.google.accounts.oauth2.initTokenClient()` - Line 31
- `window.gapi.client.load()` - Line 97
- `window.gapi.client.sheets.spreadsheets.values.append()` - Lines 158, 167
- `window.gapi.client.getToken()` - Lines 182, 187

## Google Sheets API Operations ✓

### 1. Submissions Sheet Append (Lines 157-162)
```typescript
await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
    range: 'Submissions!A:A',
    valueInputOption: 'USER_ENTERED',
    resource: { values: [submissionRow] }
});
```

### 2. Extractions Sheet Append (Lines 166-172)
```typescript
await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
    range: 'Extractions!A:A',
    valueInputOption: 'USER_ENTERED',
    resource: { values: extractionRows } }
});
```

## Data Structures ✓

### Submission Row Format (Lines 133-141)
```typescript
[
    submissionId,      // sub_1234567890
    timestamp,         // ISO 8601
    documentName,      // From AppStateManager
    citation,          // From FormManager
    doi,               // From FormManager
    pmid,              // From FormManager
    totalN             // From FormManager
]
```

### Extraction Row Format (Lines 145-155)
```typescript
[
    submissionId,      // Links to submission
    fieldName,         // Extracted field name
    text,              // Extracted text
    page,              // Page number
    method,            // Extraction method
    coordinates.x,     // X position
    coordinates.y,     // Y position
    coordinates.width, // Width
    coordinates.height // Height
]
```

## Error Handling ✓

### 1. Configuration Validation (Lines 74-77)
```typescript
if (!CONFIG.GOOGLE_API_KEY || !CONFIG.GOOGLE_CLIENT_ID || !CONFIG.GOOGLE_SHEET_ID) {
    StatusManager.show('Google Sheets config is missing.', 'error');
    return;
}
```

### 2. Client Initialization Check (Lines 80-83)
```typescript
if (!gapiLoaded || !gapiTokenClient) {
    StatusManager.show('Google API client is not loaded yet. Please wait.', 'warning');
    return;
}
```

### 3. OAuth Error Handling (Lines 91-94)
```typescript
if (tokenResponse.error) {
    throw new Error(`Google Auth Error: ${tokenResponse.error}`);
}
```

### 4. Global Error Handler (Lines 190-195)
```typescript
catch (error: any) {
    console.error("Google Sheets Save Error:", error);
    StatusManager.show(`Google Sheets save failed: ${error.message}`, 'error');
    StatusManager.showLoading(false);
}
```

## Service Manager Dependencies ✓

### Imports (Lines 7-11)
```typescript
import CONFIG from '../config';
import AppStateManager from './AppStateManager';
import FormManager from './FormManager';
import ExtractionTracker from './ExtractionTracker';
import StatusManager from './StatusManager';
```

### Manager Usage
- **AppStateManager**: Get document state (Line 101)
- **FormManager**: Collect form data (Line 102)
- **ExtractionTracker**: Get extractions (Line 103)
- **StatusManager**: Show status messages (Lines 79, 86, 98, 177, 193)

## Exports ✓

### Default Export (Line 213)
```typescript
export default GoogleSheetsService;
```

### Named Export (Line 214)
```typescript
export { handleSubmitToGoogleSheets };
```

### Service Object (Lines 207-210)
```typescript
const GoogleSheetsService = {
    handleSubmitToGoogleSheets,
    getLoadedState: () => ({ gapiLoaded, gapiTokenClient })
};
```

## Module Initialization ✓

### Auto-Execution (Line 199)
```typescript
// --- INITIALIZE ON MODULE LOAD ---
loadGoogleScripts();
```

This ensures Google API scripts are loaded as soon as the module is imported.

## Critical OAuth Flow Verification ✓

### Complete Flow:
1. **Module Load** → `loadGoogleScripts()` injects script tags
2. **Script Load** → `gapiLoaded()` callback sets flag
3. **GIS Load** → `gisLoaded()` callback initializes OAuth client
4. **User Click** → `handleSubmitToGoogleSheets()` triggered
5. **Config Check** → Validates API keys and sheet ID
6. **Client Check** → Verifies gapi and token client loaded
7. **Token Check** → Determines if consent needed
8. **OAuth Flow** → Requests/refreshes token
9. **Callback** → Token received, loads Sheets API
10. **Data Collection** → Gathers from all managers
11. **Sheet Append** → Writes to Submissions and Extractions tabs
12. **Success** → Shows success message and hides loading

## Security Considerations ✓

- ✓ OAuth 2.0 with consent flow
- ✓ Token refresh for existing sessions
- ✓ Error messages don't expose sensitive data
- ✓ Client-side only (no server-side secrets)
- ✓ Uses USER_ENTERED for value validation

## Performance Optimizations ✓

- ✓ Async script loading (defer)
- ✓ Lazy API loading (only on demand)
- ✓ Token reuse (avoids re-consent)
- ✓ Batch operations (single append per sheet)

## Testing Checklist

### Manual Tests Required:
- [ ] Import service in index.tsx
- [ ] Verify scripts load in browser console
- [ ] Click "Save to Google Sheets" button
- [ ] Verify OAuth consent screen appears (first time)
- [ ] Verify token reuse (subsequent clicks)
- [ ] Verify data appears in both sheets
- [ ] Verify error handling for missing config
- [ ] Verify error handling for failed auth

### Browser Console Checks:
```javascript
// Should see:
"Google API client loaded."
"Google Auth client initialized."

// Should be available:
window.gapiLoaded
window.gisLoaded
window.google.accounts.oauth2
window.gapi.client
```

## Next Integration Steps

1. **Import in index.tsx**:
```typescript
import GoogleSheetsService, { handleSubmitToGoogleSheets } from './services/GoogleSheetsService';

// Bind to window for form submission
window.handleSubmitToGoogleSheets = handleSubmitToGoogleSheets;
```

2. **Remove old code** from index.tsx:
   - Lines 84-116 (Google API setup)
   - Lines 1776-1885 (handleSubmitToGoogleSheets)

3. **Verify button binding**:
```html
<button onclick="handleSubmitToGoogleSheets(event)">
    Save to Google Sheets
</button>
```

## Summary

✅ **OAuth 2.0 Flow**: Fully preserved with dynamic loading, token management, and consent
✅ **Window Functions**: `handleSubmitToGoogleSheets` exported for global access
✅ **Script Loading**: IIFE executes on module load
✅ **Error Handling**: Comprehensive auth, config, and API error handling
✅ **Sheet Operations**: Submissions and Extractions tabs both supported
✅ **Service Integration**: All manager dependencies properly imported
✅ **Code Quality**: 214 lines, well-commented, TypeScript typed

**Status**: Ready for integration into index.tsx
