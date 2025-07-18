# Unified History Development Plan

This document outlines the implementation strategy for a unified conversation history system that captures both AI chat conversations and doctor-patient session transcriptions with AI insights in Mediqom.

## Executive Summary

The unified history system will provide a comprehensive record of all medical conversations within the platform, including:
1. **AI Chat Conversations** - User interactions with the AI medical assistant
2. **Clinical Sessions** - Doctor-patient consultations with real-time transcription and AI analysis

Both types of conversations will share a common storage architecture while maintaining their unique characteristics and requirements.

## Core Requirements

### Functional Requirements
- **F1**: Store all conversation types in a unified, searchable format
- **F2**: Maintain full context including transcripts, AI responses, and medical insights
- **F3**: Support multi-modal content (text, audio references, anatomy visualizations)
- **F4**: Enable cross-conversation search and analysis
- **F5**: Provide export capabilities for medical records
- **F6**: Support conversation continuity across sessions
- **F7**: Track conversation participants and their roles

### Technical Requirements
- **T1**: End-to-end encryption using existing user key system
- **T2**: Scalable Supabase schema with proper indexing
- **T3**: Real-time synchronization with local storage fallback
- **T4**: Integration with existing session management
- **T5**: Support for large transcripts and streaming updates
- **T6**: Compliance with medical data retention policies
- **T7**: Efficient querying across conversation types

### Security & Compliance Requirements
- **S1**: HIPAA-compliant data storage and access controls
- **S2**: Audit trail for all data access and modifications
- **S3**: Patient consent tracking for data sharing
- **S4**: Role-based access control (patient, provider, admin)
- **S5**: Data anonymization for research purposes
- **S6**: Right to deletion and data portability

## Unified Schema Design

### Core Tables

```sql
-- Conversation types enumeration
CREATE TYPE conversation_type AS ENUM ('ai_chat', 'clinical_session');
CREATE TYPE participant_role AS ENUM ('patient', 'provider', 'ai_assistant', 'observer');
CREATE TYPE message_type AS ENUM ('text', 'audio', 'system', 'tool_use', 'analysis');

-- Main conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  type conversation_type NOT NULL,
  title TEXT, -- Auto-generated or user-defined
  
  -- Conversation metadata
  encrypted_metadata JSONB NOT NULL, -- Includes summary, tags, chief complaint
  
  -- Session references
  thread_id TEXT, -- OpenAI thread for AI chats
  session_id TEXT, -- Recording session ID for clinical sessions
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  
  -- Indexes
  INDEX idx_user_profile_type (user_id, profile_id, type),
  INDEX idx_last_activity (last_activity_at DESC),
  INDEX idx_status (status)
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES profiles(id), -- NULL for AI assistant
  role participant_role NOT NULL,
  name TEXT NOT NULL, -- Display name
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(conversation_id, participant_id, role)
);

-- Unified messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES conversation_participants(id),
  
  -- Message content
  type message_type NOT NULL,
  encrypted_content TEXT NOT NULL, -- Main message content
  encrypted_metadata JSONB, -- Tool usage, references, etc.
  
  -- For audio messages
  audio_url TEXT, -- Reference to stored audio
  duration_seconds INTEGER,
  
  -- Ordering and timing
  sequence_number INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analysis linkage
  analysis_id UUID REFERENCES conversation_analysis(id),
  
  -- Ensure message order
  UNIQUE(conversation_id, sequence_number)
);

-- AI analysis and insights
CREATE TABLE conversation_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id), -- Optional link to triggering message
  
  -- Analysis data
  encrypted_analysis JSONB NOT NULL, -- Full analysis results
  analysis_type TEXT NOT NULL, -- 'diagnosis', 'treatment', 'summary', etc.
  
  -- Metadata
  model_used TEXT,
  confidence_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_conversation_analysis (conversation_id, created_at DESC)
);

-- Conversation summaries for quick access
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Summary data
  encrypted_summary TEXT NOT NULL,
  key_points JSONB, -- Encrypted array of key medical points
  
  -- Medical coding
  icd_codes TEXT[], -- Extracted ICD codes
  cpt_codes TEXT[], -- Procedure codes
  
  -- Metrics
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  
  -- Updates
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(conversation_id)
);
```

### Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Conversation access policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    JOIN profiles p ON cp.participant_id = p.id
    WHERE cp.conversation_id = conversations.id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Message access inherits from conversation access
CREATE POLICY "View messages in accessible conversations"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN profiles p ON cp.participant_id = p.id
      WHERE cp.conversation_id = c.id
      AND p.user_id = auth.uid()
    ))
  ));
```

## User Stories

### Epic 1: Unified Conversation View

#### Story 1.1: View All Conversations
**As a** user with multiple types of medical conversations  
**I want to** see all my conversations in one place  
**So that I** can easily find and reference past discussions  

**Acceptance Criteria:**
- Unified conversation list shows both AI chats and clinical sessions
- Visual indicators differentiate conversation types
- Search works across all conversation types
- Filter by type, date, participant, or medical topic
- Pagination for large conversation histories

#### Story 1.2: Conversation Timeline
**As a** patient tracking my health journey  
**I want to** see a timeline of all my medical conversations  
**So that I** can understand my health progression over time  

**Acceptance Criteria:**
- Chronological view of all conversations
- Visual timeline with health milestones
- Quick preview of each conversation
- Ability to drill into specific conversations
- Export timeline for personal records

### Epic 2: Clinical Session History

#### Story 2.1: Capture Complete Clinical Sessions
**As a** healthcare provider  
**I want** the system to capture our entire consultation  
**So that** nothing important is missed and I can review later  

**Acceptance Criteria:**
- Real-time transcription storage with speaker identification
- AI insights saved alongside transcripts
- Audio references linked to text segments
- Ability to add post-session notes
- Automatic session summary generation

#### Story 2.2: Review Session Insights
**As a** doctor reviewing a past consultation  
**I want to** quickly see the AI-generated insights and key points  
**So that I** can prepare for follow-up appointments efficiently  

**Acceptance Criteria:**
- Structured view of diagnoses, treatments, and recommendations
- Confidence scores for AI insights
- Ability to confirm or modify AI suggestions
- Link insights to specific conversation moments
- Generate follow-up action items

### Epic 3: AI Chat History

#### Story 3.1: Continue AI Conversations
**As a** patient with ongoing health questions  
**I want to** continue my previous AI chat conversations  
**So that** the AI remembers our discussion context  

**Acceptance Criteria:**
- Seamless conversation resumption
- AI references previous discussions appropriately
- Clear indication of conversation continuity
- Option to start fresh or continue
- Context summary shown when resuming

#### Story 3.2: Reference Past AI Advice
**As a** user who received AI health guidance  
**I want to** easily find and review past AI recommendations  
**So that I** can follow through on health advice  

**Acceptance Criteria:**
- Searchable AI recommendations
- Categorized by health topic
- Links to source documents or research
- Track which advice was followed
- Set reminders for health actions

### Epic 4: Cross-Conversation Intelligence

#### Story 4.1: Health Pattern Detection
**As a** patient with chronic conditions  
**I want** the system to identify patterns across all my conversations  
**So that I** can better understand my health trends  

**Acceptance Criteria:**
- Pattern analysis across conversation types
- Highlight recurring symptoms or concerns
- Trend visualization over time
- Correlation with health outcomes
- Actionable insights from patterns

#### Story 4.2: Comprehensive Health Summary
**As a** user preparing for a specialist appointment  
**I want to** generate a summary from all relevant conversations  
**So that I** can provide complete information to my doctor  

**Acceptance Criteria:**
- Smart summary generation from multiple conversations
- Include both AI chats and clinical sessions
- Chronological organization of relevant information
- Customizable summary sections
- Export in standard medical formats

## Implementation Architecture

### Storage Layer

```typescript
// src/lib/history/types.ts
export interface UnifiedConversation {
  id: string;
  userId: string;
  profileId: string;
  type: 'ai_chat' | 'clinical_session';
  title: string;
  metadata: ConversationMetadata;
  participants: Participant[];
  status: ConversationStatus;
  startedAt: Date;
  endedAt?: Date;
  lastActivityAt: Date;
}

