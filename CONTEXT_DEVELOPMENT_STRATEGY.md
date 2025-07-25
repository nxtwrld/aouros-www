# Mediqom Context & Embeddings Development Strategy

## Executive Summary

This document outlines a comprehensive strategy for implementing contextual AI retrieval and embeddings within Mediqom's existing architecture. The solution provides intelligent context attachment for AI chat features while maintaining the platform's robust encryption, multi-provider AI, and real-time capabilities.

**Key Goals:**
1. Enable fast, relevant document retrieval for AI chat context
2. Integrate seamlessly with existing encryption and session management
3. Support multi-provider embeddings for redundancy and optimization
4. Ensure documents are searchable while maintaining privacy
5. Remove embeddings when documents are deleted

## Current Architecture Integration

### Leveraging Existing Systems

**Encryption Foundation:**
- Extend existing AES-GCM + RSA encryption to protect embedding vectors
- Use current document key sharing system for multi-user context access
- Maintain client-side encryption before Supabase storage

**Session Integration:**
- Utilize existing real-time session manager for context updates
- Leverage EventEmitter architecture for live context changes
- Integrate with current OpenAI thread management

**AI Provider Abstraction:**
- Extend current multi-provider system (OpenAI, Gemini, Claude) with embedding models
- Use existing YAML-based model configuration for embedding provider selection
- Leverage current cost optimization and fallback mechanisms

**Document System:**
- Integrate with existing document types (profile, document, health)
- Use current document state management (NEW, PROCESSING, PROCESSED)
- Extend document metadata structure for embedding references

## Multi-Provider Embedding Approaches

### Option 1: Embedded Storage with Document Metadata ⭐ **RECOMMENDED**

**Architecture:**
```typescript
interface EncryptedDocumentWithEmbedding {
  // Existing document structure
  id: string;
  content: EncryptedData;
  metadata: EncryptedMetadata;
  
  // New embedding fields
  embedding_summary: string; // Plain text summary for embedding
  embedding_vector: EncryptedData; // Encrypted embedding vector
  embedding_provider: string; // 'openai' | 'local' | 'gemini'
  embedding_model: string; // Model version for compatibility
  embedding_timestamp: string;
}
```

**Pros:**
- ✅ **Fast reconstruction** - embeddings loaded with document metadata
- ✅ **Simple architecture** - single table, existing encryption system
- ✅ **Automatic cleanup** - embeddings deleted with documents
- ✅ **Multi-provider support** - easy to store different embedding types
- ✅ **Client-side search** - decrypt and search in browser memory

**Cons (Updated for Client-Side Workflow):**
- ⚠️ **Memory usage** - all embeddings loaded into client memory (acceptable for 10-100 docs)
- ⚠️ **Initial decryption overhead** - bulk decryption on chat initiation (one-time cost)
- ⚠️ **Browser storage limits** - IndexedDB quotas for offline caching (mitigated by server storage)

**Workflow Benefits:**
- ✅ **One-time decryption** - decrypt all embeddings once during chat initiation
- ✅ **Optimized memory layout** - Float32Array for efficient similarity calculations
- ✅ **Parallel processing** - bulk decryption uses Promise.all for speed
- ✅ **Selective loading** - only load documents that have embeddings
- ✅ **Perfect privacy** - no embedding vectors sent to server during search

**Implementation for Client-Side Workflow:**
```typescript
// Storage: Extend existing document structure
interface EncryptedDocumentWithEmbedding {
  // Existing document structure
  id: string;
  content: EncryptedData;
  metadata: EncryptedMetadata;
  
  // New embedding fields
  embedding_summary: string; // Plain text summary for embedding
  embedding_vector: EncryptedData; // Encrypted embedding vector
  embedding_provider: string; // 'openai' | 'local' | 'gemini'
  embedding_model: string; // Model version for compatibility
  embedding_timestamp: string;
}

// User Profile Initialization: Bulk decryption and database population
class ClientSideEmbeddingLoader {
  async initializeVectorDatabaseOnProfileLoad(
    userDocuments: Document[], 
    userKeys: CryptoKeyPair
  ): Promise<ClientContextDatabase> {
    // 1. Filter documents with embeddings (already loaded during profile init)
    const documentsWithEmbeddings = userDocuments.filter(doc => doc.embedding_vector);
    
    // 2. Bulk decrypt all embeddings in parallel (optimized)
    const decryptionPromises = documentsWithEmbeddings
      .map(async (doc) => {
        const decryptedVector = await this.decryptEmbedding(
          doc.embedding_vector, 
          userKeys
        );
        return {
          documentId: doc.id,
          vector: new Float32Array(decryptedVector),
          summary: doc.embedding_summary,
          metadata: {
            date: doc.created_at,
            type: doc.type,
            provider: doc.embedding_provider,
            model: doc.embedding_model
          }
        };
      });
    
    const decryptedEmbeddings = await Promise.all(decryptionPromises);
    
    // 3. Build optimized in-memory database for search
    const database = new ClientContextDatabase();
    for (const embedding of decryptedEmbeddings) {
      database.vectors.set(embedding.documentId, embedding.vector);
      database.metadata.set(embedding.documentId, embedding.metadata);
      database.summaries.set(embedding.documentId, embedding.summary);
    }
    
    return database;
  }
  
  // Fallback: Lazy loading for chat initiation if not already loaded
  async loadAllEmbeddingsForChat(userId: string): Promise<ClientContextDatabase> {
    // Check if already loaded during profile initialization
    if (this.existingDatabase) {
      return this.existingDatabase;
    }
    
    // Fallback to loading during chat (original approach)
    const userDocuments = await this.documentsStore.getUserDocuments(userId);
    return this.initializeVectorDatabaseOnProfileLoad(userDocuments, this.userProfile.keys);
  }
}

// Document Store: Lazy loading for UI (only when needed)
export const documentsWithEmbeddings = derived(
  [documents, userProfile], 
  ([docs, profile]) => {
    // Only decrypt for UI display, not for search
    return docs.map(doc => ({
      ...doc,
      hasEmbedding: !!doc.embedding_vector,
      embeddingProvider: doc.embedding_provider,
      embeddingModel: doc.embedding_model
    }));
  }
);
```

### Option 2: Dedicated Embeddings Table

**Architecture:**
```typescript
interface DocumentEmbedding {
  id: string;
  document_id: string;
  user_id: string;
  encrypted_vector: EncryptedData;
  encrypted_summary: EncryptedData;
  provider: string;
  model: string;
  created_at: string;
  shared_with: string[]; // User IDs with access
}
```

**Pros:**
- ✅ **Optimized queries** - can query embeddings without loading documents
- ✅ **Flexible sharing** - independent embedding access control
- ✅ **Storage efficiency** - can store multiple embedding versions
- ✅ **Scalable** - better for large document collections

**Cons:**
- ⚠️ **Complex cleanup** - need triggers to delete orphaned embeddings
- ⚠️ **Additional queries** - separate requests for embeddings and documents
- ⚠️ **Consistency issues** - embeddings could become out of sync

### Option 3: IndexedDB Client-Side Vector Store

