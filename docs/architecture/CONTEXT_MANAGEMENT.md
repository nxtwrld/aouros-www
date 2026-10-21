# Context Management System Documentation

> **Status:** Implemented (with noted gaps) · **Type:** Reference · **Verified:** 2026-10-21
> **Built:** `src/lib/context/` (mcp-tools, context-assembly, integration), `src/lib/langgraph/nodes/medical-terms-generation.ts` · **Pending:** semantic/embedding search (dropped, see [CONTEXT_ROADMAP.md](../plans/CONTEXT_ROADMAP.md)), language-independent classification layer, unregistered advanced tools

## Executive Summary

The Context Management System is Mediqom's intelligent document retrieval and contextual AI system that provides term-based medical search, context assembly, and secure medical data access through Model Context Protocol (MCP) tools. Built with privacy-first architecture and HIPAA compliance, it enables AI-powered conversations with complete medical context while maintaining strong security and audit trails.

**Current Status**: ✅ **In production** with term-based search, security, audit logging, and MCP tools. **Not implemented:** semantic/embedding (vector) search. Embeddings were built and then removed (see [CONTEXT_ROADMAP.md](../plans/CONTEXT_ROADMAP.md)), and the remaining `generateQueryEmbedding()` stubs in `get-assembled-context.ts` and `medical-expert-tools.ts` are placeholders.

**Key Capabilities**:

- ✅ **Medical Terms Classification** - Direct medical term matching and classification
- ✅ **Three-Stage Search** - Category filtering, term refinement, and temporal processing
- ✅ **7 registered MCP Medical Tools** - 6 read-only + `createCarePlanTask` (gated by `PUBLIC_ENABLE_CARE_PLAN`)
- ✅ **Security & Audit System** - HIPAA-compliant access control and logging
- ✅ **Real-time Integration** - Session management and chat context
- ✅ **Term-Based Architecture** - Fast, precise medical concept matching

## Architecture Overview

### Core Concept: Intelligent Medical Context

The Context Management System treats medical documents as classified, searchable medical knowledge that can be intelligently filtered and securely accessed by AI systems through direct term matching. This enables:

- **Contextual Conversations**: AI chat with complete medical history awareness
- **Real-time Consultations**: Live session context for medical professionals
- **Medical Term Search**: Find relevant medical information using standardized medical terminology
- **Temporal Intelligence**: Identify "latest", "recent", and historical medical information
- **Secure Access**: HIPAA-compliant medical data access with complete audit trails

### System Components

```
src/lib/context/
├── mcp-tools/               # Medical expert tools for AI
│   ├── medical-expert-tools.ts      # Tool implementations (incl. unregistered advanced ones)
│   ├── security-audit.ts            # Security and audit system
│   ├── security-context-builder.ts  # Security context utilities
│   ├── base/                        # Base tool classes
│   │   └── base-tool.ts            # Common MCP tool functionality
│   └── tools/                       # Individual MCP tools
│       ├── search-documents.ts     # Three-stage medical document search
│       ├── get-assembled-context.ts
│       ├── get-profile-data.ts
│       ├── query-medical-history.ts
│       ├── get-document-by-id.ts
│       ├── get-patient-timeline.ts
│       ├── create-care-plan-task.ts # Mutating; audited as "write"
│       └── index.ts                # Tool registry (getToolDefinitions / executeTool)
├── context-assembly/               # Intelligent context compilation
│   ├── context-composer.ts        # AI-optimized context assembly
│   └── token-optimization.ts      # Token management for AI limits
├── integration/                    # System integrations
│   ├── profile-context.ts         # Profile context management
│   ├── session-context.ts         # Real-time session integration
│   ├── chat-service.ts            # Chat context integration
│   ├── client/                     # Client-side integrations
│   ├── server/                     # Server-side integrations
│   └── shared/                     # Shared base classes
└── types.ts                       # Type definitions for context system
```

## Core Features

### 1. Medical Terms Classification System

**Direct Medical Term Matching**: Documents are processed to extract standardized medical terms in English, enabling precise medical concept matching without complex vector operations.

> Terms are generated during import by the LangGraph node `src/lib/langgraph/nodes/medical-terms-generation.ts`. The snippet below is illustrative only: `medicalTermsExtractor` is not a real module.

