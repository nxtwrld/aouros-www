import { get } from 'svelte/store';
import { chatStore, chatActions, createMessage } from './store';
import ChatClientService from './client-service';
import AnatomyIntegration from './anatomy-integration';
import type { ChatMessage, ChatContext, ChatResponse } from './types.d';
import { generateId } from '$lib/utils/id';
import ui from '$lib/ui';
import { t } from '$lib/i18n';

export class ChatManager {
  private clientService: ChatClientService;
  private isProcessing = false;
  private isInitialized = false;
  private currentProfileId: string | null = null;
  private eventListeners: (() => void)[] = [];

  constructor() {
    this.clientService = new ChatClientService();
  }

  /**
   * Start listening to UI events
   */
  startListening(): void {
    // Listen for navigation events
    const navigationListener = ui.listen('chat:navigation', (data: {
      route: string;
      profileId: string;
      profileName: string;
      documentId?: string;
      documentName?: string;
    }) => {
      this.handleNavigation(data);
    });

    // Listen for profile switch events
    const profileSwitchListener = ui.listen('chat:profile_switch', (data: {
      profileId: string;
      profileName: string;
      isOwnProfile: boolean;
      language: string;
    }) => {
      this.handleProfileSwitch(data);
    });

    // Listen for context add events
    const contextAddListener = ui.listen('chat:context_add', (data: {
      documentId: string;
      documentName: string;
      documentType: string;
    }) => {
      this.handleContextAdd(data);
    });

    // Listen for context reset events
    const contextResetListener = ui.listen('chat:context_reset', (data: {
      reason: 'profile_switch' | 'user_request';
    }) => {
      this.handleContextReset(data);
    });

    // Listen for chat toggle events
    const chatToggleListener = ui.listen('chat:toggle', () => {
      this.handleChatToggle();
    });

    // Listen for document context events
    const documentContextListener = ui.listen('aicontext:document', (data: {
      documentId: string;
      title: string;
      content: any;
      timestamp: Date;
    }) => {
      this.handleDocumentContext(data);
    });

    // Listen for profile context events
    const profileContextListener = ui.listen('aicontext:profile', (data: {
      profileId: string;
      profileName: string;
      profileData: any;
      timestamp: Date;
    }) => {
      this.handleProfileContext(data);
    });

    // Store cleanup functions
    this.eventListeners.push(navigationListener, profileSwitchListener, contextAddListener, contextResetListener, chatToggleListener, documentContextListener, profileContextListener);
  }

