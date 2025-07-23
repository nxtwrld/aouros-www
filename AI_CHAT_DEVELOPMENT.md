# AI Chat Development Plan

This document outlines the incremental development plan for implementing the AI medical chat feature in Mediqom, focusing on user-centric design and progressive enhancement.

## Overview

The AI Chat feature will provide users with an intelligent medical assistant that can discuss patient profiles, medical documents, and provide contextual insights while maintaining appropriate tone and privacy boundaries.

## Core Requirements

### General Requirements
- **R1**: Chat sidebar must be persistent across navigation within the application
- **R2**: Chat must detect and adapt tone based on whether viewing own profile or another user's profile
- **R3**: Chat interface must use the user's preferred UI language
- **R4**: Chat must maintain context awareness as users navigate
- **R5**: Chat must respect privacy and access permissions at all times
- **R6**: Users must have control over context switching when changing profiles
- **R7**: Chat must integrate with 3D anatomy model for visual medical education and exploration

### Technical Requirements
- **T1**: Integrate with existing session management and OpenAI thread architecture
- **T2**: Leverage existing multi-provider AI abstraction layer
- **T3**: Implement proper state management for persistent sidebar
- **T4**: Ensure real-time updates via existing EventEmitter/SSE infrastructure
- **T5**: Build on existing encryption and security frameworks
- **T6**: Interface with anatomy model store and focus system
- **T7**: Persist conversation history in Supabase with encryption

## Phase 1: Chat Sidebar with Page Context ✅ COMPLETED

### Objectives
- ✅ Create a persistent, responsive chat sidebar
- ✅ Enable basic conversation about currently viewed content
- ✅ Implement smart context switching logic
- ✅ Focus on exceptional user experience

### Status: COMPLETED ✅
**Completed on**: December 2024  
**Key Achievements**:
- Chat sidebar implemented with proper state management
- SSE-based real-time AI responses
- Dual-mode detection (patient vs clinical)
- 3D anatomy model integration
- Multi-language support (English, Czech, German)
- Persistent conversation history with profile isolation
- Event-driven architecture using existing EventEmitter
- Header-based toggle with visual state indicators

### Implementation Summary
**Components Created**:
- `src/components/chat/AIChatSidebar.svelte` - Main chat interface
- `src/lib/chat/chat-manager.ts` - Core conversation management
- `src/lib/chat/store.ts` - State management with Svelte stores
- `src/lib/chat/client-service.ts` - SSE client for real-time updates
- `src/lib/chat/anatomy-integration.ts` - 3D model integration
- `src/routes/v1/chat/conversation/+server.ts` - SSE endpoint

**Key Features Implemented**:
- Toggle chat from header button with active state visual
- Automatic profile context detection and switching
- Conversation history persistence across sessions
- Body part detection with 3D anatomy focus
- Responsive design with resizable sidebar
- Proper accessibility features (ARIA labels, keyboard navigation)
- Error handling and loading states

### User Stories

#### Story 1.1: Initialize Chat from Profile ✅ COMPLETED
**As a** healthcare provider  
**I want to** start a chat conversation while viewing a patient profile  
**So that I** can ask questions about the patient's medical history and current conditions  

**Acceptance Criteria:**
- ✅ Chat icon appears in header (accessible from all profile pages)
- ✅ Clicking icon opens sidebar from right with smooth animation
- ✅ Initial greeting acknowledges which patient profile is being viewed
- ✅ Chat understands basic context (patient name, profile information)

#### Story 1.2: Own Profile vs Other's Profile ✅ COMPLETED
**As a** patient viewing my own profile  
**I want** the chat to use supportive, empowering language  
**So that I** feel comfortable asking questions about my health  

**As a** healthcare provider viewing a patient's profile  
**I want** the chat to use clinical, analytical language  
**So that I** can get professional insights about the patient  

**Acceptance Criteria:**
- ✅ System detects if profile belongs to current user
- ✅ Patient mode: "I can help you understand your medical information..."
- ✅ Clinical mode: "I can assist with analyzing this patient's medical data..."
- ✅ Tone remains consistent throughout conversation

#### Story 1.3: Persistent Sidebar Navigation ✅ COMPLETED
**As a** user navigating between pages  
**I want** the chat to remain open and maintain conversation history  
**So that I** don't lose context while exploring different information  