```typescript
// Document medical terms extraction
const documentTerms = await medicalTermsExtractor.extractTerms(
  documentContent,
  {
    useEnglishTerminology: true,
    useLatinTerminology: true,
    standardizeToICD10: true,
    includeLOINCCodes: true,
    extractProcedures: true,
    extractMedications: true,
  },
);

// Store with document
await documentStore.save({
  id: documentId,
  content: encryptedContent,
  medicalTerms: documentTerms,
  metadata: { category: "laboratory", tags: ["blood", "glucose"] },
});
```

**Key Features**:

- **Standardized Terminology**: All terms normalized to English medical standards
- **Fast Matching**: Direct array-based term matching with relevance scoring
- **Medical Categories**: 13 predefined medical categories for precise filtering
- **Multi-language Support**: Terms extracted from Czech, German, English documents

### 2. Three-Stage Search Architecture

**Intelligent Document Filtering**: The search system uses a three-stage approach to find the most relevant medical documents efficiently.

```typescript
// Three-stage search execution
const searchResults = await searchDocumentsTool.execute(
  {
    terms: ["latest", "blood", "glucose"], // AI-provided search terms
    documentTypes: ["laboratory"], // Stage 1: Category filtering
    threshold: 0.6, // Stage 2: Relevance threshold
    limit: 10, // Result limiting
  },
  profileId,
);

// Stage 1: Category Filtering - Filter by metadata.category
// Stage 2: Term Refinement - Match against medicalTerms arrays
// Stage 3: Temporal Processing - Handle "latest", "recent", "historical"
```

**Search Features**:

- **Category Filtering**: Fast pre-filtering by medical document categories
- **Term Matching**: Exact and partial matching against medical terms arrays
- **Temporal Intelligence**: Smart handling of time-based queries ("latest", "recent")
- **Relevance Scoring**: Combined scoring based on term matches and temporal relevance
- **Multi-stage Optimization**: Each stage reduces search space for performance

### 3. Model Context Protocol (MCP) Tools

**7 Registered Medical Tools**: AI can access medical data through MCP tools registered in `src/lib/context/mcp-tools/tools/index.ts`, with full security validation.

#### Production-Ready Tools ✅

1. **searchDocuments** - Three-stage medical document search with term matching
2. **getAssembledContext** - Get AI-optimized context assembly
3. **getProfileData** - Access patient profile information
4. **queryMedicalHistory** - Query specific medical history types
5. **getDocumentById** - Retrieve specific documents
6. **getPatientTimeline** - Chronological medical event timeline
7. **createCarePlanTask** - Appends a Care Plan task. This is the only mutating tool: it is audited as a `write` and registered only when `CARE_PLAN` is enabled.

#### Advanced Tools In Development 🚧

These have method implementations in `medical-expert-tools.ts` but are **not registered** in the tool registry, so chat cannot call them.

8. **analyzeMedicalTrends** - Trend analysis across medical data
9. **getMedicationHistory** - Medication history with interaction checking
10. **getTestResultSummary** - Lab results analysis and trends
11. **identifyMedicalPatterns** - Pattern recognition in medical data
12. **generateClinicalSummary** - Clinical summaries (requires clinical role)
13. **searchBySymptoms** - Symptom-based document search
14. **getSpecialtyRecommendations** - AI-powered specialty referral recommendations

```typescript
// Example: Medical document search with three-stage filtering
const searchResults = await secureMcpTools.searchDocuments(securityContext, {
  terms: ["latest", "laboratory", "blood", "glucose"], // Medical terms in English
  documentTypes: ["laboratory"], // Category filtering
  threshold: 0.7, // Relevance threshold
  limit: 10, // Result limit
  includeContent: true, // Include previews for high-relevance
});
```

### 4. Security & Audit System

**HIPAA-Compliant Security**: Complete access control, rate limiting, and audit logging for all medical data access.

```typescript
// Security validation and audit logging
const securityContext = buildSecurityContextFromEvent(event, user, profileId);
const result = await secureMcpTools.searchDocuments(securityContext, params);
// Automatic: Access validation, rate limiting, audit logging
```

**Security Features**:

- **Authentication Required**: All tools require user authentication
- **Profile Ownership**: Users can only access their own medical data
- **Role-based Access**: Clinical tools require verified clinical roles
- **Rate Limiting**: Per-tool rate limits to prevent abuse
- **Complete Audit Trail**: Every access logged with full context

**Audit Logging**:

- User identification and authentication status
- Tool name, operation, and sanitized parameters
- Success/failure status with error details
- Data accessed (document count, types, etc.)
- IP address, user agent, session tracking
- Processing time and performance metrics

### 5. Real-time Session Integration

**Live Medical Consultations**: Context system integrates with real-time medical sessions to provide instant medical history access.

```typescript
// Session context initialization
const sessionContext = await sessionContextService.initializeSessionContext(
  sessionId,
  sessionData,
  {
    profileId: patientProfileId,
    includeRecentTranscripts: true,
    maxContextTokens: 2000,
    priorityTypes: ["diagnosis", "medication", "vital-signs"],
  },
);
```

**Session Features**:

- **Real-time Context Updates**: Dynamic context as session progresses
- **Medical History Integration**: Relevant patient history for consultations
- **Transcript Analysis**: AI analysis of ongoing conversations
- **Context Caching**: Performance optimization for active sessions

### 6. Chat System Integration

**Contextual AI Conversations**: Chat system uses context management for intelligent, medical-history-aware conversations.

```typescript
// Context-aware chat preparation
const chatContext = await chatContextService.prepareContextForChat(
  userMessage,
  {
    profileId: userProfileId,
    maxTokens: 3000,
    includeDocuments: true,
    contextThreshold: 0.6,
  },
);
```

**Chat Features**:

- **Query Understanding**: The AI turns natural-language questions into English medical search terms
- **Document Filtering**: Relevant document retrieval based on conversation
- **Context-Enhanced Prompts**: AI system prompts with medical context
- **Conversation History**: Persistent context across chat sessions

### 7. ~~Medical Classification Layer~~ (Not implemented)

> **Correction (2026-10-21):** This section describes a design that was never built. `src/lib/medical/` does not exist, and there is no `medicalClassificationService`, query classification, vector search or on-access migration. Language handling today relies on the AI emitting English terms that are matched against `medicalTerms` (see §1–2). The design is kept below for reference only.

**Language-Independent Medical Intelligence**: The Medical Classification Layer provides semantic medical concept extraction and categorization that works across multiple languages, enabling precise medical document retrieval regardless of query language.

```
Document Import → Text Extraction → Medical Classification → Vector Embeddings → Context Storage
                                          ↓
Search Query → Query Classification → Category Filtering → Vector Search → Results
```

**Architecture Components**:

```typescript
src/lib/medical/
├── classification-service.ts     # Core medical concept extraction
├── concept-mappings/            # Multi-language medical dictionaries
│   ├── laboratory.ts           # Blood tests, lab results, etc.
│   ├── imaging.ts              # X-ray, MRI, CT scans, etc.
│   ├── medications.ts          # Drug names, prescriptions, etc.
│   └── temporal.ts             # "latest", "recent", time patterns
└── migration-service.ts        # Background classification migration
```

#### Medical Concept Classification

**Multi-Language Medical Categories**:

```typescript
enum MedicalCategory {
  LABORATORY = "laboratory", // Blood tests, urinalysis, cultures
  IMAGING = "imaging", // X-ray, MRI, CT, ultrasound
  MEDICATIONS = "medications", // Prescriptions, drug therapy
  CARDIOLOGY = "cardiology", // ECG, stress tests, cardiac procedures
  SURGERY = "surgery", // Surgical procedures, operations
  CONSULTATION = "consultation", // Doctor visits, clinical notes
  EMERGENCY = "emergency", // ER visits, urgent care
  PATHOLOGY = "pathology", // Biopsies, tissue analysis
  THERAPY = "therapy", // Physical therapy, rehabilitation
  ONCOLOGY = "oncology", // Cancer-related documents
  MENTAL_HEALTH = "mental_health", // Psychology, psychiatry
  PEDIATRICS = "pediatrics", // Children's health
  OBSTETRICS = "obstetrics", // Pregnancy, childbirth
}
```

**Cross-Language Concept Mapping**:

```typescript
// Example: Laboratory results concept mapping
{
  conceptId: "lab_results_general",
  primaryTerm: "laboratory results",
  category: MedicalCategory.LABORATORY,
  translations: [
    { language: "en", terms: ["lab results", "laboratory results", "blood work"] },
    { language: "cs", terms: ["laboratorní výsledky", "výsledky testů", "krevní testy"] },
    { language: "de", terms: ["Laborergebnisse", "Laborwerte", "Blutwerte"] }
  ]
}
```

#### Temporal Intelligence

**Time-Aware Medical Queries**:

```typescript
interface TemporalInfo {
  type: "latest" | "recent" | "historical" | "periodic";
  value: string; // Original temporal expression
  normalizedDate?: Date; // Parsed absolute date
  relativeTime?: {
    // Relative time information
    modifier: "latest" | "recent" | "previous";
    timeframe?: number; // Days/weeks/months
    unit?: "days" | "weeks" | "months";
  };
}

// Query examples:
// "poslední laboratorní výsledky" → { type: "latest", category: "laboratory" }
// "recent blood tests" → { type: "recent", category: "laboratory" }
// "letzte Röntgenbilder" → { type: "latest", category: "imaging" }
```

#### Classification-Based Search

**Primary Search Method**: Fast category-based filtering before vector search:

```typescript
async function classificationBasedSearch(
  query: ProcessedMedicalQuery,
  profileId: string,
) {
  // 1. Extract medical concepts from query
  const queryClassification = await medicalClassificationService.classifyQuery(
    "poslední laboratorní výsledky",
    "cs",
  );
  // Result: { categories: ["laboratory"], temporal: { type: "latest" } }

  // 2. Filter documents by medical categories (fast)
  const categoryMatches = context.classificationIndex.get("laboratory");
  // Returns: Set of document IDs with laboratory classification

  // 3. Apply temporal filtering for "latest" requests
  const temporalResults = applyTemporalFilter(
    categoryMatches,
    queryClassification.temporal,
  );

  // 4. Score and rank results
  return scoreAndRankResults(temporalResults, queryClassification);
}
```

#### Integration Points

**Document Import Pipeline Enhancement**:

```typescript
// LangGraph node enhancement
export async function medicalClassificationNode(
  state: DocumentProcessingState,
) {
  const classification = await medicalClassificationService.classifyDocument(
    state.text,
    state.language || "en",
  );

  return {
    medicalClassification: classification,
    // Classification passed to embedding generation node
  };
}
```

**Client-Side Document Migration**:

```typescript
// Automatic classification when documents are accessed
export async function getDocument(
  documentId: string,
): Promise<Document | null> {
  const document = await loadDocument(documentId);

  if (document && !document.medicalClassification) {
    // Background classification for existing documents
    await migrateDocumentClassification(document);
  }

  return document;
}
```

**Enhanced Search Architecture**:

```typescript
// Multi-modal search: Classification + Vector similarity
async searchDocuments(params: SearchParams, profileId: string) {
  // 1. Classify search query
  const processedQuery = await medicalClassificationService.classifyQuery(
    params.query, params.language || 'en'
  );

  // 2. Classification-based filtering (primary)
  const classificationResults = await classificationBasedSearch(processedQuery, profileId);

  // 3. Vector similarity search (fallback)
  if (classificationResults.length === 0) {
    return await vectorBasedSearch(params, profileId);
  }

  return formatSearchResults(classificationResults);
}
```

**Key Benefits**:

- ✅ **Language Independence**: Czech query finds German/English documents
- ✅ **Medical Precision**: "laboratory results" matches regardless of language
- ✅ **Temporal Understanding**: "latest" properly prioritizes recent documents
- ✅ **Fast Performance**: Category filtering before expensive vector search
- ✅ **Explainable Results**: Clear reasoning for why documents matched
- ✅ **Automatic Migration**: Existing documents classified on access

## Implementation Details

> **Note:** The embedding-related snippets in this section and in Integration Points (`generateEmbedding`, `serverEmbeddingService`, `ClientContextDatabase`, `storeDocumentEmbedding`) describe the removed embedding system and do not exist in the code. `profileContextManager.addDocumentToContext(profileId, document)` is now a logging no-op, because documents become searchable once their `medicalTerms` are present.

### 1. Document Processing Pipeline