  /**
   * Stop listening to UI events
   */
  stopListening(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  /**
   * Get cached context for chat initialization
   */
  private getCachedContext(profileId: string, profileName: string, isOwnProfile: boolean, language: string): ChatContext {
    // Get latest events from UI emitter
    const profileEvent = ui.getLatest('aicontext:profile') || ui.getLatest('chat:profile_switch');
    const documentEvent = ui.getLatest('aicontext:document');
    const navigationEvent = ui.getLatest('chat:navigation');
    
    // Use cached profile data if available and matches current profile
    const profileData = profileEvent?.data && profileEvent.data.profileId === profileId 
      ? profileEvent.data 
      : null;
    
    // Use cached document data if available
    const documentData = documentEvent?.data;
    
    return {
      mode: isOwnProfile ? 'patient' : 'clinical',
      currentProfileId: profileId,
      conversationThreadId: generateId(),
      language: language,
      isOwnProfile: isOwnProfile,
      pageContext: {
        route: navigationEvent?.data?.route || '/',
        profileName: profileData?.profileName || profileName,
        availableData: {
          documents: documentData ? [documentData.documentId] : [],
          conditions: [],
          medications: [],
          vitals: [],
        },
        // Include document content if available
        documentsContent: documentData ? new Map([[documentData.documentId, documentData.content]]) : undefined,
      },
    };
  }

  /**
   * Handle navigation events
   */
  private handleNavigation(data: {
    route: string;
    profileId: string;
    profileName: string;
    documentId?: string;
    documentName?: string;
  }): void {
    const state = get(chatStore);
    if (state.context) {
      // Update page context
      chatActions.updateContext({
        pageContext: {
          ...state.context.pageContext,
          route: data.route,
          profileName: data.profileName,
        }
      });

      // Add document to context if provided
      if (data.documentId && data.documentName) {
        this.addDocumentToContext(data.documentId, data.documentName);
      }
    }
  }

  /**
   * Handle profile switch events
   */
  private handleProfileSwitch(data: {
    profileId: string;
    profileName: string;
    isOwnProfile: boolean;
    language: string;
  }): void {
    const state = get(chatStore);
    
    // If we don't have a context yet, initialize with this profile
    // Check cache for any existing context first
    if (!state.context) {
      const cachedContext = this.getCachedContext(data.profileId, data.profileName, data.isOwnProfile, data.language);
      this.initializeChat(cachedContext);
      return;
    }
    
    // If switching to a different profile, save current conversation but don't initialize yet
    // Let the profile context event handle the prompt
    if (state.context.currentProfileId !== data.profileId && state.messages.length > 0) {
      const history = new Map(state.conversationHistory);
      history.set(state.context.currentProfileId, [...state.messages]);
      
      chatStore.update(s => ({
        ...s,
        conversationHistory: history,
      }));
      console.log(`Saved ${state.messages.length} messages for profile ${state.context.currentProfileId}`);
    }
  }

  /**
   * Handle context add events
   */
  private handleContextAdd(data: {
    documentId: string;
    documentName: string;
    documentType: string;
  }): void {
    this.addDocumentToContext(data.documentId, data.documentName);
  }

  /**
   * Handle context reset events
   */
  private handleContextReset(data: {
    reason: 'profile_switch' | 'user_request';
  }): void {
    if (data.reason === 'user_request') {
      this.clearConversation();
    }
    // Profile switch is handled by handleProfileSwitch
  }

  /**
   * Handle chat toggle events
   */
  private handleChatToggle(): void {
    chatActions.toggle();
  }

  /**
   * Handle document context events
   */
  private handleDocumentContext(data: {
    documentId: string;
    title: string;
    content: any;
    timestamp: Date;
  }): void {
    // Only show prompt if chat is initialized and we're not already processing
    const state = get(chatStore);
    if (!state.context || this.isProcessing) {
      return;
    }

    // Check if document is already in context
    const existingDocs = state.context.pageContext.availableData.documents || [];
    if (existingDocs.includes(data.documentId)) {
      return; // Document already added
    }

    // Create uniform prompt object with callbacks
    const contextPrompt = {
      type: 'document' as const,
      id: data.documentId,
      title: data.title,
      messageKey: 'app.chat.document.add-prompt',
      messageParams: { title: data.title },
      acceptLabelKey: 'app.chat.document.add-yes',
      declineLabelKey: 'app.chat.document.add-no',
      data: data.content,
      timestamp: data.timestamp,
      onAccept: () => this.acceptDocumentContext(data.documentId, data.title, data.content),
      onDecline: () => this.declineDocumentContext(data.documentId, data.title)
    };

    // Add document context prompt message
    const promptMessage = createMessage('system', '', {
      contextPrompt
    });
    
    chatActions.addMessage(promptMessage);
    console.log(`Document context prompt added for: ${data.title}`);
  }

  /**
   * Add document to context
   */
  private addDocumentToContext(documentId: string, documentName: string): void {
    const state = get(chatStore);
    if (state.context) {
      const updatedDocuments = [...state.context.pageContext.availableData.documents, documentId];
      chatActions.updateContext({
        pageContext: {
          ...state.context.pageContext,
          availableData: {
            ...state.context.pageContext.availableData,
            documents: updatedDocuments,
          }
        }
      });

      // Add system message about document access
      const contextMsg = createMessage(
        'system',
        '', // Empty content - translation will be handled in the component
        {
          translationKey: 'app.chat.document.added',
          translationParams: { title: documentName }
        }
      );
      chatActions.addMessage(contextMsg);
    }
  }

  /**
   * Handle user accepting document addition
   */
  acceptDocumentContext(documentId: string, documentName: string, documentContent: any): void {
    // Store document content in context
    const state = get(chatStore);
    if (state.context) {
      // Initialize documentsContent map if it doesn't exist
      const documentsContent = new Map(state.context.pageContext.documentsContent || []);
      documentsContent.set(documentId, documentContent);
      
      // Update context with document content
      chatActions.updateContext({
        pageContext: {
          ...state.context.pageContext,
          documentsContent
        }
      });
    }
    
    // Add to document list and show confirmation
    this.addDocumentToContext(documentId, documentName);
    
    console.log(`Document ${documentId} accepted with full content`);
  }

  /**
   * Handle user declining document addition
   */
  declineDocumentContext(documentId: string, documentName: string): void {
    // Add system message about declining
    const declineMsg = createMessage(
      'system',
      '', // Empty content - translation will be handled in the component
      {
        translationKey: 'app.chat.document.declined'
      }
    );
    chatActions.addMessage(declineMsg);
    console.log(`Document ${documentId} declined by user`);
  }

  /**
   * Handle profile context events
   */
  private handleProfileContext(data: {
    profileId: string;
    profileName: string;
    profileData: any;
    timestamp: Date;
  }): void {
    const state = get(chatStore);
    if (!state.context || this.isProcessing) {
      return;
    }

    // Check if this is a different profile
    if (state.context.currentProfileId === data.profileId) {
      return; // Same profile, no action needed
    }

    // Create uniform prompt object with callbacks
    const contextPrompt = {
      type: 'profile' as const,
      id: data.profileId,
      title: data.profileName,
      messageKey: 'app.chat.profile.switch-prompt',
      messageParams: { profileName: data.profileName },
      acceptLabelKey: 'app.chat.profile.switch-yes',
      declineLabelKey: 'app.chat.profile.switch-no',
      data: data.profileData,
      timestamp: data.timestamp,
      onAccept: () => this.acceptProfileContext(data.profileId, data.profileName, data.profileData),
      onDecline: () => this.declineProfileContext(data.profileId, data.profileName)
    };

    // Add profile context prompt message
    const promptMessage = createMessage('system', '', {
      contextPrompt
    });
    
    chatActions.addMessage(promptMessage);
    console.log(`Profile context prompt added for: ${data.profileName}`);
  }

  /**
   * Handle user accepting profile context reset
   */
  acceptProfileContext(profileId: string, profileName: string, _profileData: any): void {
    const state = get(chatStore);
    
    // Save current conversation to history before switching
    if (state.context && state.messages.length > 0) {
      const history = new Map(state.conversationHistory);
      history.set(state.context.currentProfileId, [...state.messages]);
      chatStore.update(s => ({
        ...s,
        conversationHistory: history,
      }));
    }
    
    // Create new context for the new profile
    const newContext: ChatContext = {
      mode: state.context?.mode || 'patient',
      currentProfileId: profileId,
      conversationThreadId: generateId(),
      language: state.context?.language || 'en',
      isOwnProfile: state.context?.isOwnProfile || true,
      pageContext: {
        route: state.context?.pageContext?.route || '/',
        profileName: profileName,
        availableData: {
          documents: [],
          conditions: [],
          medications: [],
          vitals: [],
        },
      },
    };
    
    // Initialize chat with new profile context
    this.initializeChat(newContext);
    
    // Add system message about context reset
    const resetMsg = createMessage(
      'system',
      '', // Empty content - translation will be handled in the component
      {
        translationKey: 'app.chat.profile.context-reset',
        translationParams: { profileName }
      }
    );
    chatActions.addMessage(resetMsg);
    console.log(`Profile context reset accepted for ${profileId}`);
  }

  /**
   * Handle user declining profile context reset
   */
  declineProfileContext(profileId: string, profileName: string): void {
    // Update the context to reflect we're now discussing a different profile
    const state = get(chatStore);
    if (state.context) {
      chatActions.updateContext({
        currentProfileId: profileId,
        pageContext: {
          ...state.context.pageContext,
          profileName: profileName
        }
      });
    }
    
    // Add system message about keeping context
    const keepMsg = createMessage(
      'system',
      '', // Empty content - translation will be handled in the component
      {
        translationKey: 'app.chat.profile.context-kept',
        translationParams: { profileName }
      }
    );
    chatActions.addMessage(keepMsg);
    console.log(`Profile context reset declined for ${profileId}`);
  }

  /**
   * Initialize chat for current profile
   */
  async initializeChat(context: ChatContext): Promise<void> {
    console.log(`Initializing chat for profile ${context.currentProfileId}, mode: ${context.mode}`);
    
    const state = get(chatStore);
    
    // Check if we have existing history for this profile
    const existingHistory = state.conversationHistory.get(context.currentProfileId) || [];
    
    // Only clear messages if we don't have existing history
    if (existingHistory.length === 0) {
      chatActions.clearMessages();
      
      // Add initial greeting based on mode
      const greeting = this.getInitialGreeting(context);
      if (greeting) {
        const greetingMessage = createMessage('assistant', greeting);
        chatActions.addMessage(greetingMessage);
        console.log('Added greeting message:', greeting.substring(0, 50) + '...');
      }
    } else {
      // Restore existing history
      chatActions.setMessages(existingHistory);
      console.log(`Restored ${existingHistory.length} messages from history`);
    }

    // Set the context
    chatActions.setContext(context);

    this.isInitialized = true;
    this.currentProfileId = context.currentProfileId;
    console.log(`Chat initialized for ${context.mode} mode with language ${context.language}`);
  }

  /**
   * Process user message and get AI response via SSE
   */
  async sendMessage(userMessage: string): Promise<void> {
    if (this.isProcessing) {
      console.warn('Chat is already processing a message');
      return;
    }

    const state = get(chatStore);
    if (!state.context) {
      throw new Error('Chat context not initialized');
    }

    this.isProcessing = true;
    chatActions.setLoading(true);

    try {
      // Add user message to chat
      const userMsg = createMessage('user', userMessage);
      chatActions.addMessage(userMsg);

      // Create a message that will be updated as chunks arrive
      let streamingMessageId: string | null = null;
      let accumulatedContent = '';
      let messageMetadata: any = {};

      // Send message via SSE
      await this.clientService.sendMessage(
        userMessage,
        state.context,
        state.messages,
        (event) => {
          switch (event.type) {
            case 'chunk':
              // Handle streaming chunks
              accumulatedContent += event.content || '';
              
              if (!streamingMessageId) {
                // Create initial streaming message
                const streamingMsg = createMessage('assistant', accumulatedContent);
                streamingMessageId = streamingMsg.id;
                chatActions.addMessage(streamingMsg);
              } else {
                // Update existing message with new content
                const currentState = get(chatStore);
                const updatedMessages = currentState.messages.map(msg => 
                  msg.id === streamingMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                );
                chatActions.setMessages(updatedMessages);
              }
              break;

            case 'metadata':
              // Store metadata for later use
              messageMetadata = {
                anatomyFocus: event.data.anatomyReferences,
                documentsReferenced: event.data.documentReferences,
                toolsUsed: [],
              };
              
              // Update the message with metadata
              if (streamingMessageId) {
                const currentState = get(chatStore);
                const updatedMessages = currentState.messages.map(msg => 
                  msg.id === streamingMessageId 
                    ? { ...msg, metadata: messageMetadata }
                    : msg
                );
                chatActions.setMessages(updatedMessages);
              }

              // Handle consent requests
              if (event.data.consentRequests && event.data.consentRequests.length > 0) {
                this.handleConsentRequests(event.data.consentRequests);
              }
              break;

            case 'complete':
              // Streaming is complete
              console.log('Streaming complete');
              break;

            case 'error':
              // Add error message
              const errorMsg = createMessage(
                'assistant',
                event.message || 'I apologize, but I encountered an error processing your message. Please try again.'
              );
              chatActions.addMessage(errorMsg);
              break;
          }
        }
      );

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message to chat
      const errorMsg = createMessage(
        'assistant',
        'I apologize, but I encountered an error processing your message. Please try again.'
      );
      chatActions.addMessage(errorMsg);
    } finally {
      this.isProcessing = false;
      chatActions.setLoading(false);
    }
  }

  /**
   * Handle anatomy suggestions from AI
   */
  private handleAnatomySuggestions(suggestions: any[]): void {
    // This could trigger UI elements to show anatomy buttons
    console.log('Anatomy suggestions:', suggestions);
  }

  /**
   * Handle consent requests from AI
   */
  private handleConsentRequests(requests: any[]): void {
    // This could trigger consent dialog UI
    console.log('Consent requests:', requests);
  }

  /**
   * Open anatomy model and focus on body part
   */
  async focusAnatomy(bodyPartId: string): Promise<void> {
    try {
      console.log('Focusing anatomy on:', bodyPartId);
      
      // Validate if this is a valid body part
      if (!AnatomyIntegration.isValidBodyPart(bodyPartId)) {
        console.error(`Invalid body part ID: ${bodyPartId}`);
        const errorMsg = createMessage(
          'system',
          `Unable to focus on "${bodyPartId}" - not found in anatomy model`,
          {}
        );
        chatActions.addMessage(errorMsg);
        return;
      }
      
      await AnatomyIntegration.openAndFocus(bodyPartId);
    } catch (error) {
      console.error('Error focusing anatomy:', error);
    }
  }

  /**
   * Switch profile context
   */
  async switchProfile(profileId: string, isOwnProfile: boolean): Promise<void> {
    const state = get(chatStore);
    
    if (state.context?.currentProfileId === profileId) {
      return; // Already on this profile
    }

    // Switch profile in store
    chatActions.switchProfile(profileId, isOwnProfile);

    // Update context mode
    const newMode = isOwnProfile ? 'patient' : 'clinical';
    chatActions.updateContext({ mode: newMode });

    // Add profile switch message
    const profileName = state.context?.pageContext?.profileName || 'Unknown';
    const switchMsg = createMessage(
      'system',
      `Switched to ${profileName}'s profile (${newMode} mode)`
    );
    chatActions.addMessage(switchMsg);
  }

  /**
   * Clear current conversation
   */
  clearConversation(): void {
    chatActions.clearMessages();
    
    // Add new greeting
    const state = get(chatStore);
    if (state.context) {
      const greeting = this.getInitialGreeting(state.context);
      if (greeting) {
        const greetingMessage = createMessage('assistant', greeting);
        chatActions.addMessage(greetingMessage);
      }
    }
  }

  /**
   * Save current conversation to history before closing
   */
  saveCurrentConversation(): void {
    const state = get(chatStore);
    if (state.context?.currentProfileId && state.messages.length > 0) {
      const history = new Map(state.conversationHistory);
      history.set(state.context.currentProfileId, [...state.messages]);
      
      chatStore.update(s => ({
        ...s,
        conversationHistory: history,
      }));
      console.log(`Saved ${state.messages.length} messages for profile ${state.context.currentProfileId}`);
    }
  }

  /**
   * Get initial greeting based on mode and context
   */
  private getInitialGreeting(context: ChatContext): string {
    const profileName = context.pageContext.profileName;
    
    if (context.mode === 'patient') {
      return get(t)('app.chat.greetings.patient');
    } else {
      return get(t)('app.chat.greetings.clinical', { values: { profileName } });
    }
  }

  /**
   * Get chat statistics
   */
  getChatStats(): {
    messageCount: number;
    anatomyInteractions: number;
    documentsAccessed: number;
    isProcessing: boolean;
  } {
    const state = get(chatStore);
    
    return {
      messageCount: state.messages.length,
      anatomyInteractions: state.messages.filter(m => 
        m.metadata?.anatomyFocus && m.metadata.anatomyFocus.length > 0
      ).length,
      documentsAccessed: new Set(
        state.messages
          .filter(m => m.metadata?.documentsReferenced)
          .flatMap(m => m.metadata?.documentsReferenced || [])
      ).size,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Export conversation history
   */
  exportConversation(): string {
    const state = get(chatStore);
    const exportData = {
      context: state.context,
      messages: state.messages,
      timestamp: new Date().toISOString(),
      stats: this.getChatStats(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}

// Export singleton instance
export const chatManager = new ChatManager();
export default chatManager;