**Acceptance Criteria:**
- ✅ Sidebar remains open when navigating between pages
- ✅ Conversation history persists across navigation
- ✅ Loading states show when context is updating
- ✅ Sidebar can be toggled open/closed and maintains state

#### Story 1.4: Context Switching on Profile Change ✅ COMPLETED
**As a** healthcare provider comparing multiple patients  
**I want to** choose whether to start a new conversation or continue the current one  
**So that I** can maintain relevant context for my workflow  

**Acceptance Criteria:**
- ✅ When navigating to a different patient profile, chat automatically switches context
- ✅ Each profile maintains its own conversation history
- ✅ Visual indicator shows current context patient (in header and chat title)
- ✅ Smart initialization: resumes existing conversation or starts fresh

#### Story 1.5: Language Preference ✅ COMPLETED
**As a** user with Czech language preference  
**I want** the AI chat to respond in Czech  
**So that I** can communicate comfortably in my native language  

**Acceptance Criteria:**
- ✅ Chat UI elements use user's preferred language
- ✅ AI responses are in user's preferred language (English, Czech, German)
- ✅ Medical terms are appropriately translated/localized
- ✅ Language preference is detected from user profile

#### Story 1.6: 3D Anatomy Model Integration ✅ COMPLETED
**As a** patient discussing my knee pain  
**I want** the AI to show me the affected area on a 3D model  
**So that I** can better understand my condition visually  

**Acceptance Criteria:**
- ✅ AI detects body part references in conversation (knee, heart, lungs, etc.)
- ✅ Provides anatomy focus buttons in AI responses
- ✅ One-click button to open and focus on specific body part
- ✅ Integration with existing 3D anatomy model system
- ✅ Body part mapping system for common medical terms

#### Story 1.7: Proactive Anatomy Visualization ✅ COMPLETED
**As a** healthcare provider explaining a diagnosis  
**I want** the AI to automatically suggest relevant anatomy views  
**So that** patient education is more effective  

**Acceptance Criteria:**
- ✅ AI recognizes educational opportunities (explaining conditions, procedures)
- ✅ Provides anatomy focus buttons when body parts are mentioned
- ✅ Integration with existing anatomy model focus system
- ✅ Support for multiple body parts per conversation
- ✅ Visual indicators for anatomy interactions in chat

#### Story 1.8: Persistent Conversation History ✅ COMPLETED
**As a** patient with ongoing health conditions  
**I want** my chat conversations to be saved automatically  
**So that I** can reference previous discussions and track my health journey  

**Acceptance Criteria:**
- ✅ Conversations automatically saved in-memory with profile isolation
- ✅ History persists across navigation and chat open/close
- ✅ Automatic saving before page unload
- ✅ Clear conversation history option available
- ⚠️ Backend encrypted storage pending (Phase 2 enhancement)

#### Story 1.9: Multi-Profile Conversation Management ✅ COMPLETED
**As a** healthcare provider managing multiple patients  
**I want** separate conversation histories for each patient profile  
**So that** patient discussions remain organized and confidential  

**Acceptance Criteria:**
- ✅ Conversations linked to specific profile being viewed
- ✅ Clear visual indicator showing which profile's history is active
- ✅ Automatic context switching when changing profiles
- ✅ Isolated conversation history per profile
- ⚠️ Search functionality and export capability pending (Phase 2)

#### Story 1.10: Context-Aware Document Integration ✅ COMPLETED
**As a** user navigating between medical documents  
**I want** the AI chat to offer to include document content in our conversation  
**So that** the AI can provide insights about specific documents I'm viewing  

**Acceptance Criteria:**
- ✅ System detects when documents are loaded and decrypted
- ✅ AI chat shows consent prompt: "Do you want to add [Document Title] to our chat?"
- ✅ Clear YES/NO buttons for user choice
- ✅ If YES: Document content is added to conversation context
- ✅ If NO: Document is ignored and conversation continues
- ✅ System message confirms user's choice
- ✅ Multi-language support for all prompts and messages
- ✅ Document content (diagnosis, medications, vitals) passed to AI for analysis

#### Story 1.11: Profile Context Switching with User Control ✅ COMPLETED
**As a** healthcare provider switching between patient profiles  
**I want** to control whether to reset or maintain my conversation context  
**So that** I can choose the most appropriate workflow for my needs  