**Architecture:**
```typescript
interface ClientVectorStore {
  db: IDBDatabase;
  collections: {
    [userId: string]: {
      vectors: Float32Array[];
      metadata: DocumentMetadata[];
      index: VectorIndex;
    }
  };
}
```

**Pros:**
- ✅ **Offline capability** - works without server connection
- ✅ **Fast similarity search** - optimized vector operations
- ✅ **Privacy focused** - vectors never leave client
- ✅ **Scalable search** - can handle large vector collections

**Cons:**
- ⚠️ **Sync complexity** - need to sync with server state
- ⚠️ **Storage limits** - browser storage quotas
- ⚠️ **Rebuild overhead** - need to reconstruct on new devices
- ⚠️ **No server-side search** - can't search from backend

## Recommended Implementation Strategy

### Client-Side Search Architecture ⭐ **OPTIMAL FOR YOUR WORKFLOW**

**Your Optimized Workflow Integration:**
1. **User Profile Load** → Decrypt all user embeddings and populate client-side database
2. **Chat Initiation** → Database already ready, instant chat start
3. **Client-Side Search** → Perform similarity search entirely in browser memory
4. **Context Assembly** → Extract key points and relevant context
5. **AI Integration** → Pass only essential context to AI providers

**Why this approach is perfect:**
- ✅ **Complete Privacy** - No embedding vectors ever sent to servers during search
- ✅ **Fast Search** - In-memory vector operations, no network latency
- ✅ **Builds on existing patterns** - Leverages proven encryption system
- ✅ **Optimal for 10-100 documents** - Efficient memory usage for your user base
- ✅ **Real-time capability** - Instant context updates during chat

### Phase 1: Foundation (Client-Side Embedded Storage)

**Core Module Structure:**
```
src/lib/context/
├── client-database/
│   ├── memory-store.ts     # In-memory embedding database
│   ├── vector-search.ts    # Client-side similarity search
│   ├── decryption.ts       # Bulk embedding decryption
│   └── initialization.ts   # Chat initiation database setup
├── embeddings/
│   ├── providers/          # Multi-provider embedding generation
│   │   ├── openai.ts      # OpenAI text-embedding-3-small
│   │   ├── local.ts       # Future: local embedding models
│   │   └── abstraction.ts # Provider interface
│   ├── storage.ts         # Encrypted embedding storage (Supabase)
│   └── manager.ts         # Embedding lifecycle management
├── context-assembly/
│   ├── relevance-ranking.ts # Time decay and similarity scoring
│   ├── key-points.ts       # Extract key medical insights
│   ├── context-composer.ts # Assemble context for AI prompts
│   └── token-optimization.ts # Optimize context within token limits
├── chat-integration/
│   ├── context-provider.ts # Real-time context during chat
│   ├── session-integration.ts # Session manager integration
│   └── ai-context-injection.ts # Context injection for AI providers
└── index.ts               # Main context system API
```

### Profile Loading Integration

**Integrate with Existing Profile Loading Workflow:**
```typescript
// Enhanced loadProfiles function in src/lib/profiles/index.ts
export async function loadProfiles(fetch = undefined, force = false) {
  // ... existing profile loading logic ...
  
  const profilesExtended = await Promise.all(
    profilesLoaded.map(async (d) => {
      // ... existing document loading ...
      const roots = await importDocuments(rootsEncrypted);
      
      // NEW: Initialize context for this profile
      await profileContextManager.initializeProfileContext(
        d.profiles.id,
        {
          generateMissingEmbeddings: true,
          onProgress: (status, progress) => {
            console.log(`Context init for ${d.profiles.id}: ${status} (${progress}%)`);
          }
        }
      );
      
      return mapProfileData(d, roots);
    })
  );
}
```

**Context Initialization Process:**
1. **Document Loading** - Load all profile documents (leverages existing loadDocuments)
2. **Embedding Generation** - Generate embeddings for suitable documents
3. **Encryption** - Encrypt embedding vectors with document's AES keys
4. **Context Database** - Build in-memory context database for fast search
5. **Real-time Ready** - Context available immediately for chat/search

### Document Processing Pipeline Integration

**Extend Existing LangGraph Workflow:**
```typescript
// Add new node to unified-workflow.ts
.addNode("generate_embedding", generateDocumentEmbedding)
.addNode("store_embedding", storeEncryptedEmbedding)

// Insert after document processing
.addEdge("validate_final_output", "generate_embedding")
.addEdge("generate_embedding", "store_embedding")
.addEdge("store_embedding", "finalize_processing")
```

**Embedding Generation Process:**
1. **Document Summary Creation** - Generate plain text summary optimized for embeddings
2. **Multi-Provider Generation** - Create embeddings using selected provider
3. **Encryption** - Encrypt embedding vector with document's AES key
4. **Storage** - Store encrypted embedding with document metadata
5. **Context Update** - Update existing context databases for active profiles

### Retrieval System Design

**Hybrid Search Strategy:**
```typescript
interface ContextRetrieval {
  // Primary semantic search
  semanticSearch(query: string, filters?: SearchFilters): Promise<ContextMatch[]>;
  
  // Metadata-enhanced search
  hybridSearch(query: string, metadata: MetadataFilters): Promise<ContextMatch[]>;
  
  // Time-weighted relevance
  temporalSearch(query: string, timeDecay?: TimeDecayConfig): Promise<ContextMatch[]>;
  
  // Context assembly for AI
  assembleContext(matches: ContextMatch[], maxTokens: number): Promise<AssembledContext>;
}
```

**Ranking Algorithm:**
```typescript
const calculateRelevanceScore = (match: EmbeddingMatch, timeDecay: TimeDecayConfig) => {
  const cosineSimilarity = dotProduct(queryVector, documentVector);
  const daysSince = (Date.now() - new Date(match.document.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const temporalWeight = Math.exp(-daysSince / timeDecay.halfLifeDays);
  
  return cosineSimilarity * temporalWeight;
};
```

## Client-Side Workflow Implementation

### Chat Initiation Database Population

**Step 1: Chat Session Start**
```typescript
interface ClientContextDatabase {
  // In-memory embedding database
  embeddings: Map<string, DocumentEmbedding>; // documentId -> embedding
  metadata: Map<string, DocumentMetadata>;    // documentId -> metadata
  vectors: Map<string, Float32Array>;         // documentId -> vector
  summaries: Map<string, string>;             // documentId -> summary
  index: VectorSearchIndex;                   // Fast similarity search
}

class ChatContextInitializer {
  async initializeChatContext(userId: string): Promise<ClientContextDatabase> {
    // 1. Fetch all user documents with encrypted embeddings
    const userDocuments = await this.documentsStore.getUserDocuments(userId);
    
    // 2. Decrypt all embeddings in parallel
    const decryptedEmbeddings = await Promise.all(
      userDocuments.map(doc => this.decryptDocumentEmbedding(doc))
    );
    
    // 3. Build in-memory database
    const database = new ClientContextDatabase();
    for (const embedding of decryptedEmbeddings) {
      database.embeddings.set(embedding.documentId, embedding);
      database.vectors.set(embedding.documentId, new Float32Array(embedding.vector));
      database.metadata.set(embedding.documentId, embedding.metadata);
      database.summaries.set(embedding.documentId, embedding.summary);
    }
    
    // 4. Build search index for fast similarity queries
    database.index = this.buildVectorSearchIndex(database.vectors);
    
    return database;
  }
}
```

