<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { chatStore, chatActions, isOpen, messages, isLoading } from '$lib/chat/store';
  import { chatManager } from '$lib/chat/chat-manager';
  import type { ChatMessage } from '$lib/chat/types.d';
  import ui from '$lib/ui';
  import { t } from '$lib/i18n';
  import ContextPrompt from './ContextPrompt.svelte';
  
  interface Props {
    currentProfile: any;
    isOwnProfile: boolean;
    userLanguage: string;
  }

  let { currentProfile, isOwnProfile, userLanguage }: Props = $props();
  
  // Local component state
  let messageInput = $state('');
  let messagesContainer = $state<HTMLElement>();
  let sidebarWidth = $state(400);
  let isResizing = $state(false);
  
  // Reactive state
  let chatMessages = $state<ChatMessage[]>([]);
  let chatIsLoading = $state(false);
  let chatIsOpen = $state(false);
  let currentProfileName = $state<string>('');
  
  // Subscribe to store changes
  let unsubscribeMessages: (() => void) | null = null;
  let unsubscribeLoading: (() => void) | null = null;
  let unsubscribeOpen: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  onMount(() => {
    // Subscribe to store changes
    unsubscribeMessages = messages.subscribe((msgs) => {
      chatMessages = msgs;
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => scrollToBottom(), 100);
    });
    
    unsubscribeLoading = isLoading.subscribe((loading) => {
      chatIsLoading = loading;
    });
    
    unsubscribeOpen = isOpen.subscribe((open) => {
      chatIsOpen = open;
    });
    
    // Subscribe to chat store for context updates
    unsubscribeStore = chatStore.subscribe((state) => {
      if (state.context?.pageContext?.profileName) {
        currentProfileName = state.context.pageContext.profileName;
      }
    });
    
    // Start listening to UI events
    chatManager.startListening();
  });

  onDestroy(() => {
    // Cleanup subscriptions
    unsubscribeMessages?.();
    unsubscribeLoading?.();
    unsubscribeOpen?.();
    unsubscribeStore?.();
    
    // Stop listening to UI events
    chatManager.stopListening();
  });

  // Initialize chat context - removed as it's now handled by event-driven architecture
  // The chat manager will handle initialization when receiving profile switch events

  // Handle sending message
  async function sendMessage() {
    if (!messageInput.trim() || chatIsLoading) return;
    
    const message = messageInput.trim();
    messageInput = '';
    
    try {
      await chatManager.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Re-add message to input on error
      messageInput = message;
    }
  }

  // Handle key press in input
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // Scroll to bottom of messages
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Handle anatomy focus
  async function focusAnatomy(bodyPartId: string) {
    try {
      await chatManager.focusAnatomy(bodyPartId);
    } catch (error) {
      console.error('Failed to focus anatomy:', error);
    }
  }

  // Clear conversation
  function clearConversation() {
    chatManager.clearConversation();
  }

  // Handle document context acceptance
  function acceptDocument(documentId: string, documentName: string, documentContent: any) {
    chatManager.acceptDocumentContext(documentId, documentName, documentContent);
  }

  // Handle document context decline
  function declineDocument(documentId: string, documentName: string) {
    chatManager.declineDocumentContext(documentId, documentName);
  }

  // Handle profile context acceptance
  function acceptProfile(profileId: string, profileName: string, profileData: any) {
    chatManager.acceptProfileContext(profileId, profileName, profileData);
  }

  // Handle profile context decline
  function declineProfile(profileId: string, profileName: string) {
    chatManager.declineProfileContext(profileId, profileName);
  }

  // Format message timestamp
  function formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Handle sidebar resize
  function startResize(event: MouseEvent) {
    isResizing = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    event.preventDefault();
  }

  function handleResize(event: MouseEvent) {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - event.clientX;
    sidebarWidth = Math.max(300, Math.min(800, newWidth));
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }

  // Toggle sidebar
  function toggleSidebar() {
    chatActions.toggle();
  }

  // Watch for profile changes
  $effect(() => {
    if (currentProfile && userLanguage) {
      console.log('Profile or language changed, emitting profile switch event:', {
        profileId: currentProfile.id,
        language: userLanguage,
        isOwnProfile
      });
      
      // Emit profile switch event
      ui.emit('chat:profile_switch', {
        profileId: currentProfile.id,
        profileName: currentProfile.fullName || 'Unknown',
        isOwnProfile,
        language: userLanguage
      });
    }
  });