**Acceptance Criteria:**
- ✅ When switching profiles, system shows prompt: "You switched to [Name]'s profile. Do you want to reset the chat context?"
- ✅ "Reset Context" button - Clears conversation and starts fresh
- ✅ "Keep Current Context" button - Maintains conversation but acknowledges new profile
- ✅ Each profile maintains separate conversation history
- ✅ Visual indicator shows current active profile name in chat header
- ✅ Smooth transition without losing unsaved conversations

#### Story 1.12: Unified Context Prompt Interface ✅ COMPLETED
**As a** developer maintaining the chat system  
**I want** a single reusable component for all context prompts  
**So that** the UI remains consistent and maintainable  

**Acceptance Criteria:**
- ✅ Common ContextPrompt component handles both document and profile prompts
- ✅ Centralized prompt logic in ChatManager with embedded callbacks
- ✅ Consistent styling for all prompt types (document/profile)
- ✅ Type-safe prompt definitions with TypeScript
- ✅ Easy to extend for future prompt types

### Implementation Details

#### Component Structure
```typescript
// src/components/chat/AIChatSidebar.svelte
interface ChatSidebarProps {
  isOpen: boolean;
  currentProfile: PatientProfile | null;
  isOwnProfile: boolean;
  userLanguage: string;
}

// src/lib/chat/context-manager.ts
interface ChatContext {
  mode: 'patient' | 'clinical';
  currentProfileId: string;
  conversationThreadId: string;
  language: string;
  pageContext: PageContext;
  anatomyContext?: AnatomyContext;
}

// src/lib/chat/stores.ts
export const chatStore = writable<ChatState>({
  isOpen: false,
  messages: [],
  context: null,
  isLoading: false,
  anatomyModelOpen: false,
  focusedBodyPart: null,
  conversationHistory: new Map<string, ChatMessage[]>(),
  currentConversationId: null,
  syncStatus: 'synced',
  lastSyncTime: null,
});

// src/lib/chat/anatomy-integration.ts
interface AnatomyIntegration {
  detectBodyParts(text: string): BodyPartReference[];
  suggestAnatomyView(bodyParts: BodyPartReference[]): AnatomySuggestion;
  openAndFocus(bodyPartId: string): Promise<void>;
  syncWithChat(message: ChatMessage): void;
}

interface BodyPartReference {
  text: string; // Original text mentioning body part
  bodyPartId: string; // Mapped to tags enum
  confidence: number;
}

// src/lib/chat/types.d.ts
interface ContextPrompt {
  type: 'document' | 'profile';
  id: string;
  title: string;
  message: string;
  acceptLabel: string;
  declineLabel: string;
  data: any;
  timestamp: Date;
  onAccept: () => void;
  onDecline: () => void;
}

// src/components/chat/ContextPrompt.svelte
interface ContextPromptProps {
  prompt: ContextPrompt;
}

// src/lib/chat/conversation-storage.ts
interface ConversationStorage {
  saveMessage(message: ChatMessage): Promise<void>;
  saveConversation(conversation: Conversation): Promise<void>;
  loadConversationHistory(userId: string, profileId: string): Promise<Conversation[]>;
  deleteConversation(conversationId: string): Promise<void>;
  searchConversations(query: string, filters: SearchFilters): Promise<Conversation[]>;
}

interface Conversation {
  id: string;
  userId: string;
  profileId: string; // Which profile was being viewed
  threadId: string; // OpenAI thread ID
  messages: EncryptedMessage[];
  metadata: {
    startTime: Date;
    lastUpdated: Date;
    profileName: string;
    mode: 'patient' | 'clinical';
    anatomyInteractions: number;
    documentsAccessed: string[];
  };
}

interface EncryptedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: EncryptedData; // Encrypted using user's keys
  timestamp: Date;
  metadata?: {
    anatomyFocus?: string[];
    documentsReferenced?: string[];
    toolsUsed?: string[];
  };
}
```

#### Key Features Phase 1
1. **Smart Context Detection**
   - Automatically extract relevant information from current page
   - Identify key medical data points visible to user
   - Maintain awareness of navigation path
   - Detect body part mentions for anatomy integration

2. **Conversation Continuity**
   - Store conversation in browser session storage
   - Sync with backend session manager
   - Handle page refreshes gracefully
   - Preserve anatomy model state across navigation

3. **Responsive Design**
   - Mobile: Full screen overlay
   - Tablet: Adjustable width sidebar
   - Desktop: Fixed 400px sidebar with resize handle
   - Anatomy model: Adaptive layout based on screen size