**Step 2: Client-Side Vector Search**
```typescript
class ClientSideVectorSearch {
  async searchSimilarDocuments(
    query: string, 
    database: ClientContextDatabase,
    options: SearchOptions = {}
  ): Promise<ContextMatch[]> {
    // 1. Generate embedding for query
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
    const queryVector = new Float32Array(queryEmbedding);
    
    // 2. Perform similarity search entirely in browser memory
    const similarities = new Map<string, number>();
    
    for (const [docId, docVector] of database.vectors) {
      const similarity = this.cosineSimilarity(queryVector, docVector);
      similarities.set(docId, similarity);
    }
    
    // 3. Rank and filter results
    const rankedResults = Array.from(similarities.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, options.maxResults || 10)
      .filter(([,similarity]) => similarity > (options.threshold || 0.7));
    
    // 4. Apply metadata filtering and time decay
    return this.applyAdvancedFiltering(rankedResults, database, options);
  }
  
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

**Step 3: Context Assembly & Key Points Extraction**
```typescript
class ContextAssembler {
  async assembleContextForAI(
    matches: ContextMatch[],
    query: string,
    maxTokens: number = 4000
  ): Promise<AssembledContext> {
    // 1. Extract key medical insights from top matches
    const keyPoints = await this.extractKeyPoints(matches);
    
    // 2. Create prioritized context sections
    const contextSections = {
      patient_summary: this.buildPatientSummary(matches),
      relevant_history: this.buildRelevantHistory(matches, query),
      key_findings: keyPoints.findings,
      recent_changes: keyPoints.recentChanges,
      medications: keyPoints.medications,
      diagnostics: keyPoints.diagnostics
    };
    
    // 3. Optimize context within token limits
    const optimizedContext = await this.optimizeContextTokens(
      contextSections, 
      maxTokens
    );
    
    return {
      summary: optimizedContext.summary,
      keyPoints: optimizedContext.keyPoints,
      relevantDocuments: optimizedContext.documents,
      confidence: this.calculateContextConfidence(matches),
      tokenCount: optimizedContext.tokenCount
    };
  }
  
  private async extractKeyPoints(matches: ContextMatch[]): Promise<MedicalKeyPoints> {
    const keyPoints = {
      findings: [],
      recentChanges: [],
      medications: [],
      diagnostics: []
    };
    
    for (const match of matches.slice(0, 5)) { // Top 5 most relevant
      const summary = match.metadata.summary;
      
      // Extract structured medical information
      if (summary.includes('diagnosis') || summary.includes('finding')) {
        keyPoints.findings.push({
          text: this.extractDiagnosisText(summary),
          date: match.metadata.date,
          confidence: match.similarity
        });
      }
      
      if (summary.includes('medication') || summary.includes('treatment')) {
        keyPoints.medications.push({
          text: this.extractMedicationText(summary),
          date: match.metadata.date,
          confidence: match.similarity
        });
      }
      
      // Time-based relevance for recent changes
      if (this.isRecentDocument(match.metadata.date, 30)) {
        keyPoints.recentChanges.push({
          text: summary,
          date: match.metadata.date,
          type: match.metadata.documentType
        });
      }
    }
    
    return keyPoints;
  }
}
```

**Step 4: AI Integration with Context**
```typescript
class ContextAwareAIProvider {
  async generateResponseWithContext(
    userQuery: string,
    database: ClientContextDatabase,
    aiProvider: AIProvider
  ): Promise<ContextualAIResponse> {
    // 1. Search for relevant context
    const relevantMatches = await this.vectorSearch.searchSimilarDocuments(
      userQuery, 
      database,
      { maxResults: 8, threshold: 0.75 }
    );
    
    // 2. Assemble optimized context
    const assembledContext = await this.contextAssembler.assembleContextForAI(
      relevantMatches,
      userQuery,
      4000 // Max context tokens
    );
    
    // 3. Build enhanced prompt with context
    const enhancedPrompt = this.buildContextualPrompt(userQuery, assembledContext);
    
    // 4. Generate AI response with context
    const response = await aiProvider.generate(enhancedPrompt, {
      maxTokens: 2000,
      temperature: 0.7
    });
    
    return {
      response: response.text,
      contextUsed: assembledContext,
      relevantDocuments: relevantMatches.map(m => m.documentId),
      confidence: assembledContext.confidence
    };
  }
  
  private buildContextualPrompt(query: string, context: AssembledContext): string {
    return `
You are a medical AI assistant. Use the following patient context to provide accurate, helpful responses.

PATIENT CONTEXT:
${context.summary}

KEY MEDICAL POINTS:
${context.keyPoints.map(point => `• ${point.text} (${point.date})`).join('\n')}

RECENT CHANGES:
${context.relevantDocuments.slice(0, 3).map(doc => 
  `[${doc.date}] ${doc.type}: ${doc.excerpt}`
).join('\n')}

USER QUESTION: ${query}

Instructions:
- Reference specific information from the context when relevant
- Acknowledge if you need additional information not available in the context
- Maintain medical safety - defer to healthcare providers for medical decisions
- Be conversational and supportive while being factually accurate
`;
  }
}
```

### Memory Management & Performance

**Efficient Memory Usage:**
```typescript
class MemoryOptimizedDatabase {
  private static readonly MAX_MEMORY_MB = 50; // Limit for embeddings
  private static readonly EMBEDDINGS_PER_MB = 1000; // Approximate
  
  async optimizeMemoryUsage(database: ClientContextDatabase): Promise<void> {
    const embeddingCount = database.embeddings.size;
    const estimatedMemoryMB = embeddingCount / this.EMBEDDINGS_PER_MB;
    
    if (estimatedMemoryMB > this.MAX_MEMORY_MB) {
      // Implement LRU cache or prioritization
      await this.compressOlderEmbeddings(database);
    }
  }
  
  // Optional: Lazy loading for large document sets
  async lazyLoadEmbeddings(
    documentIds: string[], 
    database: ClientContextDatabase
  ): Promise<void> {
    const neededEmbeddings = documentIds.filter(id => 
      !database.embeddings.has(id)
    );
    
    if (neededEmbeddings.length > 0) {
      const embeddings = await this.fetchAndDecryptEmbeddings(neededEmbeddings);
      for (const embedding of embeddings) {
        database.embeddings.set(embedding.documentId, embedding);
        database.vectors.set(embedding.documentId, new Float32Array(embedding.vector));
      }
    }
  }
}
```

### Integration with Existing Session Manager

**Enhanced Session Manager:**
```typescript
// Extend existing session manager
export class ContextAwareSessionManager extends SessionManager {
  private contextDatabases = new Map<string, ClientContextDatabase>();
  
