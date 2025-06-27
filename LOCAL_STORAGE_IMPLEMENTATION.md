# 💾 Session Local Storage Implementation

## Overview

This implementation provides automatic session data persistence to prevent data loss during Chrome reloads, browser crashes, or unexpected page refreshes. The system automatically saves analysis data, transcripts, and session state to localStorage and restores it when the page reloads.

## 🚀 Features

### ✅ Automatic Data Persistence

- **Auto-save every 5 seconds** when session is active
- **Force save** before critical operations (finalizing reports, navigation)
- **Immediate save** on component destruction/page unload
- **Session restoration** on page load if data exists

### 🧹 Automatic Cleanup

- **Maintenance cleanup** on app startup (removes expired sessions)
- **Session expiration** after 24 hours (configurable)
- **Orphaned data cleanup** (removes data without valid session index)
- **Manual cleanup** via "End Session" button

### 🔄 Smart Data Management

- **Gradual analysis refinement** preserved across reloads
- **Real-time transcript history** maintained
- **View state restoration** (start/analysis/report)
- **Model configuration** persistence

### 🎯 User Experience

- **Visual notification** when data is restored from localStorage
- **Session management controls** in the UI
- **Debug/testing utilities** available in console
- **Confirmation dialogs** for destructive operations

## 📁 File Structure

```
src/lib/session/
├── local-storage.ts          # Core local storage service
└── ... (existing session files)

src/routes/med/p/[profile]/session/
├── +page.svelte              # Updated with local storage integration
└── +page.ts                  # SSR configuration (disables SSR)

src/components/profile/Session/
└── Diagnosis.svelte          # Updated with type fixes
```

## 🛠️ Implementation Details

### SSR Configuration (`src/routes/med/p/[profile]/session/+page.ts`)

The session page disables SSR (Server-Side Rendering) because it relies heavily on browser-only APIs:

```typescript
export const ssr = false; // Disable server-side rendering
export const csr = true; // Enable client-side rendering
export const prerender = false; // Disable prerendering
```

**Why disable SSR?**

- **localStorage access**: Session persistence requires browser storage
- **Microphone access**: Audio recording only works in browser
- **Real-time connections**: WebSocket/SSE connections are browser-only
- **DOM manipulation**: Audio visualizations need DOM access
- **Performance**: Avoid hydration overhead for dynamic content

### Core Service (`src/lib/session/local-storage.ts`)

The `SessionLocalStorage` class provides:

```typescript
export class SessionLocalStorage {
  // Save session data to localStorage
  saveSession(sessionId: string, data: Partial<StoredSessionData>): void;

  // Load session data from localStorage
  loadSession(sessionId: string): StoredSessionData | null;

  // Remove session data
  removeSession(sessionId: string): void;

  // Set up automatic saving
  setupAutoSave(
    sessionId: string,
    dataGetter: () => Partial<StoredSessionData>,
  ): () => void;

  // Perform maintenance cleanup
  performMaintenanceCleanup(): void;

  // Clear all stored sessions
  clearAllSessions(): void;
}
```

### Session Page Integration

The session page (`+page.svelte`) has been updated with:

```typescript
// Local storage variables
let autoSaveCleanup: (() => void) | null = null;
let hasRestoredData = $state(false);
let dataRestoredFromSessionId = $state<string | null>(null);

// Key functions
function tryRestoreSessionData(sessionIdToRestore?: string): boolean;
function setupSessionAutoSave(currentSessionId: string): void;
function endSession(): void;
function forceSaveSession(): void;
```

### Data Structure

```typescript
interface StoredSessionData {
  sessionId: string;
  analysisData: any; // Full analysis state
  transcripts: any[]; // Server transcripts
  realtimeTranscripts: any[]; // Real-time transcript history
  texts: string[]; // Text array for analysis
  view: string; // Current view (start/analysis/report)
  timestamp: number; // Creation time
  lastUpdated: number; // Last save time
  models: any[]; // Active models
  language: string; // Session language
}
```

## 🎮 How to Use

### For Users

1. **Normal Operation**: Just use the application normally - data is automatically saved every 5 seconds
2. **After Reload**: If the page reloads unexpectedly, you'll see a blue notification indicating data was restored
3. **End Session**: Click "End Session" button to properly clean up when done
4. **Data Loss Protection**: Your analysis data, transcripts, and progress are preserved across browser refreshes

### For Developers

#### Testing in Console

```javascript
// Check current session status
window.sessionUtils.getCurrentSession();

// Force save current session
window.sessionUtils.forceSave();

// Check if session has stored data
window.sessionUtils.hasStoredData(sessionId);

// Try to restore specific session
window.sessionUtils.tryRestore(sessionId);

// End session and cleanup
window.sessionUtils.endSession();

// Clear all stored data (with confirmation)
window.sessionUtils.clearAll();
```

