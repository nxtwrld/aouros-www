# 🔧 Logger Migration Guide

## Overview

This guide shows how to migrate from scattered `console.log` calls to the new centralized logging service that preserves line numbers, provides namespace organization, and offers runtime configuration.

## 📦 Basic Usage

### Import the logger
```typescript
import { log } from '$lib/logging/logger';
```

### Pre-configured namespaces
```typescript
log.session.info('Session mounted', { sessionId });
log.storage.error('Failed to save data', error);
log.audio.debug('Microphone permission granted');
log.analysis.info('Analysis completed', results);
```

## 🔄 Migration Examples

### Before (Session Page)
```typescript
// Old scattered console calls
console.log('🏁 Session page mounted', { useRealtime, sessionId });
console.log('🔄 Session data restored from local storage');
console.error('❌ Failed to restore session data:', error);
console.log('📡 Session created callback received:', createdSessionId);
```

### After (Session Page)
```typescript
import { log } from '$lib/logging/logger';

// Clean namespace organization
log.session.info('Session page mounted', { useRealtime, sessionId });
log.session.info('Session data restored from local storage');
log.session.error('Failed to restore session data:', error);
log.session.info('Session created callback received:', createdSessionId);
```

### Before (Local Storage Service)
```typescript
// Old mixed logging
console.log('💾 Session data saved locally:', {...});
console.warn('⚠️ Cannot save session data - not running in browser');
console.error('❌ Failed to save session data locally:', error);
console.log('🧹 Performing maintenance cleanup...');
```

### After (Local Storage Service)
```typescript
import { log } from '$lib/logging/logger';

// Consistent namespace logging
log.storage.info('Session data saved locally', {...});
log.storage.warn('Cannot save session data - not running in browser');
log.storage.error('Failed to save session data locally', error);
log.storage.info('Performing maintenance cleanup...');
```

### Before (Audio Button)
```typescript
// Mixed audio-related logging
console.log('📡 Initializing SSE client...', { useRealtime, sessionId });
console.log('✅ SSE connected successfully');
console.error('❌ SSE connection failed:', error);
console.log('🎙️ Audio recording started');
```

### After (Audio Button)
```typescript
import { log } from '$lib/logging/logger';

// Clean audio namespace
log.audio.info('Initializing SSE client...', { useRealtime, sessionId });
log.audio.info('SSE connected successfully');
log.audio.error('SSE connection failed:', error);
log.audio.info('Audio recording started');
```

## 🎯 Advanced Usage

### Custom Namespaces
```typescript
// Create custom namespace for specific components
const diagnosisLog = log.namespace('Diagnosis', '🩺');
diagnosisLog.info('Rendering diagnosis component');
diagnosisLog.debug('Diagnosis data updated', diagnosisData);
```

### Conditional Logging
```typescript
// The logger handles level filtering automatically
log.session.debug('Detailed debug info'); // Only shows in dev mode
log.session.info('Important info');       // Shows in dev mode
log.session.error('Critical error');      // Always shows
```

### Component-Specific Logging
```typescript
// In a Svelte component
import { log } from '$lib/logging/logger';

// Component lifecycle
log.ui.info('Component mounted', { componentName: 'AudioButton' });
log.ui.debug('Component state changed', { newState });
log.ui.warn('Component warning', { issue });
```

## 🎮 Runtime Configuration

### Via Browser Console

```javascript
// View current configuration
window.logger.config()

// Set log level
window.logger.setLevel('DEBUG')    // Show all logs
window.logger.setLevel('INFO')     // Show info and above
window.logger.setLevel('ERROR')    // Show only errors

// Enable/disable specific namespaces
window.logger.enable('Session', 'Storage')  // Only show these
window.logger.disable('Audio')              // Hide audio logs
window.logger.enable('*')                   // Enable all

// Other controls
window.logger.quiet(true)          // Silence all logging
window.logger.timestamp(true)      // Add timestamps
window.logger.reset()              // Reset to defaults
window.logger.test()               // Test all log levels
```

