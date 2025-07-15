# 📝 Example Migration: Local Storage Service

This shows a concrete before/after example of migrating the local storage service to use the new centralized logger.

## Before (Current Code)

```typescript
// src/lib/session/local-storage.ts - BEFORE MIGRATION
export class SessionLocalStorage {
  saveSession(sessionId: string, data: Partial<StoredSessionData>): void {
    if (!this.isBrowser) {
      console.warn("⚠️ Cannot save session data - not running in browser");
      return;
    }

    try {
      const sessionData: StoredSessionData = {
        // ... data preparation
      };

      localStorage.setItem(storageKey, JSON.stringify(sessionData));
      this.updateSessionIndex(sessionId);

      console.log("💾 Session data saved locally:", {
        sessionId,
        dataSize: JSON.stringify(sessionData).length,
        analysisKeys: Object.keys(sessionData.analysisData),
        transcriptCount: sessionData.transcripts.length,
        realtimeTranscriptCount: sessionData.realtimeTranscripts.length,
      });
    } catch (error) {
      console.error("❌ Failed to save session data locally:", error);
    }
  }

  loadSession(sessionId: string): StoredSessionData | null {
    if (!this.isBrowser) {
      console.warn("⚠️ Cannot load session data - not running in browser");
      return null;
    }

    try {
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        console.log("📭 No stored session data found for:", sessionId);
        return null;
      }

      // ... age checking logic

      console.log("📂 Session data loaded from local storage:", {
        sessionId,
        age: Math.round(age / 1000),
        analysisKeys: Object.keys(sessionData.analysisData),
        transcriptCount: sessionData.transcripts.length,
        realtimeTranscriptCount: sessionData.realtimeTranscripts.length,
      });

      return sessionData;
    } catch (error) {
      console.error(
        "❌ Failed to load session data from local storage:",
        error,
      );
      return null;
    }
  }

  performMaintenanceCleanup(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      console.log("🧹 Performing maintenance cleanup of old session data...");

      // ... cleanup logic

      console.log(
        `🧹 Maintenance cleanup complete. Removed ${removedCount} expired sessions.`,
      );
    } catch (error) {
      console.error("❌ Maintenance cleanup failed:", error);
    }
  }
}
```

## After (With New Logger)

```typescript
// src/lib/session/local-storage.ts - AFTER MIGRATION
import { log } from "$lib/logging/logger";

export class SessionLocalStorage {
  saveSession(sessionId: string, data: Partial<StoredSessionData>): void {
    if (!this.isBrowser) {
      log.storage.warn("Cannot save session data - not running in browser");
      return;
    }

    try {
      const sessionData: StoredSessionData = {
        // ... data preparation
      };

      localStorage.setItem(storageKey, JSON.stringify(sessionData));
      this.updateSessionIndex(sessionId);

      log.storage.info("Session data saved locally", {
        sessionId,
        dataSize: JSON.stringify(sessionData).length,
        analysisKeys: Object.keys(sessionData.analysisData),
        transcriptCount: sessionData.transcripts.length,
        realtimeTranscriptCount: sessionData.realtimeTranscripts.length,
      });
    } catch (error) {
      log.storage.error("Failed to save session data locally:", error);
    }
  }

  loadSession(sessionId: string): StoredSessionData | null {
    if (!this.isBrowser) {
      log.storage.warn("Cannot load session data - not running in browser");
      return null;
    }

    try {
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        log.storage.debug("No stored session data found for:", sessionId);
        return null;
      }

      // ... age checking logic

      log.storage.info("Session data loaded from local storage", {
        sessionId,
        age: Math.round(age / 1000),
        analysisKeys: Object.keys(sessionData.analysisData),
        transcriptCount: sessionData.transcripts.length,
        realtimeTranscriptCount: sessionData.realtimeTranscripts.length,
      });

      return sessionData;
    } catch (error) {
      log.storage.error(
        "Failed to load session data from local storage:",
        error,
      );
      return null;
    }
  }

  performMaintenanceCleanup(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      log.storage.info("Performing maintenance cleanup of old session data...");

      // ... cleanup logic

      log.storage.info(
        `Maintenance cleanup complete. Removed ${removedCount} expired sessions.`,
      );
    } catch (error) {
      log.storage.error("Maintenance cleanup failed:", error);
    }
  }
}
```

## Key Changes Made

### ✅ Import Added

```typescript
import { log } from "$lib/logging/logger";
```

### ✅ Console Calls Replaced

```typescript
// Before: Mixed emoji prefixes
console.warn("⚠️ Cannot save session data...");
console.log("💾 Session data saved locally:");
console.error("❌ Failed to save session data...");

// After: Consistent namespace
log.storage.warn("Cannot save session data...");
log.storage.info("Session data saved locally");
log.storage.error("Failed to save session data...");
```

### ✅ Log Levels Appropriately Set

```typescript
// Non-critical info changed to debug level
log.storage.debug('No stored session data found for:', sessionId);

// Important operations remain info level
log.storage.info('Session data saved locally', {...});

// Errors always remain error level
log.storage.error('Failed to save session data locally:', error);
```

## Runtime Control Examples

With the migrated code, you can now control logging at runtime:

```javascript
// In browser console:

// See all storage operations (development default)
window.logger.config(); // Shows DEBUG level enabled

// Hide storage debug messages, keep info/error
window.logger.setLevel("INFO");

// Only show storage-related logs
window.logger.disable("*");
window.logger.enable("Storage");

// Silence storage completely
window.logger.disable("Storage");

// Test storage logging specifically
log.storage.error("Test error message");
log.storage.warn("Test warning message");
log.storage.info("Test info message");
log.storage.debug("Test debug message");
```

## Console Output Comparison

### Before (Mixed formatting)

```
⚠️ Cannot save session data - not running in browser
💾 Session data saved locally: {sessionId: "abc123", dataSize: 1024}
❌ Failed to save session data locally: Error: Storage quota exceeded
🧹 Performing maintenance cleanup of old session data...
```

### After (Consistent formatting)

```
⚠️ [10:30:45] [Storage] Cannot save session data - not running in browser
💾 [10:30:46] [Storage] Session data saved locally {sessionId: "abc123", dataSize: 1024}
❌ [10:30:47] [Storage] Failed to save session data locally: Error: Storage quota exceeded
💾 [10:30:48] [Storage] Performing maintenance cleanup of old session data...
```

## Benefits Realized

### ✅ **Preserved Line Numbers**

The console still shows the exact file and line number where the log was called.

### ✅ **Namespace Organization**

All storage-related logs are grouped under the `[Storage]` namespace.

### ✅ **Runtime Control**

Can enable/disable storage logs without code changes.

### ✅ **Environment Awareness**

Debug logs automatically hidden in production.

### ✅ **Consistent Formatting**

All logs follow the same format with timestamps and namespace labels.

This migration pattern can be applied to all files in the codebase systematically!