#### Automatic Integration

The local storage system automatically integrates with:

- **Session Creation**: Auto-save starts when session is created
- **Analysis Updates**: Data is saved when analysis state changes
- **View Changes**: Current view is preserved
- **Component Lifecycle**: Cleanup on component destruction

## 🧪 Testing

### Using the Test Suite

1. Open `test-session-storage.html` in your browser
2. Use the provided buttons to test different scenarios:
   - Create test sessions
   - Add mock data
   - Simulate page reloads
   - Test data restoration
   - Verify cleanup processes

### Manual Testing Scenarios

1. **Reload Test**:

   - Start a session, add some analysis data
   - Refresh the page (F5)
   - Verify data is restored with notification

2. **Session Management**:

   - Create multiple sessions
   - Check localStorage in DevTools
   - Use "End Session" to clean up

3. **Cleanup Test**:
   - Leave old sessions in localStorage
   - Reload the app
   - Verify old sessions are cleaned up automatically

## 🔧 Configuration

### Storage Options

```typescript
const sessionStorage = new SessionLocalStorage({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours (default)
  autoSave: true, // Enable auto-save (default)
  cleanupOnLoad: true, // Cleanup on app load (default)
});
```

### Storage Keys

- `aouros_session_[sessionId]`: Individual session data
- `aouros_session_index`: Index of all stored sessions

## 🚨 Important Notes

### SSR Configuration

- **SSR is disabled** for the session page (`ssr = false`)
- Page renders only in the browser, not on the server
- Eliminates SSR-related errors with browser APIs
- Improves performance by avoiding unnecessary server rendering

### Data Privacy

- Data is stored locally in the browser only
- No sensitive data is transmitted or stored externally
- Data is automatically cleaned up after 24 hours

### Performance

- Auto-save throttled to every 5 seconds to avoid performance issues
- Data compression could be added for large sessions
- Storage quota respected (localStorage ~5-10MB limit)
- No SSR overhead for this client-heavy page

### Browser Compatibility

- Works in all modern browsers with localStorage support
- Graceful degradation if localStorage is not available
- Handles storage quota exceeded scenarios

## 🛡️ Error Handling

The system includes comprehensive error handling for:

- **Storage quota exceeded**: Graceful degradation with console warnings
- **JSON parsing errors**: Invalid stored data is safely ignored
- **Missing session data**: Falls back to normal operation
- **Permission errors**: Handles cases where localStorage is disabled

## 📊 Monitoring

### Console Logging

The system provides detailed console logs:

```
🧹 Performing maintenance cleanup of old session data...
💾 Session data saved locally: {...}
📂 Session data loaded from local storage: {...}
🔄 Session data restored from local storage
✅ Auto-save setup complete for session: {...}
```

### Debug Information

Use `window.sessionUtils.getCurrentSession()` to get:

```javascript
{
    sessionId: "session_1234567890",
    hasRestoredData: true,
    dataRestoredFromSessionId: "session_1234567890",
    autoSaveActive: true,
    view: "analysis",
    analysisKeys: ["complaint", "diagnosis", "treatment"],
    transcriptCount: 15,
    realtimeTranscriptCount: 32
}
```

## 🔮 Future Enhancements

Potential improvements:

1. **Data Compression**: Compress stored data to save space
2. **IndexedDB Migration**: Move to IndexedDB for larger storage capacity
3. **Cross-tab Synchronization**: Share session data across browser tabs
4. **Cloud Backup**: Optional cloud storage for session data
5. **Export/Import**: Allow users to export/import session data
6. **Session History**: Keep a history of recent sessions

## 💡 Best Practices

### For Users

- Use "End Session" button when completely done
- Don't rely on localStorage for permanent data storage
- Be aware that clearing browser data will remove stored sessions

### For Developers

- Always use the provided utility functions rather than accessing localStorage directly
- Test restoration scenarios during development
- Monitor console for storage-related warnings
- Consider storage quota limits in data-heavy applications

## 🆘 Troubleshooting

### Common Issues

1. **Data not restoring after reload**:

   - Check browser console for errors
   - Verify sessionId is consistent
   - Check if localStorage is enabled

2. **Storage quota exceeded**:

   - Use browser DevTools to check localStorage usage
   - Run maintenance cleanup manually
   - Consider reducing data stored per session

3. **Session not ending properly**:
   - Use "End Session" button instead of just closing tab
   - Check console for cleanup confirmation logs

### Debug Commands

```javascript
// Check localStorage usage
console.log("Storage size:", JSON.stringify(localStorage).length);

// List all stored sessions
console.log("Sessions:", window.sessionUtils?.getCurrentSession?.());

// Force cleanup
window.sessionUtils?.endSession?.();
```

This implementation provides a robust solution to the Chrome reload issue while maintaining excellent user experience and data integrity.