### Via localStorage (Persistent)
```javascript
// Configuration is automatically saved to localStorage
// Set once and it persists across page reloads
window.logger.setLevel('INFO');
window.logger.enable('Session', 'Storage');
// These settings will persist
```

## 📝 Migration Patterns

### Pattern 1: Simple Replacement
```typescript
// Before
console.log('🏁 Session mounted');

// After  
log.session.info('Session mounted');
```

### Pattern 2: Error Handling
```typescript
// Before
console.error('❌ Failed to load data:', error);

// After
log.storage.error('Failed to load data:', error);
```

### Pattern 3: Debug Information
```typescript
// Before
console.log('Debug info:', debugData);

// After
log.session.debug('Debug info:', debugData);
```

### Pattern 4: Conditional Development Logging
```typescript
// Before
if (import.meta.env.DEV) {
    console.log('Development info');
}

// After (automatic dev/prod handling)
log.session.debug('Development info');
```

## 🔍 Benefits Gained

### ✅ Preserved Line Numbers
```typescript
log.session.info('Message'); // Still shows: Component.svelte:42
```

### ✅ Environment Awareness
- **Development**: Shows DEBUG and above with timestamps
- **Production**: Shows only ERROR level
- **Automatic detection** based on hostname/port

### ✅ Runtime Control
- **Enable/disable** specific areas during debugging
- **Change log levels** without code changes
- **Quiet mode** for clean console during testing

### ✅ Consistent Formatting
```
🏁 [10:30:45] [Session] Session mounted { sessionId: "abc123" }
💾 [10:30:46] [Storage] Data saved { size: 1024 }
❌ [10:30:47] [Audio] Connection failed Error: Timeout
```

### ✅ Better Organization
- **Clear namespaces** instead of mixed emoji soup
- **Logical grouping** of related functionality
- **Easy filtering** by feature area

## 🧪 Testing the Logger

### Quick Test
```javascript
// In browser console
window.logger.test()
```

### Test Specific Namespace
```typescript
import { log } from '$lib/logging/logger';

// Test all levels for a namespace
log.session.error('Test error');
log.session.warn('Test warning');
log.session.info('Test info');
log.session.debug('Test debug');
log.session.trace('Test trace');
```

### Test Configuration Changes
```javascript
// Start with default config
window.logger.config()

// Change level and test
window.logger.setLevel('DEBUG')
window.logger.test()

// Disable some namespaces
window.logger.disable('Audio', 'Storage')
window.logger.test()

// Reset and test again
window.logger.reset()
window.logger.test()
```

## 📋 Migration Checklist

### Phase 1: Setup
- [ ] Logger service created at `src/lib/logging/logger.ts`
- [ ] Import added to main components
- [ ] Basic namespace usage tested

### Phase 2: Core Components
- [ ] Session page logging migrated
- [ ] Local storage service migrated  
- [ ] Audio button component migrated
- [ ] Analysis components migrated

### Phase 3: Secondary Components
- [ ] UI components migrated
- [ ] API calls migrated
- [ ] Test files migrated
- [ ] Utility functions migrated

### Phase 4: Cleanup
- [ ] Remove old console.* calls
- [ ] Verify line number preservation
- [ ] Test runtime configuration
- [ ] Update documentation

## 🚨 Important Notes

### Line Number Preservation
The logger **preserves original file/line numbers** because it calls `console.*` directly, not through wrapper functions.

### SSR Compatibility  
The logger is **SSR-safe** and won't break during server-side rendering.

### Performance
- **Zero overhead** when logs are disabled
- **Minimal overhead** when enabled (just string concatenation)
- **No performance impact** in production (only errors logged)

### TypeScript Support
- **Full type safety** for all logger methods
- **IntelliSense support** for namespaces and configuration
- **Type-safe configuration** options

## 🎉 Ready to Use!

The logger is now ready for use. Start by importing it and replacing a few console calls to test:

```typescript
import { log } from '$lib/logging/logger';

// Replace this:
console.log('🏁 Component mounted');

// With this:
log.session.info('Component mounted');
```

Check the browser console to see the logger initialization message and available commands! 