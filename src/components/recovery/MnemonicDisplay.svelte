<script lang="ts">
    import { RecoveryKeyManager } from '$lib/encryption/recovery';

    interface Props {
        mnemonic: string;
        onVerificationReady: () => void;
    }

    let { mnemonic, onVerificationReady }: Props = $props();

    let mnemonicWords = $derived(RecoveryKeyManager.parseMnemonicWords(mnemonic));
    let showMnemonic = $state(false);
    let writtenDown = $state(false);
    let storedSecurely = $state(false);
    let understand = $state(false);

    let allConfirmed = $derived(writtenDown && storedSecurely && understand);

    function copyMnemonicToClipboard() {
        navigator.clipboard.writeText(mnemonic);
    }
</script>

<div class="recovery-display">
    <h3>🔑 Your Recovery Phrase</h3>
    <div class="warning-box">
        <strong>⚠️ CRITICAL:</strong> Write down these 24 words in exact order. Store them securely offline.
        <br><strong>Without this phrase, lost passphrases cannot be recovered.</strong>
    </div>
    
    {#if showMnemonic}
        <div class="mnemonic-grid">
            {#each mnemonicWords as word, index}
                <div class="word-item">
                    <span class="word-number">{index + 1}</span>
                    <span class="word-text">{word}</span>
                </div>
            {/each}
        </div>
        
        <div class="mnemonic-actions">
            <button class="button" onclick={copyMnemonicToClipboard}>📋 Copy to Clipboard</button>
            <button class="button" onclick={() => showMnemonic = false}>👁️ Hide Phrase</button>
        </div>
    {:else}
        <button class="button -large" onclick={() => showMnemonic = true}>👁️ Show Recovery Phrase</button>
    {/if}
    
    <div class="storage-confirmation">
        <h4>Confirm you have stored your recovery phrase:</h4>
        <label class="checkbox-label">
            <input type="checkbox" bind:checked={writtenDown}>
            <span>✏️ I have written down all 24 words in order</span>
        </label>
        <label class="checkbox-label">
            <input type="checkbox" bind:checked={storedSecurely}>
            <span>🔒 I have stored them in a secure, offline location</span>
        </label>
        <label class="checkbox-label">
            <input type="checkbox" bind:checked={understand}>
            <span>⚠️ I understand this cannot be recovered if lost</span>
        </label>
    </div>
    
    <button 
        class="button -large" 
        disabled={!allConfirmed} 
        onclick={onVerificationReady}
    >
        Continue to Verification
    </button>
</div>

<style>
    .recovery-display {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }

    .warning-box {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 15px;
        margin: 15px 0;
        color: #856404;
        font-weight: 500;
    }

    .mnemonic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
        margin: 20px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 2px solid #dee2e6;
    }

    .word-item {
        display: flex;
        align-items: center;
        padding: 8px;
        background: white;
        border-radius: 4px;
        border: 1px solid #e9ecef;
    }

    .word-number {
        font-weight: bold;
        color: #6c757d;
        margin-right: 8px;
        min-width: 20px;
        font-size: 12px;
    }

    .word-text {
        font-family: 'Courier New', monospace;
        font-weight: 500;
    }

    .storage-confirmation {
        margin: 20px 0;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        margin: 10px 0;
        cursor: pointer;
    }

    .checkbox-label input {
        margin-right: 10px;
    }

    .mnemonic-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }

    .button.-large {
        width: 100%;
        margin: 10px 0;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>