  async startChatSession(userId: string, sessionId: string): Promise<ChatSession> {
    // 1. Initialize regular session
    const session = await super.createSession(sessionId, userId);
    
    // 2. Initialize context database for this user
    console.log(`Initializing context database for user ${userId}...`);
    const contextDatabase = await this.contextInitializer.initializeChatContext(userId);
    this.contextDatabases.set(sessionId, contextDatabase);
    
    // 3. Emit context ready event
    this.emitter.emit('context-ready', { 
      sessionId, 
      documentCount: contextDatabase.embeddings.size 
    });
    
    return session;
  }
  
  async getContextualResponse(
    sessionId: string, 
    userQuery: string
  ): Promise<ContextualAIResponse> {
    const database = this.contextDatabases.get(sessionId);
    if (!database) {
      throw new Error('Context database not initialized for session');
    }
    
    // Generate response with context
    const response = await this.contextAwareAI.generateResponseWithContext(
      userQuery,
      database,
      this.getCurrentAIProvider()
    );
    
    // Emit real-time update with context info
    this.emitter.emit('context-response', { 
      sessionId, 
      response,
      documentsUsed: response.relevantDocuments.length
    });
    
    return response;
  }
}
```

## MCP Integration for Dynamic Document Access

### MCP Tools Design

**Core MCP Tools for Document Access:**
```typescript
interface MediqomMCPTools {
  // Tool 1: Get specific document details
  get_document_details: {
    name: "get_document_details";
    description: "Retrieve full content and metadata of a specific medical document";
    parameters: {
      documentId: string;
      sections?: string[]; // Optional: specific sections to retrieve
    };
    handler: (params: GetDocumentParams) => Promise<DocumentContent>;
  };

  // Tool 2: Search documents by medical criteria
  search_patient_documents: {
    name: "search_patient_documents";
    description: "Search patient documents using medical terms, conditions, or time periods";
    parameters: {
      query: string;
      filters?: {
        documentType?: 'lab' | 'diagnosis' | 'treatment' | 'imaging';
        dateRange?: { start: string; end: string };
        provider?: string;
        urgency?: 'high' | 'medium' | 'low';
      };
      maxResults?: number;
    };
    handler: (params: SearchParams) => Promise<SearchResults>;
  };

  // Tool 3: Get related documents
  get_related_documents: {
    name: "get_related_documents";
    description: "Find documents related to a specific condition, medication, or finding";
    parameters: {
      relatedTo: string; // condition, medication, or finding
      relationshipType?: 'cause' | 'effect' | 'treatment' | 'monitoring';
      timeframe?: string; // e.g., "last 6 months", "since diagnosis"
    };
    handler: (params: RelatedParams) => Promise<RelatedDocuments>;
  };

  // Tool 4: Get document timeline
  get_document_timeline: {
    name: "get_document_timeline";
    description: "Get chronological timeline of documents for a specific condition or overall";
    parameters: {
      condition?: string; // Optional: focus on specific condition
      timeRange?: { start: string; end: string };
      includeTypes?: string[]; // Document types to include
    };
    handler: (params: TimelineParams) => Promise<DocumentTimeline>;
  };
}
```

**MCP Tool Handlers Implementation:**
```typescript
class MediqomMCPHandler {
  constructor(
    private contextDatabase: ClientContextDatabase,
    private documentsStore: DocumentStore,
    private encryptionService: EncryptionService
  ) {}

  async handleGetDocumentDetails(params: GetDocumentParams): Promise<DocumentContent> {
    // 1. Verify document access permissions
    const hasAccess = await this.verifyDocumentAccess(params.documentId);
    if (!hasAccess) {
      throw new Error("Access denied to document");
    }

    // 2. Fetch and decrypt document
    const document = await this.documentsStore.getDocument(params.documentId);
    const decryptedContent = await this.encryptionService.decryptDocument(
      document.content,
      this.userKeys
    );

    // 3. Extract requested sections or return full content
    const sections = params.sections 
      ? this.extractSections(decryptedContent, params.sections)
      : decryptedContent;

    return {
      documentId: params.documentId,
      content: sections,
      metadata: document.metadata,
      lastModified: document.lastModified
    };
  }

  async handleSearchPatientDocuments(params: SearchParams): Promise<SearchResults> {
    // 1. Use existing vector search for semantic matching
    const semanticMatches = await this.vectorSearch.searchSimilarDocuments(
      params.query,
      this.contextDatabase,
      { maxResults: params.maxResults || 10 }
    );

    // 2. Apply additional filters
    const filteredMatches = this.applySearchFilters(semanticMatches, params.filters);

    // 3. Return enriched results
    return {
      matches: filteredMatches.map(match => ({
        documentId: match.documentId,
        relevanceScore: match.similarity,
        excerpt: match.metadata.summary,
        documentType: match.metadata.type,
        date: match.metadata.date
      })),
      totalResults: filteredMatches.length,
      searchQuery: params.query
    };
  }

  async handleGetRelatedDocuments(params: RelatedParams): Promise<RelatedDocuments> {
    // 1. Find documents semantically related to the condition/finding
    const relatedMatches = await this.vectorSearch.searchSimilarDocuments(
      params.relatedTo,
      this.contextDatabase,
      { threshold: 0.6 }
    );

    // 2. Filter by relationship type and timeframe
    const filteredRelated = this.filterByRelationship(
      relatedMatches,
      params.relationshipType,
      params.timeframe
    );

    // 3. Group by relationship strength
    return {
      primaryRelated: filteredRelated.filter(doc => doc.similarity > 0.8),
      secondaryRelated: filteredRelated.filter(doc => doc.similarity > 0.6 && doc.similarity <= 0.8),
      relatedTo: params.relatedTo,
      relationshipType: params.relationshipType
    };
  }

  async handleGetDocumentTimeline(params: TimelineParams): Promise<DocumentTimeline> {
    // 1. Get all documents in timeframe
    const allDocuments = Array.from(this.contextDatabase.metadata.entries())
      .filter(([id, metadata]) => this.isInTimeRange(metadata.date, params.timeRange));

    // 2. Filter by condition if specified
    const relevantDocuments = params.condition
      ? await this.filterByCondition(allDocuments, params.condition)
      : allDocuments;

    // 3. Build chronological timeline
    const timeline = relevantDocuments
      .sort((a, b) => new Date(a[1].date).getTime() - new Date(b[1].date).getTime())
      .map(([id, metadata]) => ({
        documentId: id,
        date: metadata.date,
        type: metadata.type,
        summary: this.contextDatabase.summaries.get(id),
        significance: this.calculateSignificance(metadata)
      }));

    return {
      timeline,
      condition: params.condition,
      timeRange: params.timeRange,
      totalDocuments: timeline.length
    };
  }
}
```

### MCP Integration with AI Providers

**Enhanced AI Provider with MCP Tools:**
```typescript
class MCPEnhancedAIProvider extends ContextAwareAIProvider {
  private mcpHandler: MediqomMCPHandler;

