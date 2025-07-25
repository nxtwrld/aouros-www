/**
 * Mediqom Context & Embeddings System
 * 
 * Provides intelligent document retrieval and contextual AI capabilities
 * for both Session management and AI Chat features.
 * 
 * Key Features:
 * - Client-side encrypted embeddings
 * - Multi-provider embedding support
 * - Fast in-memory vector search
 * - MCP tools for medical data access
 * - Real-time context updates
 */

export { ClientContextDatabase } from './client-database/memory-store';
export { VectorSearch } from './client-database/vector-search';
export { ContextInitializer } from './client-database/initialization';
export { EmbeddingProvider } from './embeddings/providers/abstraction';
export { ClientEmbeddingManager } from './embeddings/client-embedding-manager';
export { ContextAssembler } from './context-assembly/context-composer';
export { MedicalExpertTools, secureMcpTools, mcpTools } from './mcp-tools/medical-expert-tools';
export { mcpSecurityService } from './mcp-tools/security-audit';
export { 
  buildSecurityContextFromEvent,
  buildSecurityContextFromBrowser,
  buildTestSecurityContext,
  validateSecurityContext,
  sanitizeSecurityContext
} from './mcp-tools/security-context-builder';
export { embeddingMigrationService } from './migration/embedding-migration';
export { 
  checkMigrationStatus,
  migrateEmbeddings,
  autoMigrateIfNeeded,
  MigrationProgressTracker
} from './migration/client-migration';
export { migrationUtils, initializeBrowserMigrationUtils } from './migration/browser-utility';
export { sessionContextService } from './integration/session-context';
export { chatContextService } from './integration/chat-service';

// Re-export types
export type {
  ContextMatch,
  AssembledContext,
  EmbeddingMetadata,
  SearchOptions,
  MCPToolCall,
  MedicalContext
} from './types';

export type {
  MCPSecurityContext,
  MCPAccessPolicy,
  MCPAuditEntry
} from './mcp-tools/security-audit';