</script>

<!-- Chat Toggle Button removed - now in Header -->

<!-- Chat Sidebar -->
{#if chatIsOpen}
  <div 
    class="chat-sidebar"
    style="width: {sidebarWidth}px"
  >
    <!-- Resize Handle -->
    <div 
      class="resize-handle"
      onmousedown={startResize}
      role="separator"
      aria-orientation="vertical"
      aria-label={$t('app.chat.sidebar.resize')}
    ></div>

    <!-- Header -->
    <div class="chat-header">
      <div class="chat-title">
        <h3>{$t('app.chat.title')}</h3>
        <div class="chat-subtitle">
          <span class="chat-profile">{currentProfileName || 'No profile selected'}</span>
          <span class="chat-mode">{$t(isOwnProfile ? 'app.chat.mode.patient' : 'app.chat.mode.clinical')}</span>
        </div>
      </div>
      <div class="chat-actions">
        <button 
          class="chat-action-btn"
          onclick={clearConversation}
          title={$t('app.chat.actions.clear')}
          aria-label={$t('app.chat.actions.clear')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
          </svg>
        </button>
        <button 
          class="chat-action-btn"
          onclick={toggleSidebar}
          title={$t('app.chat.actions.close')}
          aria-label={$t('app.chat.actions.close')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" bind:this={messagesContainer}>
      {#each chatMessages as message (message.id)}
        <div class="message {message.role}">
          <div class="message-content">
            <div class="message-text">
              {message.content}
            </div>
            
            <!-- Anatomy Focus Buttons -->
            {#if message.metadata?.anatomyFocus && message.metadata.anatomyFocus.length > 0}
              <div class="anatomy-actions">
                {#each message.metadata.anatomyFocus as bodyPart}
                  <button 
                    class="anatomy-btn"
                    onclick={() => focusAnatomy(bodyPart)}
                    aria-label={$t('app.chat.anatomy.view-aria', { bodyPart })}
                  >
                    🔍 {$t('app.chat.anatomy.view', { bodyPart })}
                  </button>
                {/each}
              </div>
            {/if}

            <!-- Context Prompts -->
            {#if message.metadata?.contextPrompt}
              <ContextPrompt prompt={message.metadata.contextPrompt} />
            {/if}

            <!-- Legacy Document Context Prompt -->
            {#if message.metadata?.documentPrompt}
              <div class="document-prompt">
                <p class="document-prompt-text">
                  {$t('app.chat.document.add-prompt', { title: message.metadata.documentPrompt.title })}
                </p>
                <div class="document-actions">
                  <button 
                    class="document-btn accept"
                    onclick={() => acceptDocument(
                      message.metadata.documentPrompt.documentId,
                      message.metadata.documentPrompt.title,
                      message.metadata.documentPrompt.content
                    )}
                  >
                    {$t('app.chat.document.add-yes')}
                  </button>
                  <button 
                    class="document-btn decline"
                    onclick={() => declineDocument(
                      message.metadata.documentPrompt.documentId,
                      message.metadata.documentPrompt.title
                    )}
                  >
                    {$t('app.chat.document.add-no')}
                  </button>
                </div>
              </div>
            {/if}

            <!-- Legacy Profile Context Prompt -->
            {#if message.metadata?.profilePrompt}
              <div class="profile-prompt">
                <p class="profile-prompt-text">
                  {$t('app.chat.profile.switch-prompt', { profileName: message.metadata.profilePrompt.profileName })}
                </p>
                <div class="profile-actions">
                  <button 
                    class="profile-btn accept"
                    onclick={() => acceptProfile(
                      message.metadata.profilePrompt.profileId,
                      message.metadata.profilePrompt.profileName,
                      message.metadata.profilePrompt.profileData
                    )}
                  >
                    {$t('app.chat.profile.switch-yes')}
                  </button>
                  <button 
                    class="profile-btn decline"
                    onclick={() => declineProfile(
                      message.metadata.profilePrompt.profileId,
                      message.metadata.profilePrompt.profileName
                    )}
                  >
                    {$t('app.chat.profile.switch-no')}
                  </button>
                </div>
              </div>
            {/if}
            
            <div class="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Loading indicator -->
      {#if chatIsLoading}
        <div class="message assistant">
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <div class="input-container">
        <textarea
          bind:value={messageInput}
          onkeydown={handleKeyPress}
          placeholder={$t('app.chat.placeholders.ask')}
          disabled={chatIsLoading}
          rows="2"
        ></textarea>
        <button 
          class="send-btn"
          onclick={sendMessage}
          disabled={chatIsLoading || !messageInput.trim()}
          aria-label={$t('app.chat.actions.send')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 2L2 12l8 4 12-8-8-8z"/>
            <path d="M10 16l-2 6 8-4"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Chat toggle button styles removed - now in Header */

  .chat-sidebar {
    position: fixed;
    top: var(--heading-height);
    right: 0;
    bottom: 0;
    background: var(--color-background);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 999;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  }

  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: transparent;
    cursor: col-resize;
    z-index: 1001;
  }

  .resize-handle:hover {
    background: var(--color-primary);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
  }

  .chat-title h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: var(--color-text-primary);
  }

  .chat-subtitle {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .chat-profile {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-blue);
  }

  .chat-mode {
    font-size: 12px;
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);
    padding: 2px 8px;
    border-radius: 12px;
  }

  .chat-actions {
    display: flex;
    gap: 8px;
  }

  .chat-action-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chat-action-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .chat-action-btn svg {
    width: 16px;
    height: 16px;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .message {
    display: flex;
    flex-direction: column;
  }

  .message.user {
    align-items: flex-end;
  }

  .message.assistant {
    align-items: flex-start;
  }

  .message.system {
    align-items: center;
  }

  .message-content {
    max-width: 80%;
    background: var(--color-bg-secondary);
    padding: 12px;
    border-radius: 12px;
    position: relative;
  }

  .message.user .message-content {
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message.assistant .message-content {
    background: var(--color-bg-tertiary);
    border-bottom-left-radius: 4px;
  }

  .message.system .message-content {
    background: var(--color-bg-quaternary);
    color: var(--color-text-secondary);
    font-size: 12px;
    max-width: 100%;
    text-align: center;
  }

  .message-text {
    margin-bottom: 8px;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  .message-time {
    font-size: 11px;
    color: var(--color-text-tertiary);
    text-align: right;
  }

  .anatomy-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .anatomy-btn {
    background: var(--color-accent);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .anatomy-btn:hover {
    background: var(--color-accent-dark);
  }

  .document-prompt {
    margin-top: 8px;
    padding: 12px;
    background: var(--color-gray-300);
    border-radius: 8px;
    border: 1px solid var(--color-gray-400);
  }

  .document-prompt-text {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--color-black);
    line-height: 1.4;
  }

  .document-actions {
    display: flex;
    gap: 8px;
  }

  .document-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .document-btn.accept {
    background: var(--color-positive);
    color: var(--color-white);
  }

  .document-btn.accept:hover {
    background: var(--color-green);
  }

  .document-btn.decline {
    background: var(--color-gray-400);
    color: var(--color-black);
  }

  .document-btn.decline:hover {
    background: var(--color-gray-500);
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-secondary);
    animation: typing 1.4s infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: scale(1);
      opacity: 0.5;
    }
    30% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  .input-area {
    border-top: 1px solid var(--color-border);
    padding: 16px;
    background: var(--color-bg-primary);
  }

  .input-container {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .input-container textarea {
    flex: 1;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.4;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .input-container textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .input-container textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    width: 40px;
    height: 40px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .chat-sidebar {
      width: 100vw !important;
      left: 0;
    }
    
    .resize-handle {
      display: none;
    }
    
    .message-content {
      max-width: 90%;
    }
  }
</style>