  async generateResponseWithMCPTools(
    userQuery: string,
    database: ClientContextDatabase,
    aiProvider: AIProvider
  ): Promise<ContextualAIResponse> {
    // 1. Initial context search (as before)
    const initialContext = await this.getInitialContext(userQuery, database);

    // 2. Register MCP tools with AI provider
    const mcpTools = this.registerMCPTools();

    // 3. Generate response with tool access
    const response = await aiProvider.generateWithTools(
      this.buildMCPEnhancedPrompt(userQuery, initialContext),
      {
        tools: mcpTools,
        maxToolCalls: 5, // Limit to prevent infinite loops
        toolCallHandler: this.handleToolCall.bind(this)
      }
    );

    return {
      response: response.text,
      contextUsed: initialContext,
      toolCallsMade: response.toolCalls,
      documentsAccessed: this.getAccessedDocuments(response.toolCalls)
    };
  }

  private buildMCPEnhancedPrompt(query: string, context: AssembledContext): string {
    return `
You are a medical AI assistant with access to a patient's complete medical record.

INITIAL CONTEXT:
${context.summary}

AVAILABLE TOOLS:
- get_document_details: Get full content of specific documents
- search_patient_documents: Search for documents matching medical criteria
- get_related_documents: Find documents related to conditions or findings
- get_document_timeline: Get chronological timeline of medical events

INSTRUCTIONS:
- Start with the initial context provided
- Use tools to access additional relevant documents when needed
- Reference specific document IDs when citing information
- Provide comprehensive, well-sourced responses

USER QUESTION: ${query}
`;
  }
}
```

### Benefits of MCP Integration

**1. Dynamic Context Discovery**
- AI can explore beyond initial context based on conversation flow
- Follow-up questions trigger relevant document retrieval
- Iterative refinement of understanding

**2. Token Efficiency**
- Avoid overwhelming initial context with irrelevant documents
- Load only what's needed for current conversation thread
- Preserve tokens for actual dialogue

**3. Intelligent Document Navigation**
- AI can request specific document types or sections
- Cross-reference related findings across documents
- Build comprehensive understanding progressively

**4. Enhanced User Experience**
- More accurate responses based on complete document access
- Transparent document sourcing with specific IDs
- Ability to dive deeper into medical history as needed

## Medical Expert MCP Tools Extension

### Enhanced MCP Tools for Medical AI Analysis

The context system is extended with specialized MCP tools designed specifically for medical AI expert analysis, particularly for integration with the Mixture of Experts (MoE) system. These tools provide structured access to medical data beyond basic document retrieval.

**Medical Expert MCP Tools Interface:**
```typescript
interface MedicalExpertMCPTools extends MediqomMCPTools {
  // Tool 5: Get structured medical timeline with clinical significance
  get_medical_timeline: {
    name: "get_medical_timeline";
    description: "Retrieve chronological medical timeline with clinical significance scoring and event correlation";
    parameters: {
      patientId: string;
      timeRange?: { start: string; end: string };
      medicalDomain?: 'cardiovascular' | 'respiratory' | 'endocrine' | 'neurological' | 'all';
      includeCategories?: ('diagnosis' | 'treatment' | 'medication' | 'procedure' | 'test_result')[];
      significanceThreshold?: number; // 0-1 scale for clinical significance
    };
    handler: (params: MedicalTimelineParams) => Promise<MedicalTimeline>;
  };

  // Tool 6: Search for medical patterns and correlations
  search_medical_patterns: {
    name: "search_medical_patterns";
    description: "Identify patterns, correlations, and trends across patient's medical history using temporal analysis";
    parameters: {
      patientId: string;
      patternType: 'symptom_progression' | 'treatment_response' | 'diagnostic_correlation' | 'risk_factors' | 'medication_adherence';
      lookbackPeriod?: string; // e.g., "6 months", "2 years", "lifetime"
      correlationThreshold?: number; // Minimum correlation strength
      includeContext?: boolean; // Include surrounding medical context
    };
    handler: (params: MedicalPatternsParams) => Promise<MedicalPatterns>;
  };

  // Tool 7: Get comprehensive risk stratification
  get_risk_stratification: {
    name: "get_risk_stratification";
    description: "Calculate comprehensive risk factors including demographic, clinical, and behavioral risks";
    parameters: {
      patientId: string;
      riskCategories?: ('demographic' | 'clinical' | 'behavioral' | 'genetic' | 'social' | 'environmental')[];
      riskConditions?: string[]; // Specific conditions to assess risk for
      timeHorizon?: '1_month' | '6_months' | '1_year' | '5_years' | '10_years';
      includeRecommendations?: boolean;
    };
    handler: (params: RiskStratificationParams) => Promise<RiskAssessment>;
  };

  // Tool 8: Check drug interactions and medication safety
  check_drug_interactions: {
    name: "check_drug_interactions";
    description: "Analyze current and proposed medications for interactions, contraindications, and safety concerns";
    parameters: {
      patientId: string;
      currentMedications?: string[]; // Current medication list
      proposedMedications?: string[]; // Medications being considered
      includeAllergies?: boolean;
      includeMedicalConditions?: boolean;
      severityLevels?: ('contraindicated' | 'major' | 'moderate' | 'minor')[];
    };
    handler: (params: DrugInteractionParams) => Promise<DrugInteractionAnalysis>;
  };

  // Tool 9: Get structured medical data objects
  get_structured_medical_data: {
    name: "get_structured_medical_data";
    description: "Access structured meta-patient objects for specific medical data types";
    parameters: {
      patientId: string;
      dataTypes: ('medication_history' | 'allergies_reactions' | 'vital_signs' | 'lab_results' | 'family_history' | 'clinical_signals' | 'treatment_responses')[];
      timeRange?: { start: string; end: string };
      aggregationLevel?: 'raw' | 'summary' | 'trends';
    };
    handler: (params: StructuredDataParams) => Promise<StructuredMedicalData>;
  };

  // Tool 10: Analyze treatment history and effectiveness
  analyze_treatment_history: {
    name: "analyze_treatment_history";
    description: "Comprehensive analysis of treatment effectiveness, patient compliance, and outcomes";
    parameters: {
      patientId: string;
      treatmentCategories?: ('medication' | 'procedure' | 'therapy' | 'lifestyle' | 'surgical')[];
      conditions?: string[]; // Specific conditions to analyze treatments for
      effectivenessMetrics?: ('symptom_improvement' | 'lab_values' | 'patient_reported' | 'clinical_assessment')[];
      includeCompliance?: boolean;
      comparativeAnalysis?: boolean; // Compare different treatment approaches
    };
    handler: (params: TreatmentAnalysisParams) => Promise<TreatmentEffectivenessAnalysis>;
  };

  // Tool 11: Get family and genetic history insights
  get_family_genetic_history: {
    name: "get_family_genetic_history";
    description: "Access family medical history and genetic predispositions with relevance scoring";
    parameters: {
      patientId: string;
      relationshipLevels?: ('immediate' | 'extended' | 'all')[];
      conditionCategories?: ('cardiovascular' | 'cancer' | 'metabolic' | 'neurological' | 'psychiatric' | 'autoimmune')[];
      inheritancePatterns?: ('dominant' | 'recessive' | 'x_linked' | 'multifactorial')[];
      relevanceToCurrentSymptoms?: boolean;
    };
    handler: (params: FamilyHistoryParams) => Promise<FamilyGeneticInsights>;
  };

