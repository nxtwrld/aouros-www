# MCP Security and Audit System Usage

This document explains how to use the MCP security and audit system for HIPAA-compliant medical data access.

## Overview

The security system provides:
- **Access Control**: Authentication, authorization, and rate limiting
- **Audit Logging**: Complete audit trail of all medical data access
- **HIPAA Compliance**: Security measures for protected health information
- **Role-based Access**: Different access levels for clinical vs patient users

## Quick Start

### 1. Server-side Usage (Recommended)

```typescript
import { 
  secureMcpTools,
  buildSecurityContextFromEvent,
  type MCPSecurityContext 
} from '$lib/context';

// In your API route (+server.ts)
export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (!session) error(401, { message: 'Unauthorized' });

  const { profileId, query } = await request.json();
  
  // Build security context
  const securityContext = buildSecurityContextFromEvent(
    event,
    session.user,
    profileId,
    sessionId // optional
  );
  
  // Use secure tools
  try {
    const result = await secureMcpTools.searchDocuments(securityContext, { query });
    return json(result);
  } catch (err) {
    if (err.message.includes('Access denied')) {
      error(403, { message: err.message });
    }
    throw err;
  }
};
```

### 2. Client-side Usage

```typescript
import { 
  buildSecurityContextFromBrowser,
  secureMcpTools 
} from '$lib/context';
import { user } from '$lib/user';

// In your Svelte component
async function searchMedicalData() {
  const currentUser = user.get();
  if (!currentUser) return;

  const securityContext = buildSecurityContextFromBrowser(
    currentUser,
    profileId,
    sessionId
  );
  
  try {
    const results = await secureMcpTools.searchDocuments(securityContext, {
      query: 'diabetes medications',
      limit: 10
    });
    
    // Handle results
  } catch (error) {
    if (error.message.includes('Access denied')) {
      // Handle access denial
      console.error('Access denied:', error.message);
    }
  }
}
```

## Available Secure Tools

### Basic Tools
- `searchDocuments` - Search medical documents
- `getAssembledContext` - Get assembled context for AI
- `getProfileData` - Access patient profile
- `queryMedicalHistory` - Query medical history
- `getDocumentById` - Access specific documents

### Advanced Medical Tools
- `getPatientTimeline` - Chronological medical history
- `analyzeMedicalTrends` - Medical trend analysis
- `getMedicationHistory` - Medication history with interactions
- `getTestResultSummary` - Lab results and trends
- `identifyMedicalPatterns` - Pattern recognition
- `generateClinicalSummary` - Clinical summaries (requires clinical role)
- `searchBySymptoms` - Symptom-based search
- `getSpecialtyRecommendations` - Specialty referral recommendations

## Security Features

### Access Control

Each tool has configurable access policies:

```typescript
// Example policy for medication history
{
  requireAuthentication: true,
  requireProfileOwnership: true,
  sensitivityLevel: 'critical',
  rateLimit: { maxRequests: 20, windowMs: 60000 }
}
```

### Rate Limiting

Automatic rate limiting prevents abuse:
- Different limits per tool based on sensitivity
- User-specific rate limiting
- Automatic cleanup of expired limits

### Audit Trail

All access is logged with:
- User identification
- Tool and operation
- Parameters (sanitized)
- Success/failure status
- Data accessed
- IP address and user agent
- Processing time

## Audit Management

### Viewing Audit Logs

```typescript
import { mcpSecurityService } from '$lib/context';

// Get audit trail for a profile
const auditEntries = await mcpSecurityService.getAuditTrail(profileId, {
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  toolName: 'getMedicationHistory', // optional filter
  limit: 100
});
```

### Exporting Audit Logs

```typescript
// Export for compliance
const auditReport = await mcpSecurityService.exportAuditLogs(
  new Date('2024-01-01'),
  new Date(),
  'json' // or 'csv'
);
```

## Error Handling

### Common Errors

1. **Authentication Required**
   ```
   Access denied: Authentication required
   ```

2. **Profile Access Denied**
   ```
   Access denied: Profile access denied
   ```

3. **Rate Limit Exceeded**
   ```
   Access denied: Rate limit exceeded
   ```

4. **Clinical Role Required**
   ```
   Access denied: Clinical role required
   ```

### Error Response Pattern

```typescript
try {
  const result = await secureMcpTools.toolName(context, params);
} catch (error) {
  if (error.message.includes('Access denied')) {
    // Security issue - log and handle appropriately
    console.error('Security violation:', error.message);
    // Show user-friendly message
  } else {
    // Other error - handle normally
    throw error;
  }
}
```

## Best Practices

### 1. Always Use Secure Tools in Production

```typescript
// ✅ Good - secure with audit logging
const result = await secureMcpTools.searchDocuments(context, params);

// ❌ Bad - no security validation
const result = await mcpTools.searchDocuments(profileId, params);
```

### 2. Build Security Context Properly

```typescript
// ✅ Good - complete context
const context = buildSecurityContextFromEvent(event, user, profileId, sessionId);

// ❌ Bad - incomplete context
const context = { user, profileId };
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good - proper error handling
try {
  const result = await secureMcpTools.getProfileData(context, {});
  return result;
} catch (error) {
  if (error.message.includes('Access denied')) {
    return { error: 'Access not authorized' };
  }
  throw error;
}
```

### 4. Use Appropriate Tools for Sensitivity

```typescript
// ✅ Good - clinical summary requires clinical role
if (userHasClinicalRole) {
  await secureMcpTools.generateClinicalSummary(context, params);
}

// ✅ Good - patient can search their own documents
await secureMcpTools.searchDocuments(context, params);
```

## Testing

### Test Security Context

```typescript
import { buildTestSecurityContext } from '$lib/context';

const testContext = buildTestSecurityContext('user123', 'profile456', 'session789');
```

### Test Access Policies

```typescript
import { mcpSecurityService } from '$lib/context';

const accessResult = await mcpSecurityService.validateAccess(
  'getMedicationHistory',
  testContext,
  { includeInteractions: true }
);

console.log(accessResult); // { allowed: true/false, reason?: string }
```

## HIPAA Compliance Notes

The security system supports HIPAA compliance through:

1. **Access Controls**: Authentication and authorization
2. **Audit Logging**: Complete audit trail
3. **Data Minimization**: Rate limits and query restrictions
4. **User Authentication**: Required for all medical data access
5. **Activity Monitoring**: Real-time security monitoring

Ensure your deployment includes:
- SSL/TLS encryption in transit
- Encrypted storage at rest
- Regular audit log review
- User access management
- Incident response procedures