/**
 * Mediqom Context & Medical Classification System
 *
 * Provides intelligent document retrieval and contextual AI capabilities
 * for both Session management and AI Chat features.
 *
 * Key Features:
 * - Medical terms classification and matching
 * - Multi-language medical concept search
 * - MCP tools for medical data access
 * - Real-time context updates
 */
export { ContextAssembler } from "./context-assembly/context-composer";
export {
  MedicalExpertTools,
  secureMcpTools,
  mcpTools,
} from "./mcp-tools/medical-expert-tools";
export { mcpSecurityService } from "./mcp-tools/security-audit";
export {
  buildSecurityContextFromEvent,
  buildSecurityContextFromBrowser,
  buildTestSecurityContext,
  validateSecurityContext,
  sanitizeSecurityContext,
} from "./mcp-tools/security-context-builder";
export { sessionContextService } from "./integration/session-context";
export { chatContextService } from "./integration/chat-service";

// Re-export types
export type {
  ContextMatch,
  AssembledContext,
  SearchOptions,
  MCPToolCall,
  MedicalContext,
} from "./types";

export type {
  MCPSecurityContext,
  MCPAccessPolicy,
  MCPAuditEntry,
} from "./mcp-tools/security-audit";