  // Tool 12: Search similar patient cases (if available)
  search_similar_cases: {
    name: "search_similar_cases";
    description: "Find similar patient presentations based on symptoms, demographics, and medical history";
    parameters: {
      referencePatientId: string;
      similarityFactors?: ('demographics' | 'symptoms' | 'medical_history' | 'risk_factors' | 'treatment_response')[];
      minSimilarityScore?: number; // 0-1 threshold
      maxResults?: number;
      anonymizeResults?: boolean;
      includeOutcomes?: boolean;
    };
    handler: (params: SimilarCasesParams) => Promise<SimilarPatientCases>;
  };
}
```

### Medical Expert MCP Tool Handlers Implementation

**Enhanced MCP Handler for Medical Expert Analysis:**
```typescript
class MedicalExpertMCPHandler extends MediqomMCPHandler {
  constructor(
    contextDatabase: ClientContextDatabase,
    documentsStore: DocumentStore,
    encryptionService: EncryptionService,
    private metaPatientStore: MetaPatientStore
  ) {
    super(contextDatabase, documentsStore, encryptionService);
  }

  async handleGetMedicalTimeline(params: MedicalTimelineParams): Promise<MedicalTimeline> {
    // 1. Verify patient access permissions
    await this.verifyPatientAccess(params.patientId);

    // 2. Retrieve structured medical events from meta-patient store
    const medicalEvents = await this.metaPatientStore.getMedicalEvents(
      params.patientId,
      params.timeRange
    );

    // 3. Apply domain and category filters
    const filteredEvents = this.filterMedicalEvents(
      medicalEvents,
      params.medicalDomain,
      params.includeCategories
    );

    // 4. Score clinical significance and correlate events
    const scoredEvents = await this.scoreClinicalSignificance(
      filteredEvents,
      params.significanceThreshold || 0.5
    );

    // 5. Build temporal correlations
    const correlatedTimeline = this.buildEventCorrelations(scoredEvents);

    return {
      patientId: params.patientId,
      timeRange: params.timeRange,
      events: correlatedTimeline,
      clinicalInsights: this.extractTimelineInsights(correlatedTimeline),
      significanceDistribution: this.calculateSignificanceDistribution(scoredEvents)
    };
  }

  async handleSearchMedicalPatterns(params: MedicalPatternsParams): Promise<MedicalPatterns> {
    // 1. Verify patient access
    await this.verifyPatientAccess(params.patientId);

    // 2. Retrieve relevant medical data based on pattern type
    const medicalData = await this.metaPatientStore.getPatternAnalysisData(
      params.patientId,
      params.patternType,
      params.lookbackPeriod
    );

    // 3. Apply pattern recognition algorithms
    const identifiedPatterns = await this.analyzePatterns(
      medicalData,
      params.patternType,
      params.correlationThreshold || 0.6
    );

    // 4. Include contextual information if requested
    const contextualPatterns = params.includeContext
      ? await this.enrichPatternsWithContext(identifiedPatterns)
      : identifiedPatterns;

    return {
      patientId: params.patientId,
      patternType: params.patternType,
      patterns: contextualPatterns,
      analysisMetadata: {
        lookbackPeriod: params.lookbackPeriod,
        correlationThreshold: params.correlationThreshold,
        dataPointsAnalyzed: medicalData.length,
        patternsFound: contextualPatterns.length
      }
    };
  }

  async handleGetRiskStratification(params: RiskStratificationParams): Promise<RiskAssessment> {
    // 1. Verify patient access
    await this.verifyPatientAccess(params.patientId);

    // 2. Gather comprehensive patient data for risk assessment
    const patientData = await this.metaPatientStore.getComprehensivePatientData(
      params.patientId
    );

    // 3. Calculate risks by category
    const riskAssessment = {
      patientId: params.patientId,
      assessmentDate: new Date().toISOString(),
      timeHorizon: params.timeHorizon || '1_year',
      riskCategories: {}
    };

    for (const category of params.riskCategories || ['demographic', 'clinical', 'behavioral']) {
      riskAssessment.riskCategories[category] = await this.calculateCategoryRisk(
        patientData,
        category,
        params.riskConditions,
        params.timeHorizon
      );
    }

    // 4. Generate recommendations if requested
    if (params.includeRecommendations) {
      riskAssessment.recommendations = await this.generateRiskMitigationRecommendations(
        riskAssessment.riskCategories
      );
    }

    return riskAssessment;
  }

  async handleCheckDrugInteractions(params: DrugInteractionParams): Promise<DrugInteractionAnalysis> {
    // 1. Verify patient access
    await this.verifyPatientAccess(params.patientId);

    // 2. Get current medications from patient record
    const currentMeds = params.currentMedications || 
      await this.metaPatientStore.getCurrentMedications(params.patientId);

    // 3. Get allergies and medical conditions if requested
    const allergies = params.includeAllergies
      ? await this.metaPatientStore.getAllergies(params.patientId)
      : [];

    const conditions = params.includeMedicalConditions
      ? await this.metaPatientStore.getMedicalConditions(params.patientId)
      : [];

    // 4. Analyze interactions
    const interactionAnalysis = await this.drugInteractionService.analyzeInteractions({
      currentMedications: currentMeds,
      proposedMedications: params.proposedMedications || [],
      patientAllergies: allergies,
      medicalConditions: conditions,
      severityLevels: params.severityLevels
    });

    return {
      patientId: params.patientId,
      analysisDate: new Date().toISOString(),
      currentMedications: currentMeds,
      proposedMedications: params.proposedMedications || [],
      interactions: interactionAnalysis.interactions,
      contraindications: interactionAnalysis.contraindications,
      warnings: interactionAnalysis.warnings,
      recommendations: interactionAnalysis.recommendations
    };
  }

  async handleGetStructuredMedicalData(params: StructuredDataParams): Promise<StructuredMedicalData> {
    // 1. Verify patient access
    await this.verifyPatientAccess(params.patientId);

    // 2. Retrieve requested data types from meta-patient store
    const structuredData = {};

    for (const dataType of params.dataTypes) {
      const rawData = await this.metaPatientStore.getStructuredData(
        params.patientId,
        dataType,
        params.timeRange
      );

      // 3. Apply aggregation level
      switch (params.aggregationLevel || 'summary') {
        case 'raw':
          structuredData[dataType] = rawData;
          break;
        case 'summary':
          structuredData[dataType] = this.summarizeData(rawData, dataType);
          break;
        case 'trends':
          structuredData[dataType] = this.calculateTrends(rawData, dataType);
          break;
      }
    }

    return {
      patientId: params.patientId,
      dataTypes: params.dataTypes,
      timeRange: params.timeRange,
      aggregationLevel: params.aggregationLevel || 'summary',
      data: structuredData,
      lastUpdated: new Date().toISOString()
    };
  }