```typescript
// Document save triggers context assembly
export async function createDocument(data: DocumentInput): Promise<Document> {
  const newDocument = await saveDocument(data);

  // Generate embedding for context system
  try {
    await profileContextManager.addDocumentToContext(
      profile_id || user_id,
      newDocument,
      { generateEmbedding: true },
    );
  } catch (error) {
    logger.documents.warn("Failed to add document to context", { error });
  }

  return newDocument;
}
```

### 2. Server-Client Architecture

**Secure Embedding Generation**: API keys remain server-side while search happens client-side.

```typescript
// Server-side embedding generation
export const POST: RequestHandler = async ({
  request,
  locals: { safeGetSession },
}) => {
  const { session } = await safeGetSession();
  if (!session) error(401, { message: "Unauthorized" });

  const { query } = await request.json();
  const embeddingResult =
    await serverEmbeddingService.generateQueryEmbedding(query);

  return json({
    success: true,
    data: { embedding: Array.from(embeddingResult.embedding!) },
  });
};

// Client-side search with server-generated embedding
const queryEmbedding = await generateQueryEmbedding(userQuery);
const searchResults = await contextDatabase.search(queryEmbedding, options);
```

### 3. Context Database Management

**Profile-Based Context**: Each user profile maintains its own encrypted context database.

```typescript
// Profile context management
export class ProfileContextManager {
  async initializeProfileContext(profileId: string): Promise<boolean> {
    const database = new ClientContextDatabase(`context_${profileId}`);
    await database.initialize();

    this.contextDatabases.set(profileId, {
      database,
      lastAccess: Date.now(),
      documentCount: 0,
    });

    return true;
  }
}
```

## Integration Points

### 1. Document System Integration

```typescript
// Automatic context updates on document changes
// src/lib/documents/index.ts
await profileContextManager.addDocumentToContext(profileId, document, {
  generateEmbedding: true,
});
```

### 2. LangGraph Integration

```typescript
// Context assembly during document processing
// LangGraph workflows automatically generate embeddings
const documentResult = await processDocument(document);
if (documentResult.embedding) {
  await storeDocumentEmbedding(document.id, documentResult.embedding);
}
```

### 3. Chat API Integration

```typescript
// Context-enhanced chat responses
// src/routes/v1/chat/conversation/+server.ts (via serverChatContextService)
const chatContext = await chatContextService.prepareContextForChat(
  message,
  options,
);
const enhancedPrompt = chatContextService.createContextAwareSystemPrompt(
  basePrompt,
  chatContext,
  userRole,
);
```

### 4. Session Management Integration

```typescript
// Real-time session context
// src/lib/session/manager.ts
sessionManager.on("transcript:updated", async (sessionData) => {
  await sessionContextService.updateSessionContext(
    sessionData.sessionId,
    sessionData,
    newTranscripts,
    contextOptions,
  );
});
```

## Security Architecture

### Access Control Matrix

| Tool                    | Authentication | Profile Ownership | Clinical Role | Rate Limit | Sensitivity |
| ----------------------- | -------------- | ----------------- | ------------- | ---------- | ----------- |
| searchDocuments         | ✅             | ✅                | ❌            | 100/min    | Medium      |
| getProfileData          | ✅             | ✅                | ❌            | 20/min     | High        |
| getMedicationHistory    | ✅             | ✅                | ❌            | 20/min     | Critical    |
| generateClinicalSummary | ✅             | ✅                | ✅            | 5/min      | Critical    |

### Audit Trail Example

```json
{
  "id": "audit_1637123456789_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "userId": "user_123",
  "profileId": "profile_456",
  "toolName": "getMedicationHistory",
  "operation": "medication_access",
  "result": "success",
  "sensitivityLevel": "critical",
  "dataAccessed": ["5 medications", "3 interactions"],
  "processingTimeMs": 245
}
```

## Performance Characteristics

### Current Performance Metrics

- **Context Assembly**: <500ms for typical patient history
- **Term-based Search**: in-memory filtering over decrypted document metadata
- **Memory Usage**: ~10MB per 1000 documents (encrypted)
- **Security Validation**: <50ms per tool call

### Scalability Targets

- **Document Capacity**: 10,000+ documents per profile
- **Search Performance**: <200ms with 10,000 documents
- **Concurrent Users**: 1000+ simultaneous context operations

## Usage Examples

### 1. Medical Document Search