export interface ConversationMetadata {
  summary?: string;
  tags: string[];
  chiefComplaint?: string;
  diagnoses?: string[];
  medications?: string[];
  anatomyReferences?: string[];
  documentReferences?: string[];
}

export interface UnifiedMessage {
  id: string;
  conversationId: string;
  participantId: string;
  type: MessageType;
  content: string;
  metadata?: MessageMetadata;
  timestamp: Date;
  sequenceNumber: number;
  analysisId?: string;
}

export interface MessageMetadata {
  confidence?: number;
  speaker?: string;
  audioSegment?: AudioReference;
  toolsUsed?: string[];
  anatomyFocus?: string[];
  documentIds?: string[];
}

export interface ConversationAnalysis {
  id: string;
  conversationId: string;
  messageId?: string;
  type: AnalysisType;
  results: AnalysisResults;
  modelUsed: string;
  confidence: number;
  createdAt: Date;
}
```

### Service Layer

```typescript
// src/lib/history/conversation-service.ts
export class UnifiedConversationService {
  constructor(
    private supabase: SupabaseClient,
    private encryptionService: EncryptionService,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Create a new conversation
   */
  async createConversation(
    params: CreateConversationParams
  ): Promise<UnifiedConversation> {
    const conversation = {
      userId: params.userId,
      profileId: params.profileId,
      type: params.type,
      title: params.title || this.generateTitle(params),
      metadata: await this.encryptMetadata(params.metadata),
      status: 'active'
    };

    const { data, error } = await this.supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) throw error;

    // Add participants
    await this.addParticipants(data.id, params.participants);

    // Initialize analytics
    await this.analyticsService.trackConversationStart(data);

    return this.decryptConversation(data);
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    message: AddMessageParams
  ): Promise<UnifiedMessage> {
    // Get next sequence number
    const sequenceNumber = await this.getNextSequenceNumber(conversationId);

    // Encrypt content
    const encryptedContent = await this.encryptionService.encrypt(
      message.content,
      this.userKeys
    );

    // Save message
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        participant_id: message.participantId,
        type: message.type,
        encrypted_content: encryptedContent,
        encrypted_metadata: message.metadata 
          ? await this.encryptionService.encrypt(JSON.stringify(message.metadata))
          : null,
        sequence_number: sequenceNumber,
        audio_url: message.audioUrl,
        duration_seconds: message.durationSeconds
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation activity
    await this.updateLastActivity(conversationId);

    // Trigger analysis if needed
    if (this.shouldTriggerAnalysis(message)) {
      await this.triggerAnalysis(conversationId, data.id);
    }

    return this.decryptMessage(data);
  }