4. **3D Anatomy Integration**
   - Body part detection using NLP
   - Mapping to anatomical identifiers from tags
   - Visual action buttons in chat messages
   - Synchronized focus between chat and model

5. **Automatic Conversation Persistence**
   - Save after each AI response completion
   - Encrypt messages using user's encryption keys
   - Link conversations to viewed profile
   - Background sync to Supabase
   - Offline queue for reliability

## Next Steps & Current TODO

### Completed Features (Phase 1)
All Phase 1 user stories have been successfully implemented:
- ✅ Core chat functionality with persistent sidebar
- ✅ Dual-mode support (patient vs clinical)
- ✅ 3D anatomy model integration
- ✅ Multi-language support (English, Czech, German)
- ✅ Conversation history with profile isolation
- ✅ Context-aware document integration with consent
- ✅ Profile context switching with user control
- ✅ Unified prompt interface for consistency
- ✅ Chat header showing active profile name
- ✅ Chat persistence across all medical routes

### Remaining Tasks

#### High Priority
1. **Backend Encrypted Storage** - Implement persistent conversation history with encryption in Supabase
2. **Search & Export** - Add conversation search and export capabilities

#### Medium Priority
3. **Performance Optimization** - Add lazy loading and bundle optimization
4. **Mobile Responsive Improvements** - Enhanced mobile experience
5. **Advanced Document Analysis** - Deeper integration with medical document content

#### Low Priority
6. **Advanced Analytics** - Conversation insights and usage tracking
7. **Voice Integration** - Speech-to-text for hands-free operation
8. **Collaborative Features** - Share conversations with providers

### Current Status Summary
- **Phase 1**: ✅ **COMPLETED** - Core chat functionality with anatomy integration
- **Phase 2**: 🔄 **IN PROGRESS** - Document access and persistent storage
- **Phase 3**: ⏳ **PENDING** - Context-aware conversations and semantic search

---

## Phase 2: MCP Tools for Document Access 🔄 IN PROGRESS

### Objectives
- Enable AI to access and analyze medical documents
- Implement consent-based document reading
- Provide intelligent document search and retrieval
- Maintain security and privacy

### User Stories

#### Story 2.1: Request Document Access
**As a** user asking about specific test results  
**I want** the AI to request permission before accessing my documents  
**So that I** maintain control over my medical data  

**Acceptance Criteria:**
- AI recognizes when document access would be helpful
- Clear permission request: "May I access your lab results from [date] to provide more specific information?"
- One-click approval/denial
- Permission can be revoked anytime
- AI explains what it will do with the access

#### Story 2.2: Intelligent Document Search
**As a** healthcare provider asking about a patient's medication history  
**I want** the AI to search through relevant documents  
**So that I** get comprehensive information quickly  

**Acceptance Criteria:**
- AI uses search_patient_documents tool to find relevant records
- Results show document type, date, and relevance
- AI summarizes findings clearly
- Source documents are cited with links

#### Story 2.3: Progressive Document Loading
**As a** user discussing a complex medical history  
**I want** the AI to load documents as needed  
**So that** the conversation remains fast and responsive  

**Acceptance Criteria:**
- Initial response uses page context only
- AI indicates when more documents might help
- Documents loaded on-demand with user consent
- Loading indicators show progress
- Previously loaded documents are cached

#### Story 2.4: Document Privacy Controls
**As a** patient sharing my profile with a specialist  
**I want to** control which documents the AI can discuss  
**So that I** maintain privacy over sensitive information  

**Acceptance Criteria:**
- Document access permissions respect sharing settings
- AI indicates when documents are restricted
- Clear explanation of what AI can/cannot access
- Audit trail of AI document access

### MCP Tools Implementation

```typescript
// src/lib/chat/mcp-tools.ts
interface MediqomChatTools {
  searchPatientDocuments: {
    requiresConsent: true;
    description: "Search patient medical documents";
    parameters: {
      query: string;
      documentTypes?: string[];
      dateRange?: DateRange;
    };
  };
  
  getDocumentDetails: {
    requiresConsent: true;
    description: "Read specific document content";
    parameters: {
      documentId: string;
      sections?: string[];
    };
  };
  
  getDocumentTimeline: {
    requiresConsent: false; // Metadata only
    description: "View chronological document timeline";
    parameters: {
      condition?: string;
      timeRange?: DateRange;
    };
  };
  
  // New anatomy-related tools
  focusAnatomyModel: {
    requiresConsent: false;
    description: "Focus 3D anatomy model on specific body part";
    parameters: {
      bodyPartId: string; // From tags enum
      zoomLevel?: number;
      highlight?: boolean;
    };
  };
  
  getAnatomyContext: {
    requiresConsent: false;
    description: "Get related anatomy information for body parts";
    parameters: {
      bodyPartIds: string[];
      includeRelated?: boolean;
    };
  };
}
```

