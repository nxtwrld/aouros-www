// AI Chat Types
export type ChatMode = 'patient' | 'clinical';
export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ContextPrompt {
  type: 'document' | 'profile';
  id: string;
  title: string;
  messageKey: string;
  messageParams?: any;
  acceptLabelKey: string;
  declineLabelKey: string;
  data: any;
  timestamp: Date;
  onAccept: () => void;
  onDecline: () => void;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    anatomyFocus?: string[];
    documentsReferenced?: string[];
    toolsUsed?: string[];
    contextReferences?: string[];
    contextPrompt?: ContextPrompt;
    translationKey?: string;
    translationParams?: any;
    // Keep legacy support temporarily
    documentPrompt?: {
      documentId: string;
      title: string;
      content: any;
      timestamp: Date;
    };
    profilePrompt?: {
      profileId: string;
      profileName: string;
      profileData: any;
      timestamp: Date;
    };
  };
}

export interface ChatContext {
  mode: ChatMode;
  currentProfileId: string;
  conversationThreadId: string;
  language: string;
  pageContext: PageContext;
  anatomyContext?: AnatomyContext;
  isOwnProfile: boolean;
}

export interface PageContext {
  route: string;
  profileName: string;
  availableData: {
    documents: string[];
    conditions: string[];
    medications: string[];
    vitals: string[];
  };
  documentsContent?: Map<string, any>; // documentId -> document content
}

export interface AnatomyContext {
  focusedBodyParts: string[];
  viewState: {
    position: [number, number, number];
    rotation: [number, number, number];
    zoom: number;
  };
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  context: ChatContext | null;
  isLoading: boolean;
  anatomyModelOpen: boolean;
  focusedBodyPart: string | null;
  conversationHistory: Map<string, ChatMessage[]>; // profileId -> messages
  currentConversationId: string | null;
  syncStatus: 'synced' | 'syncing' | 'error';
  lastSyncTime: Date | null;
}

export interface BodyPartReference {
  text: string;
  bodyPartId: string;
  confidence: number;
}

export interface AnatomySuggestion {
  bodyParts: BodyPartReference[];
  suggestion: string;
  actionText: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  profileId: string;
  threadId: string;
  messages: ChatMessage[];
  metadata: {
    startTime: Date;
    lastUpdated: Date;
    profileName: string;
    mode: ChatMode;
    anatomyInteractions: number;
    documentsAccessed: string[];
  };
}

export interface ConsentRequest {
  type: 'document_access' | 'anatomy_integration';
  message: string;
  documentIds?: string[];
  bodyParts?: string[];
  reason: string;
}

export interface ChatResponse {
  message: string;
  anatomyReferences?: string[];
  documentReferences?: string[];
  toolCalls?: any[];
  suggestions?: AnatomySuggestion[];
  consentRequests?: ConsentRequest[];
}