  // Private helper methods for pattern analysis and risk calculation
  private async analyzePatterns(
    data: MedicalDataPoint[],
    patternType: string,
    threshold: number
  ): Promise<IdentifiedPattern[]> {
    // Implement pattern recognition algorithms based on pattern type
    switch (patternType) {
      case 'symptom_progression':
        return this.analyzeSymptomProgression(data, threshold);
      case 'treatment_response':
        return this.analyzeTreatmentResponse(data, threshold);
      case 'diagnostic_correlation':
        return this.analyzeDiagnosticCorrelation(data, threshold);
      case 'risk_factors':
        return this.analyzeRiskFactorPatterns(data, threshold);
      case 'medication_adherence':
        return this.analyzeMedicationAdherence(data, threshold);
      default:
        throw new Error(`Unsupported pattern type: ${patternType}`);
    }
  }

  private async calculateCategoryRisk(
    patientData: ComprehensivePatientData,
    category: string,
    conditions?: string[],
    timeHorizon?: string
  ): Promise<CategoryRiskAssessment> {
    // Implement risk calculation algorithms for different categories
    // This would integrate with medical risk databases and calculation engines
    return this.riskCalculationService.calculateRisk({
      patientData,
      category,
      conditions,
      timeHorizon
    });
  }
}
```

### Integration with MoE Expert System

**MoE Expert Context Adapter:**
```typescript
class MoEContextAdapter {
  constructor(
    private medicalMCPHandler: MedicalExpertMCPHandler,
    private contextDatabase: ClientContextDatabase
  ) {}

  async getContextForExpert(
    expertType: string,
    patientId: string,
    currentContext: ExpertContext
  ): Promise<EnhancedExpertContext> {
    const enhancedContext = { ...currentContext };

    // Customize context retrieval based on expert type
    switch (expertType) {
      case 'medical_history_integration':
        enhancedContext.medicalTimeline = await this.medicalMCPHandler.handleGetMedicalTimeline({
          patientId,
          significanceThreshold: 0.7,
          includeCategories: ['diagnosis', 'treatment', 'medication', 'test_result']
        });
        enhancedContext.medicalPatterns = await this.medicalMCPHandler.handleSearchMedicalPatterns({
          patientId,
          patternType: 'diagnostic_correlation',
          lookbackPeriod: 'lifetime'
        });
        break;

      case 'safety_monitor':
        enhancedContext.drugInteractions = await this.medicalMCPHandler.handleCheckDrugInteractions({
          patientId,
          includeAllergies: true,
          includeMedicalConditions: true,
          severityLevels: ['contraindicated', 'major', 'moderate']
        });
        enhancedContext.riskAssessment = await this.medicalMCPHandler.handleGetRiskStratification({
          patientId,
          riskCategories: ['clinical', 'demographic'],
          timeHorizon: '1_month'
        });
        break;

      case 'treatment_planner':
        enhancedContext.treatmentHistory = await this.medicalMCPHandler.handleAnalyzeTreatmentHistory({
          patientId,
          treatmentCategories: ['medication', 'procedure', 'therapy'],
          includeCompliance: true,
          comparativeAnalysis: true
        });
        break;

      case 'preventive_care_specialist':
        enhancedContext.familyHistory = await this.medicalMCPHandler.handleGetFamilyGeneticHistory({
          patientId,
          relationshipLevels: ['immediate', 'extended'],
          relevanceToCurrentSymptoms: true
        });
        enhancedContext.riskAssessment = await this.medicalMCPHandler.handleGetRiskStratification({
          patientId,
          riskCategories: ['genetic', 'behavioral', 'environmental'],
          timeHorizon: '5_years',
          includeRecommendations: true
        });
        break;

      default:
        // For other experts, provide general structured data access
        enhancedContext.structuredData = await this.medicalMCPHandler.handleGetStructuredMedicalData({
          patientId,
          dataTypes: ['medication_history', 'vital_signs', 'lab_results'],
          aggregationLevel: 'summary'
        });
    }

    return enhancedContext;
  }
}
```

### Security Considerations

**Access Control:**
```typescript
class MCPSecurityManager {
  async verifyDocumentAccess(documentId: string, userId: string): Promise<boolean> {
    // 1. Check document ownership
    const document = await this.documentsStore.getDocument(documentId);
    if (document.userId !== userId) {
      return false;
    }

    // 2. Verify encryption key access
    const hasKeyAccess = await this.encryptionService.canDecryptDocument(
      documentId,
      this.userKeys
    );

    // 3. Check sharing permissions
    const hasSharedAccess = await this.checkSharedAccess(documentId, userId);

    return hasKeyAccess || hasSharedAccess;
  }

  async verifyPatientAccess(patientId: string, userId: string): Promise<void> {
    // Extended security for medical expert access
    const hasAccess = await this.patientAccessService.verifyAccess(patientId, userId);
    if (!hasAccess) {
      throw new Error('Unauthorized access to patient medical data');
    }

    // Audit all medical data access for expert analysis
    await this.auditLogger.log({
      timestamp: new Date(),
      userId,
      action: 'medical_expert_access',
      patientId,
      sessionId: this.currentSessionId
    });
  }

  async auditToolCall(toolName: string, params: any, userId: string): Promise<void> {
    // Log all tool calls for security auditing
    await this.auditLogger.log({
      timestamp: new Date(),
      userId,
      toolName,
      parameters: this.sanitizeParams(params),
      sessionId: this.currentSessionId
    });
  }
}
```

### Chat Integration
```typescript
// Extend existing session manager
export class ContextAwareSessionManager extends SessionManager {
  private contextCache = new Map<string, ContextSnapshot>();
  
  async updateContext(sessionId: string, query: string): Promise<ContextUpdate> {
    const session = this.sessions.get(sessionId);
    const relevantContext = await this.contextRetrieval.hybridSearch(query, {
      userId: session.userId,
      timeRange: { months: 12 },
      documentTypes: ['health', 'document']
    });
    
    // Cache for subsequent queries
    this.contextCache.set(sessionId, relevantContext);
    
    // Emit real-time update
    this.emitter.emit('context-update', { sessionId, context: relevantContext });
    
    return relevantContext;
  }
}
```

**AI Provider Integration:**
```typescript
// Extend existing AI abstraction
export class ContextEnhancedAIProvider extends AIProvider {
  async generateWithContext(
    prompt: string, 
    contextMatches: ContextMatch[],
    options: GenerationOptions
  ): Promise<AIResponse> {
    const assembledContext = await this.contextRetrieval.assembleContext(
      contextMatches, 
      options.maxContextTokens || 4000
    );
    
    const enhancedPrompt = `
      Relevant Patient Context:
      ${assembledContext.summary}

      Historical Documents:
      ${assembledContext.documents.map(doc => 
        `[${doc.type}, ${doc.date}]: ${doc.excerpt}`
      ).join('\n')}

      Current Query: ${prompt}
    `;
    
    return super.generate(enhancedPrompt, options);
  }
}
```

## Multi-Provider Embedding Strategy

### Provider Selection Logic

**Configuration Extension (models.yaml):**
```yaml
embedding_providers:
  primary:
    provider: openai
    model: text-embedding-3-small
    dimensions: 1536
    cost_per_1k_tokens: 0.00002
    
  fallback:
    provider: openai
    model: text-embedding-ada-002
    dimensions: 1536
    cost_per_1k_tokens: 0.0001
    
  future:
    provider: local
    model: all-MiniLM-L6-v2
    dimensions: 384
    cost_per_1k_tokens: 0