## Conversation History Storage

> **Note:** This feature is now part of the unified history system. See [HISTORY_DEVELOPMENT.md](./HISTORY_DEVELOPMENT.md) for the complete implementation strategy that covers both AI chat conversations and clinical session histories.

### Overview

The AI chat conversations will be stored using the unified conversation history system, which provides:

- **Unified Schema** - Both AI chats and clinical sessions use the same database structure
- **Cross-Conversation Search** - Search across all conversation types
- **Comprehensive Analysis** - AI insights captured for both chat types
- **Consistent Security** - Same encryption and access controls

### AI Chat Integration

AI chat conversations will be stored as type `'ai_chat'` in the unified `conversations` table, with the following specific characteristics:

```typescript
// AI Chat specific implementation
interface AIChatConversation extends UnifiedConversation {
  type: 'ai_chat';
  threadId: string; // OpenAI thread ID
  metadata: {
    mode: 'patient' | 'clinical';
    anatomyInteractions: number;
    documentsAccessed: string[];
    contextSources: string[];
  };
}

// Message types for AI chat
interface AIChatMessage extends UnifiedMessage {
  type: 'text' | 'tool_use' | 'system';
  metadata: {
    toolsUsed?: string[];
    anatomyFocus?: string[];
    documentIds?: string[];
    contextReferences?: string[];
  };
}
```

### Storage Flow

1. **Chat Initialization**: Create conversation record with type `'ai_chat'`
2. **Message Exchange**: Save both user and AI messages with metadata
3. **Tool Usage**: Record anatomy interactions and document access
4. **Analysis**: Save AI insights and recommendations
5. **Summary**: Generate conversation summary for quick reference

### Implementation Reference

The actual implementation details are in [HISTORY_DEVELOPMENT.md](./HISTORY_DEVELOPMENT.md):

- **Schema Design**: See "Unified Schema Design" section
- **Service Layer**: See "UnifiedConversationService" implementation
- **Integration**: See "AI Chat Integration" section
- **Security**: See "Security & Privacy" section

This approach ensures consistency across all conversation types while providing specialized features for AI chat interactions.

## Anatomy Model Integration Examples

### Example Conversations

#### Patient Mode Example
```
User: "I've been having pain in my right knee when I walk"

AI: "I understand you're experiencing pain in your right knee during walking. This can be concerning and affect your daily activities. 

[Show on 3D Model 🔍] Would you like me to show you the knee anatomy so we can better understand what might be causing your pain?"

User: [Clicks button]

AI: [Opens anatomy model focused on R_patella, R_femur, cartilage_knee]
"Here you can see your right knee joint. The pain during walking often involves these structures:
- The kneecap (patella) - shown in the front
- The cartilage cushioning the joint - highlighted in blue
- The ligaments providing stability

Where specifically do you feel the pain - is it more on the inside, outside, or behind the kneecap?"
```

#### Clinical Mode Example
```
Provider: "Patient presents with chronic lower back pain radiating to left leg"

AI: "Based on the presentation of chronic lower back pain with left leg radiation, this suggests possible lumbar spine involvement with nerve impingement.

[View Lumbar Anatomy 🔍] [View Nerve Pathways 🔍]

Key anatomical considerations:
- L4-L5 and L5-S1 are the most common sites for disc herniation
- The sciatic nerve pathway would explain the radiating pattern
- Consider evaluating lumbar_spine, intervertebral_disks, and associated nerve roots"

[AI automatically opens split view showing lumbar spine with highlighted nerve pathways]
```

### Body Part Mapping

The system maps common medical terms to anatomical identifiers:

```typescript
const bodyPartMappings = {
  // Common terms to anatomy tags
  "knee": ["R_patella", "L_patella", "cartilage_knee", "ligaments_knee"],
  "back": ["lumbar_spine", "thoracic_spine", "intervertebral_disks"],
  "heart": ["heart", "vascular_system"],
  "shoulder": ["R_scapula", "L_scapula", "ligaments_shoulder", "cartilage_shoulder"],
  "stomach": ["stomach", "digestive_system"],
  // Add more mappings...
};
```