  /**
   * Save AI analysis results
   */
  async saveAnalysis(
    conversationId: string,
    analysis: AnalysisResults,
    messageId?: string
  ): Promise<ConversationAnalysis> {
    const encryptedAnalysis = await this.encryptionService.encrypt(
      JSON.stringify(analysis),
      this.userKeys
    );

    const { data, error } = await this.supabase
      .from('conversation_analysis')
      .insert({
        conversation_id: conversationId,
        message_id: messageId,
        encrypted_analysis: encryptedAnalysis,
        analysis_type: analysis.type,
        model_used: analysis.model,
        confidence_score: analysis.confidence
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation summary
    await this.updateConversationSummary(conversationId, analysis);

    return this.decryptAnalysis(data);
  }

  /**
   * Search across all conversations
   */
  async searchConversations(
    userId: string,
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResults> {
    // Build search query
    const searchQuery = this.supabase
      .from('conversations')
      .select(`
        *,
        messages(*),
        conversation_analysis(*),
        conversation_summaries(*)
      `)
      .eq('user_id', userId);

    // Apply filters
    if (filters?.type) {
      searchQuery.eq('type', filters.type);
    }
    if (filters?.profileId) {
      searchQuery.eq('profile_id', filters.profileId);
    }
    if (filters?.dateRange) {
      searchQuery.gte('started_at', filters.dateRange.start)
        .lte('started_at', filters.dateRange.end);
    }

    const { data, error } = await searchQuery;
    if (error) throw error;

    // Decrypt and search content
    const results = await this.searchDecryptedContent(data, query);

    return {
      conversations: results,
      totalCount: results.length,
      query,
      filters
    };
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(
    conversationId: string
  ): Promise<ConversationSummary> {
    // Load full conversation
    const conversation = await this.loadFullConversation(conversationId);

    // Generate summary using AI
    const summary = await this.aiService.generateConversationSummary(
      conversation
    );

    // Extract medical codes
    const medicalCodes = await this.extractMedicalCodes(conversation);

    // Save summary
    const encryptedSummary = await this.encryptionService.encrypt(
      summary.text,
      this.userKeys
    );

    const { data, error } = await this.supabase
      .from('conversation_summaries')
      .upsert({
        conversation_id: conversationId,
        encrypted_summary: encryptedSummary,
        key_points: await this.encryptionService.encrypt(
          JSON.stringify(summary.keyPoints)
        ),
        icd_codes: medicalCodes.icdCodes,
        cpt_codes: medicalCodes.cptCodes,
        message_count: conversation.messages.length,
        duration_seconds: this.calculateDuration(conversation)
      })
      .select()
      .single();

    if (error) throw error;

    return this.decryptSummary(data);
  }
}
```

### Integration Points

#### AI Chat Integration

```typescript
// src/lib/chat/history-integration.ts
export class ChatHistoryIntegration {
  constructor(
    private conversationService: UnifiedConversationService,
    private chatManager: ChatManager
  ) {}

  async initializeChatWithHistory(
    userId: string,
    profileId: string,
    continueConversation?: boolean
  ): Promise<ChatSession> {
    let conversation: UnifiedConversation;

    if (continueConversation) {
      // Find most recent AI chat for this profile
      const recent = await this.conversationService.findRecentConversation(
        userId,
        profileId,
        'ai_chat'
      );

      if (recent && this.isRecent(recent)) {
        conversation = recent;
        
        // Load conversation history into chat context
        const messages = await this.conversationService.loadMessages(
          conversation.id
        );
        
        this.chatManager.initializeWithHistory(messages);
      } else {
        conversation = await this.createNewChatConversation(userId, profileId);
      }
    } else {
      conversation = await this.createNewChatConversation(userId, profileId);
    }

    // Set up auto-save
    this.setupAutoSave(conversation.id);

    return {
      conversationId: conversation.id,
      threadId: conversation.threadId,
      messages: conversation.messages || []
    };
  }

  private setupAutoSave(conversationId: string): void {
    this.chatManager.on('ai-response', async (event) => {
      // Save user message
      await this.conversationService.addMessage(conversationId, {
        participantId: event.userId,
        type: 'text',
        content: event.userMessage,
        metadata: {
          confidence: 1.0
        }
      });

      // Save AI response
      await this.conversationService.addMessage(conversationId, {
        participantId: 'ai-assistant',
        type: 'text',
        content: event.aiResponse.text,
        metadata: {
          toolsUsed: event.aiResponse.toolCalls?.map(t => t.name),
          anatomyFocus: event.aiResponse.anatomyReferences,
          documentIds: event.aiResponse.documentIds
        }
      });

      // Save analysis if present
      if (event.aiResponse.analysis) {
        await this.conversationService.saveAnalysis(
          conversationId,
          event.aiResponse.analysis
        );
      }
    });
  }
}
```

#### Clinical Session Integration

```typescript
// src/lib/session/history-integration.ts
export class SessionHistoryIntegration {
  constructor(
    private conversationService: UnifiedConversationService,
    private sessionManager: SessionManager
  ) {}

  async initializeSessionWithHistory(
    doctorId: string,
    patientProfileId: string,
    sessionId: string
  ): Promise<ClinicalSession> {
    // Create clinical session conversation
    const conversation = await this.conversationService.createConversation({
      userId: doctorId,
      profileId: patientProfileId,
      type: 'clinical_session',
      participants: [
        { id: doctorId, role: 'provider', name: 'Dr. Smith' },
        { id: patientProfileId, role: 'patient', name: 'Patient Name' }
      ],
      metadata: {
        sessionId,
        recordingEnabled: true
      }
    });

    // Set up real-time transcript saving
    this.setupTranscriptSaving(conversation.id);

    // Set up analysis saving
    this.setupAnalysisSaving(conversation.id);

    return {
      conversationId: conversation.id,
      sessionId,
      participants: conversation.participants
    };
  }

  private setupTranscriptSaving(conversationId: string): void {
    this.sessionManager.on('transcript', async (event) => {
      await this.conversationService.addMessage(conversationId, {
        participantId: event.speakerId,
        type: 'audio',
        content: event.text,
        metadata: {
          confidence: event.confidence,
          speaker: event.speaker,
          audioSegment: {
            start: event.startTime,
            end: event.endTime
          }
        },
        audioUrl: event.audioUrl,
        durationSeconds: event.duration
      });
    });
  }

  private setupAnalysisSaving(conversationId: string): void {
    this.sessionManager.on('analysis-update', async (event) => {
      await this.conversationService.saveAnalysis(
        conversationId,
        {
          type: 'incremental',
          diagnosis: event.diagnosis,
          treatment: event.treatment,
          medication: event.medication,
          followUp: event.followUp,
          confidence: event.confidence,
          model: 'gpt-4'
        }
      );
    });
  }

  async finalizeSession(
    conversationId: string,
    sessionSummary: SessionSummary
  ): Promise<void> {
    // Update conversation status
    await this.conversationService.updateConversation(conversationId, {
      status: 'completed',
      endedAt: new Date()
    });

    // Save final analysis
    await this.conversationService.saveAnalysis(
      conversationId,
      {
        type: 'final',
        ...sessionSummary.analysis,
        model: 'gpt-4'
      }
    );

    // Generate and save summary
    await this.conversationService.generateSummary(conversationId);
  }
}
```

## Migration Strategy

### Phase 1: Schema Creation
1. Deploy new unified tables alongside existing ones
2. Set up RLS policies and indexes
3. Test encryption/decryption flows

### Phase 2: Data Migration
1. Migrate existing AI chat conversations
2. Migrate existing clinical session data
3. Verify data integrity and accessibility

### Phase 3: Integration
1. Update AI chat to use new storage
2. Update clinical sessions to use new storage
3. Implement search and summary features

### Phase 4: Deprecation
1. Mark old storage methods as deprecated
2. Provide migration tools for any remaining data
3. Remove old storage code

## Performance Considerations

### Indexing Strategy
- Composite indexes on frequently queried combinations
- Partial indexes for active conversations
- GIN indexes on JSONB fields for search

### Caching Strategy
- Redis cache for active conversation metadata
- Local storage for current conversation
- Lazy loading for message history

### Query Optimization
- Pagination for large conversations
- Batch loading for related data
- Prepared statements for common queries

## Security & Privacy

### Encryption Strategy
- All message content encrypted with user keys
- Metadata selectively encrypted based on sensitivity
- Audio files encrypted at rest in storage

### Access Control
- RLS policies enforce data boundaries
- API-level permission checks
- Audit logging for all access

### Data Retention
- Configurable retention periods
- Automatic anonymization after retention
- Patient-controlled data deletion

## Success Metrics

### Performance Metrics
- Query response time < 200ms for recent conversations
- Search results < 500ms for full history
- Message save latency < 100ms

### Usage Metrics
- Conversation continuation rate > 60%
- Search feature usage > 40% of users
- Summary generation satisfaction > 4.5/5

### Data Quality Metrics
- Transcript accuracy > 95%
- Analysis relevance > 85%
- Zero data loss incidents

## Conclusion

This unified history system provides a robust foundation for capturing and leveraging all medical conversations within Mediqom. By combining AI chat and clinical session histories, we enable powerful cross-conversation insights while maintaining security, performance, and usability.