```

**Selection Strategy:**
```typescript
interface EmbeddingProviderSelector {
  selectProvider(context: EmbeddingContext): Promise<EmbeddingProvider>;
}

const providerSelection = {
  // High-volume: use cost-effective models
  bulk_processing: 'openai/text-embedding-3-small',
  
  // Real-time: use fast models
  realtime_search: 'openai/text-embedding-3-small',
  
  // Privacy-focused: use local models (future)
  high_privacy: 'local/all-MiniLM-L6-v2',
  
  // Research/analysis: use high-quality models
  analysis: 'openai/text-embedding-3-large'
};
```

### Multi-Model Compatibility

**Version Management:**
```typescript
interface EmbeddingCompatibility {
  migrateEmbeddings(
    fromModel: string, 
    toModel: string, 
    documents: Document[]
  ): Promise<MigrationResult>;
  
  ensureCompatibility(
    queryModel: string, 
    documentEmbeddings: DocumentEmbedding[]
  ): Promise<CompatibleEmbeddings>;
}
```

## Security and Privacy Considerations

### Encryption Strategy

**Embedding Vector Encryption:**
```typescript
interface EncryptedEmbedding {
  encryptEmbedding(vector: number[], documentKey: CryptoKey): Promise<EncryptedData>;
  decryptEmbedding(encrypted: EncryptedData, documentKey: CryptoKey): Promise<number[]>;
  shareEmbeddingAccess(embeddingId: string, targetUserPublicKey: JsonWebKey): Promise<void>;
}
```

**Key Sharing for Context Access:**
- Embeddings encrypted with same AES key as parent document
- Multi-user access through existing RSA key sharing system
- Embedding access follows document access permissions

### Privacy-Preserving Search

**Client-Side Vector Operations:**
```typescript
// All similarity calculations happen in browser
const performClientSideSearch = async (
  queryEmbedding: number[],
  documentEmbeddings: DecryptedEmbedding[]
): Promise<SimilarityResult[]> => {
  return documentEmbeddings.map(docEmb => ({
    documentId: docEmb.documentId,
    similarity: cosineSimilarity(queryEmbedding, docEmb.vector),
    metadata: docEmb.metadata
  })).sort((a, b) => b.similarity - a.similarity);
};
```

## Implementation Roadmap

### Phase 1: Core Foundation (Week 1-2)
- ✅ **Embedding Provider Abstraction** - Multi-provider interface
- ✅ **Document Integration** - Extend document metadata for embeddings
- ✅ **Encryption Extension** - Embed vector encryption in existing system
- ✅ **Basic Search** - Client-side similarity search

### Phase 2: LangGraph Integration (Week 2-3)
- ✅ **Workflow Extension** - Add embedding generation to document processing
- ✅ **Real-time Updates** - Session manager integration
- ✅ **Error Handling** - Robust embedding failure management
- ✅ **Testing** - Unit tests for embedding pipeline

### Phase 3: Chat Context Integration (Week 3-4)
- ✅ **Context Assembly** - Smart context selection for AI prompts
- ✅ **AI Provider Enhancement** - Context-aware AI generation
- ✅ **Real-time Context** - Live context updates during chat
- ✅ **User Interface** - Context visibility and control

### Phase 4: Optimization & Enhancement (Week 4-6)
- ✅ **Performance Optimization** - Caching and memory management
- ✅ **Advanced Ranking** - Time decay and hybrid search
- ✅ **Quality Metrics** - Context relevance measurement
- ✅ **Multi-model Support** - Provider fallbacks and migration

### Phase 5: Advanced Features (Future)
- 🔄 **IndexedDB Integration** - Client-side vector store for performance
- 🔄 **Local Embedding Models** - Privacy-focused local processing
- 🔄 **Advanced Analytics** - Context usage and effectiveness metrics
- 🔄 **Vector Database** - Server-side similarity search for scale

## Performance Considerations

### Memory Management
- **Lazy Loading** - Load embeddings only when needed
- **LRU Cache** - Keep frequently accessed embeddings in memory
- **Batch Processing** - Process multiple documents efficiently
- **Progressive Loading** - Load embeddings incrementally

### Search Optimization
- **Early Termination** - Stop search when sufficient matches found
- **Metadata Pre-filtering** - Filter before expensive similarity calculations
- **Approximate Search** - Trade accuracy for speed when needed
- **Result Caching** - Cache search results for repeated queries

### Token Management
- **Context Compression** - Intelligent summary of retrieved context
- **Token Budgeting** - Respect AI provider token limits
- **Incremental Context** - Add context based on conversation progression
- **Priority Ranking** - Include most relevant context first

## Success Metrics

### Technical Performance
- **Search Latency** - Target <200ms for context retrieval
- **Memory Usage** - Target <50MB for 100 documents with embeddings
- **Accuracy** - Target >85% relevant context in top 5 results
- **Reliability** - Target >99.9% embedding generation success rate

### User Experience
- **Context Relevance** - User rating >4.0/5.0 for context usefulness
- **Response Quality** - AI responses improved by context inclusion
- **Chat Flow** - Seamless context integration without workflow disruption
- **Performance** - No noticeable latency impact on existing features

### System Integration
- **Compatibility** - 100% compatibility with existing document encryption
- **Scalability** - Support for users with 100+ documents
- **Multi-provider** - Successful fallback between embedding providers
- **Data Integrity** - Zero embedding/document consistency issues

## Risk Mitigation

### Technical Risks
- **Embedding Quality** - Multiple provider options and quality validation
- **Performance Impact** - Incremental rollout and performance monitoring
- **Memory Constraints** - Efficient caching and lazy loading strategies
- **Provider Reliability** - Fallback providers and offline capability

### Security Risks
- **Encryption Compatibility** - Extensive testing with existing encryption system
- **Key Management** - Leverage proven RSA/AES key sharing system
- **Data Leakage** - Client-side processing and encrypted storage
- **Access Control** - Document-level permissions for embedding access

### User Experience Risks
- **Context Accuracy** - Hybrid search with metadata filtering
- **Information Overload** - Smart context selection and summarization
- **Privacy Concerns** - Transparent processing and user control
- **Feature Complexity** - Progressive disclosure and simple defaults

## Conclusion

The recommended embedded storage approach provides the optimal balance of simplicity, performance, and integration with Mediqom's existing architecture. By extending current document metadata to include encrypted embeddings and leveraging the proven multi-provider AI system, we can implement sophisticated contextual AI retrieval while maintaining the platform's security, real-time capabilities, and user experience standards.

This strategy positions Mediqom for immediate implementation while providing a clear path for future enhancements including local embedding models, vector databases, and advanced analytics capabilities.