/**
 * Chat Service Context Integration
 *
 * Re-exports the client implementation for backward compatibility.
 * Server-side code should import from './server/chat-context-server' directly.
 */

// Re-export shared types and interfaces
export type {
  ChatContextOptions,
  ChatContextResult,
} from "./shared/chat-context-base";

// For backward compatibility, export the client service as the default
// Server-side code will import the server service directly
export { clientChatContextService as chatContextService } from "./client/chat-context-client";
