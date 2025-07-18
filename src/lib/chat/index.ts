// AI Chat System - Main exports
export { default as chatStore, chatActions, createMessage } from './store';
export { default as ChatManager, chatManager } from './chat-manager';
export { default as ChatClientService } from './client-service';
export { default as AnatomyIntegration } from './anatomy-integration';
export type * from './types.d';

// Re-export commonly used types
export type { 
  ChatMessage, 
  ChatContext, 
  ChatState, 
  ChatMode, 
  ChatResponse,
  BodyPartReference,
  AnatomySuggestion,
  ConsentRequest
} from './types.d';