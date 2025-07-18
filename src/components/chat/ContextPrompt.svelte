<script lang="ts">
  import type { ContextPrompt } from '$lib/chat/types.d';
  
  interface Props {
    prompt: ContextPrompt;
  }

  let { prompt }: Props = $props();
</script>

<div class="context-prompt {prompt.type}">
  <p class="context-prompt-text">
    {prompt.message}
  </p>
  <div class="context-actions">
    <button 
      class="context-btn accept"
      onclick={prompt.onAccept}
    >
      {prompt.acceptLabel}
    </button>
    <button 
      class="context-btn decline"
      onclick={prompt.onDecline}
    >
      {prompt.declineLabel}
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

  .context-btn.decline {
    background: var(--color-gray-400);
    color: var(--color-black);
  }

  .context-btn.decline:hover {
    background: var(--color-gray-500);
  }
</style>