### Automatic Conversation Saving

```typescript
// src/lib/chat/chat-manager.ts
export class ChatManager {
  private storage: ChatConversationStorage;
  private currentConversation: Conversation | null = null;
  
  async handleAIResponse(
    userMessage: string,
    aiResponse: AIResponse,
    context: ChatContext
  ): Promise<void> {
    // Ensure we have a conversation
    if (!this.currentConversation) {
      this.currentConversation = await this.createConversation(
        context.userId,
        context.profileId,
        context.threadId
      );
    }
    
    // Save user message
    await this.storage.saveMessage(this.currentConversation.id, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    // Save AI response with metadata
    await this.storage.saveMessage(this.currentConversation.id, {
      role: 'assistant',
      content: aiResponse.text,
      timestamp: new Date(),
      metadata: {
        anatomyFocus: aiResponse.anatomyReferences,
        documentsReferenced: aiResponse.documentIds,
        toolsUsed: aiResponse.toolCalls?.map(t => t.name)
      }
    });
    
    // Update UI to show saved status
    this.emit('conversation-saved', {
      conversationId: this.currentConversation.id,
      messageCount: this.currentConversation.messages.length + 2
    });
  }
  
  async switchProfile(newProfileId: string): Promise<void> {
    // Save current conversation state
    if (this.currentConversation) {
      await this.finalizeConversation();
    }
    
    // Load or create conversation for new profile
    const history = await this.storage.loadConversationHistory(
      this.userId,
      newProfileId,
      1 // Get most recent
    );
    
    if (history.length > 0 && this.isRecent(history[0])) {
      // Continue recent conversation
      this.currentConversation = history[0];
      this.emit('conversation-resumed', {
        conversationId: history[0].id,
        messageCount: history[0].messages.length
      });
    } else {
      // Start fresh conversation
      this.currentConversation = null;
    }
  }
}
```

## Phase 3: Context-Aware Conversations

### Objectives
- Implement embedding-based context retrieval
- Enable semantic search across medical history
- Provide highly relevant, personalized responses
- Optimize performance with client-side vector search

### User Stories

#### Story 3.1: Automatic Context Loading
**As a** user starting a chat about my health  
**I want** the AI to already understand my medical background  
**So that I** don't have to repeat basic information  

**Acceptance Criteria:**
- On chat initialization, relevant context is pre-loaded
- AI demonstrates awareness: "I can see you've been managing diabetes..."
- Context loading doesn't delay chat availability
- User can see what context AI has access to

#### Story 3.2: Semantic Medical Search
**As a** user asking "When did my headaches start?"  
**I want** the AI to search through all my medical records semantically  
**So that I** get accurate timeline information  

**Acceptance Criteria:**
- AI searches across all documents for headache-related mentions
- Results include direct mentions and related symptoms
- Timeline construction from multiple sources
- Confidence indicators for findings

#### Story 3.3: Context-Aware Follow-ups
**As a** patient discussing symptoms  
**I want** the AI to remember our conversation context  
**So that** follow-up questions are relevant and informed  

**Acceptance Criteria:**
- AI references earlier parts of conversation
- Builds on previous answers
- Maintains context across multiple topics
- Can return to previous topics intelligently

#### Story 3.4: Smart Context Summarization
**As a** healthcare provider in a time-sensitive situation  
**I want** the AI to provide concise, relevant patient summaries  
**So that I** can quickly understand the patient's condition  

**Acceptance Criteria:**
- "Summarize this patient" provides key information
- Summary adapts to user role (clinical vs patient)
- Most recent/relevant information prioritized
- Critical information highlighted

### Context Implementation

```typescript
// src/lib/chat/context-engine.ts
interface ContextEngine {
  initializeForProfile(profileId: string): Promise<ProfileContext>;
  searchSimilarDocuments(query: string): Promise<ContextMatch[]>;
  assembleContext(matches: ContextMatch[], maxTokens: number): Promise<AssembledContext>;
  updateContextRealtime(newDocument: Document): Promise<void>;
}

// Context-aware prompt enhancement
interface ContextualPrompt {
  basePrompt: string;
  relevantContext: {
    patientSummary: string;
    recentEvents: string[];
    relevantFindings: Finding[];
    medications: Medication[];
  };
  confidence: number;
}
```

