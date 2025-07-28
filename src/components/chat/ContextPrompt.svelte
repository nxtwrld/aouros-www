<script lang="ts">
  import type { ContextPrompt } from '$lib/chat/types.d';
  import { t } from '$lib/i18n';
  
  interface Props {
    prompt: ContextPrompt;
  }

  let { prompt }: Props = $props();
  
  const getToolIconName = (toolName?: string): string => {
    if (!toolName) return 'tool';
    
    const icons: Record<string, string> = {
      searchDocuments: 'search',
      getProfileData: 'profile',
      queryMedicalHistory: 'medical-history',
      getAssembledContext: 'context-assembly',
      getDocumentById: 'document'
    };
    
    return icons[toolName] || 'tool';
  };
</script>

<div class="context-prompt {prompt.type}">
  {#if prompt.type === 'tool'}
    <div class="tool-header">
      <svg class="tool-icon" width="20" height="20">
        <use href="/icons.svg#{getToolIconName(prompt.toolName)}" />
      </svg>
      <h4 class="tool-title">{prompt.title}</h4>
    </div>
  {/if}
  
  <p class="context-prompt-text">
    {$t(prompt.messageKey, { values: prompt.messageParams })}
  </p>
  
  {#if prompt.type === 'tool' && prompt.dataAccessDescription}
    <ul class="data-access-list">
      {#each prompt.dataAccessDescription as access}
        <li>{access}</li>
      {/each}
    </ul>
  {/if}
  
  {#if prompt.type === 'tool' && prompt.securityLevel}
    <div class="security-badge level-{prompt.securityLevel}">
      {$t('chat.tool.security.' + prompt.securityLevel)}
    </div>
  {/if}
  
  <div class="context-actions">
    <button 
      class="context-btn accept"
      onclick={prompt.onAccept}
    >
      {$t(prompt.acceptLabelKey)}
    </button>
    <button 
      class="context-btn decline"
      onclick={prompt.onDecline}
    >
      {$t(prompt.declineLabelKey)}
    </button>
  </div>
</div>

<style>
  .context-prompt {
    margin-top: 8px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid;
  }

  .context-prompt.document {
    background: var(--color-gray-300);
    border-color: var(--color-gray-400);
  }

  .context-prompt.profile {
    background: var(--color-blue-100);
    border-color: var(--color-blue-200);
  }

  .context-prompt.tool {
    background: var(--color-purple-100);
    border-color: var(--color-purple-200);
  }

  .tool-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .tool-icon {
    color: var(--color-purple-600);
    flex-shrink: 0;
  }

  .tool-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-purple-800);
  }

  .context-prompt-text {
    margin: 0 0 12px 0;
    font-size: 14px;
    line-height: 1.4;
  }

  .context-prompt.document .context-prompt-text {
    color: var(--color-black);
  }

  .context-prompt.profile .context-prompt-text {
    color: var(--color-blue-800);
  }

  .context-prompt.tool .context-prompt-text {
    color: var(--color-purple-800);
  }

  .data-access-list {
    margin: 12px 0;
    padding-left: 20px;
    font-size: 13px;
    color: var(--color-purple-700);
  }

  .data-access-list li {
    margin: 4px 0;
  }

  .security-badge {
    display: inline-block;
    padding: 4px 12px;
    margin-bottom: 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .security-badge.level-low {
    background: var(--color-green-100);
    color: var(--color-green-800);
  }

  .security-badge.level-medium {
    background: var(--color-yellow-100);
    color: var(--color-yellow-800);
  }

  .security-badge.level-high {
    background: var(--color-orange-100);
    color: var(--color-orange-800);
  }

  .context-actions {
    display: flex;
    gap: 8px;
  }

  .context-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .context-btn.accept {
    color: var(--color-white);
  }

  .context-prompt.document .context-btn.accept {
    background: var(--color-positive);
  }

  .context-prompt.document .context-btn.accept:hover {
    background: var(--color-green);
  }

  .context-prompt.profile .context-btn.accept {
    background: var(--color-blue);
  }

  .context-prompt.profile .context-btn.accept:hover {
    background: var(--color-blue-600);
  }

  .context-prompt.tool .context-btn.accept {
    background: var(--color-purple);
  }

  .context-prompt.tool .context-btn.accept:hover {
    background: var(--color-purple-600);
  }

  .context-btn.decline {
    background: var(--color-gray-400);
    color: var(--color-black);
  }

  .context-btn.decline:hover {
    background: var(--color-gray-500);
  }
</style>