```typescript
import { secureMcpTools, buildSecurityContextFromBrowser } from "$lib/context";

// Search for diabetes-related documents
const context = buildSecurityContextFromBrowser(user, profileId);
const results = await secureMcpTools.searchDocuments(context, {
  query: "diabetes medication management",
  limit: 10,
  documentTypes: ["consultation", "prescription", "lab_result"],
  threshold: 0.7,
});
```

### 2. AI Chat with Medical Context

```typescript
import { chatContextService } from "$lib/context";

// Prepare context for AI conversation
const chatContext = await chatContextService.prepareContextForChat(
  "What medications am I currently taking?",
  {
    profileId: userProfileId,
    maxTokens: 2000,
    includeDocuments: true,
    documentTypes: ["prescription", "medication"],
  },
);

// Enhanced system prompt with medical context
const systemPrompt = chatContextService.createContextAwareSystemPrompt(
  basePrompt,
  chatContext,
  "patient",
);
```

### 3. Real-time Session Context

```typescript
import { sessionContextService } from "$lib/context";

// Initialize session with medical context
const sessionContext = await sessionContextService.initializeSessionContext(
  sessionId,
  sessionData,
  {
    profileId: patientId,
    includeRecentTranscripts: true,
    priorityTypes: ["diagnosis", "medication", "allergy"],
  },
);

// Update context during session
await sessionContextService.updateSessionContext(
  sessionId,
  updatedSessionData,
  newTranscripts,
  contextOptions,
);
```

### 4. Medical Pattern Analysis

```typescript
// Advanced medical analysis
const patterns = await secureMcpTools.identifyMedicalPatterns(context, {
  patternType: "medication_effects",
  focusArea: "cardiovascular",
  confidenceThreshold: 0.8,
  includeHypotheses: true,
});

const timeline = await secureMcpTools.getPatientTimeline(context, {
  startDate: "2023-01-01",
  endDate: "2024-01-01",
  eventTypes: ["medication", "diagnosis", "procedure"],
  includeDetails: true,
});
```

## Development Workflow

### 1. Adding New MCP Tools

```typescript
// 1. Add tool definition
static getToolDefinitions(): MCPTool[] {
  return [
    // ... existing tools
    {
      name: 'newMedicalTool',
      description: 'Description of new tool functionality',
      inputSchema: {
        type: 'object',
        properties: { /* tool parameters */ },
        required: ['requiredParam']
      }
    }
  ];
}

// 2. Implement tool method
async newMedicalTool(params: any, profileId: string): Promise<MCPToolResult> {
  // Implementation
}

// 3. Add security wrapper
newMedicalTool: async (context: MCPSecurityContext, params: any) => {
  return await medicalExpertTools.secureToolCall(
    'newMedicalTool',
    'tool_operation',
    context,
    params,
    () => medicalExpertTools.newMedicalTool(params, context.profileId)
  );
}

// 4. Configure security policy
this.accessPolicies.set('newMedicalTool', {
  requireAuthentication: true,
  requireProfileOwnership: true,
  sensitivityLevel: 'medium',
  rateLimit: { maxRequests: 30, windowMs: 60000 }
});
```

### 2. Testing Context System

```typescript
import { buildTestSecurityContext } from "$lib/context";

// Create test context
const testContext = buildTestSecurityContext("user123", "profile456");

// Test tool access
const result = await secureMcpTools.searchDocuments(testContext, {
  query: "test medical query",
});

// Verify audit logging
const auditEntries = await mcpSecurityService.getAuditTrail("profile456", {
  toolName: "searchDocuments",
  limit: 10,
});
```

### 3. Monitoring and Debugging

```typescript
// Enable context system logging
window.logger.context = true;
window.logger.MCPAudit = true;

// Check context database status
const contextStats = profileContextManager.getProfileContextStats(profileId);
console.log({
  documentCount: contextStats.documentCount,
  memoryUsage: contextStats.memoryUsageMB,
  lastAccess: contextStats.lastAccess,
});

// Validate security context
const validation = validateSecurityContext(securityContext);
if (!validation.valid) {
  console.error("Security context errors:", validation.errors);
}
```

## Migration and Compatibility

### From Previous Systems

The Context Management System is designed to work alongside existing Mediqom systems:

- **Document System**: Automatic context generation on document save
- **Health data (meta-history)**: Compatible with flat entry types, see [HEALTH_DATA.md](HEALTH_DATA.md)
- **Session Management**: Non-breaking integration with existing sessions
- **Chat System**: Optional context enhancement for existing chat

### Backward Compatibility

```typescript
// Legacy tools continue to work
const legacyResult = await mcpTools.searchDocuments(profileId, params);

// New secure tools available
const secureResult = await secureMcpTools.searchDocuments(context, params);
```

## Best Practices

### 1. Security-First Development

```typescript
// ✅ Always use secure tools in production
const result = await secureMcpTools.toolName(securityContext, params);

// ✅ Handle security errors gracefully
try {
  const result = await secureMcpTools.getMedicationHistory(context, params);
} catch (error) {
  if (error.message.includes("Access denied")) {
    return { error: "Access not authorized for this operation" };
  }
  throw error;
}
```

### 2. Context Assembly Optimization

```typescript
// ✅ Use appropriate token limits
const context = await contextAssembler.assembleContextForAI(results, query, {
  maxTokens: 2000, // For real-time: 1000-2000, for analysis: 3000-5000
  includeMetadata: true,
  priorityTypes: ["medication", "diagnosis"], // Focus on relevant types
});
```

### 3. Profile Context Management

```typescript
// ✅ Initialize context when needed
if (!profileContextManager.getProfileContextStats(profileId)) {
  await profileContextManager.initializeProfileContext(profileId);
}

// ✅ Handle context loading gracefully
const contextStats = profileContextManager.getProfileContextStats(profileId);
if (!contextStats || contextStats.documentCount === 0) {
  return { message: "No medical context available yet" };
}
```

## Troubleshooting

### Common Issues

1. **Context Not Available**

   ```typescript
   // Check profile context initialization
   const stats = profileContextManager.getProfileContextStats(profileId);
   if (!stats) {
     await profileContextManager.initializeProfileContext(profileId);
   }
   ```

2. **Slow Search Performance**

   ```typescript
   // Use smaller result limits and higher thresholds
   const results = await secureMcpTools.searchDocuments(context, {
     query: searchQuery,
     limit: 10, // Reduce from default 20
     threshold: 0.7, // Increase from default 0.6
   });
   ```

3. **Security Access Denied**

   ```typescript
   // Verify security context is complete
   const validation = validateSecurityContext(context);
   if (!validation.valid) {
     console.error("Context validation failed:", validation.errors);
   }
   ```

4. **Document not found by search**
   - Check that the document has a `medicalTerms` array. Terms are generated at import by `medical-terms-generation.ts`, and documents without terms only match by category. There are no embeddings to regenerate.

### Debug Tools

```typescript
// Context system health check
const healthCheck = {
  profileContext: profileContextManager.getProfileContextStats(profileId),
  securityService: mcpSecurityService.constructor.name,
  recentAudit: await mcpSecurityService.getAuditTrail(profileId, { limit: 5 }),
};

console.log("Context System Health:", healthCheck);
```

## Future Enhancements

### Phase 1: Advanced Analytics (📋 Planned)

- Medical trend prediction algorithms
- Cross-patient pattern recognition (anonymized)
- Automated clinical insight generation
- Advanced medical NLP integration

### Phase 2: Enhanced Integration (📋 Planned)

- Real-time streaming context updates
- External medical system APIs
- FHIR standard compliance
- Multi-tenant enterprise features

### Phase 3: AI Capabilities (📋 Planned)

- Custom medical AI model integration
- Specialized embedding models for medical data
- Automated medical coding and billing
- Clinical decision support systems

## Conclusion

The Context Management System transforms Mediqom into an intelligent medical platform that understands and contextualizes patient information. By combining term-based medical search, intelligent context assembly, comprehensive MCP tools, and robust security, it enables:

- **AI-Powered Medical Conversations** with complete patient context
- **Real-time Clinical Decision Support** during medical consultations
- **Term-based Medical Search** across all patient documents
- **HIPAA-Compliant Data Access** with complete audit trails
- **Extensible Medical Intelligence** platform for future AI capabilities

The system maintains Mediqom's core principles of privacy, security, and user control while providing the foundation for advanced medical AI applications and clinical intelligence features.