## Success Metrics

### Phase 1 Metrics
- **Adoption Rate**: 60% of users try chat within first week
- **Engagement**: Average 5+ messages per conversation
- **Satisfaction**: 4.5+ star rating for helpfulness
- **Performance**: <200ms to open sidebar
- **Anatomy Usage**: 40% of medical conversations use 3D model
- **Body Part Detection**: 85% accuracy in mapping mentions to anatomy

### Phase 2 Metrics
- **Consent Rate**: 80% of users grant document access
- **Document Relevance**: 90% of retrieved documents rated relevant
- **Time Saved**: 50% reduction in time to find information
- **Privacy**: Zero unauthorized document access

### Phase 3 Metrics
- **Context Relevance**: 85% of context rated helpful by users
- **Response Quality**: 30% improvement in answer accuracy
- **Conversation Depth**: 40% increase in follow-up questions
- **User Retention**: 70% weekly active chat users

## Technical Architecture

### State Management
```typescript
// Global chat state persisted across navigation
interface GlobalChatState {
  sidebar: {
    isOpen: boolean;
    width: number;
    position: 'right' | 'left';
  };
  
  conversation: {
    threadId: string;
    messages: Message[];
    context: ChatContext;
  };
  
  permissions: {
    documentAccess: boolean;
    accessGrantedFor: string[]; // Document IDs
  };
  
  anatomy: {
    modelOpen: boolean;
    focusedParts: string[]; // Currently focused body part IDs
    viewState: AnatomyViewState;
    interactionHistory: AnatomyInteraction[];
  };
  
  history: {
    conversations: Map<string, Conversation>; // profileId -> Conversation
    currentConversationId: string;
    syncStatus: 'synced' | 'syncing' | 'error';
    lastSyncTime: Date;
  };
}
```

### Security Considerations
1. **Document Access**
   - All document access through existing encryption layer
   - Audit trail for compliance
   - Respect existing sharing permissions

2. **Context Isolation**
   - Each profile conversation isolated
   - No cross-profile data leakage
   - Clear context indicators

3. **Data Retention**
   - Conversations encrypted at rest
   - User can delete chat history
   - Comply with data retention policies

4. **Conversation History Security**
   - End-to-end encryption using user's keys
   - Separate encryption per profile conversation
   - No plain text storage in database
   - Automatic cleanup of old conversations (configurable)
   - Export requires authentication and generates audit log

## Rollout Strategy

### Phase 1 Rollout (Weeks 1-2)
1. Internal testing with medical team
2. Beta release to 10% of users
3. Gather feedback and iterate
4. Full release with feature flag

### Phase 2 Rollout (Weeks 3-4)
1. Enable MCP tools for beta users
2. Monitor document access patterns
3. Refine permission flows
4. Gradual rollout to all users

### Phase 3 Rollout (Weeks 5-8)
1. Deploy context engine infrastructure
2. Generate embeddings for existing documents
3. A/B test context-aware vs standard responses
4. Full deployment based on metrics

## Risk Mitigation

### Technical Risks
- **Performance**: Lazy load components, optimize bundle size
- **State Management**: Comprehensive testing of navigation edge cases
- **API Limits**: Implement rate limiting and queueing

### User Experience Risks
- **Complexity**: Progressive disclosure of features
- **Trust**: Clear explanations of AI capabilities and limitations
- **Privacy**: Transparent data usage and control options

### Medical Safety
- **Disclaimers**: Clear medical advice boundaries
- **Provider Mode**: Enhanced validation for clinical insights
- **Emergency**: Clear escalation paths for urgent situations

## Future Enhancements

### Voice Integration
- Speech-to-text for questions
- Text-to-speech for responses
- Hands-free operation
- Voice commands for anatomy navigation

### Collaborative Features
- Share conversation with provider
- Expert consultation mode
- Family member access
- Synchronized anatomy viewing during consultations

### Advanced Analytics
- Conversation insights
- Health trends from chat
- Predictive health alerts
- Most viewed anatomy parts tracking

### Enhanced Anatomy Features
- AR mode for mobile devices
- Condition overlays on anatomy model
- Animation of medical procedures
- Personalized anatomy based on patient data

## Conclusion

This phased approach ensures we deliver value incrementally while building toward a comprehensive AI medical assistant. Each phase builds on the previous, with clear success metrics and user-centric design throughout.