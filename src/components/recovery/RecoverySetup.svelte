<script lang="ts">
    import { RecoveryKeyManager, RECOVERY_CONSTANTS } from '$lib/encryption/recovery';
    import { logger } from '$lib/logging/logger';

    interface Props {
        onRecoveryGenerated: (setup: any) => void;
    }

    let { onRecoveryGenerated }: Props = $props();

    let isGenerating = $state(false);

    async function generateRecoveryPhrase() {
        isGenerating = true;
        try {
            logger.api.debug('Generating recovery phrase');
            
            // This will be called from parent with the private key
            onRecoveryGenerated(null); // Signal parent to generate
            
        } catch (error) {
            logger.api.error('Failed to initiate recovery phrase generation', { error });
            alert('Failed to generate recovery phrase. Please try again.');
        } finally {
            isGenerating = false;
        }
    }
</script>

<div class="recovery-setup">
    <h3>🔐 Secure Account Recovery Setup</h3>
    <p class="form-message">
        Before setting your passphrase, we'll create a recovery phrase that can restore your account 
        if you ever forget your passphrase.
    </p>
    <div class="security-features">
        <p>✅ <strong>Zero-knowledge security</strong> - We never see your recovery phrase</p>
        <p>✅ <strong>24-word industry standard</strong> - Compatible with crypto wallets</p>
        <p>✅ <strong>Account recovery</strong> - Never lose access to your data</p>
    </div>
    <button 
        class="button -large" 
        onclick={generateRecoveryPhrase}
        disabled={isGenerating}
    >
        {isGenerating ? 'Generating...' : 'Generate Recovery Phrase'}
    </button>
</div>

<style>
    .recovery-setup {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }

    .security-features {
        margin: 15px 0;
    }

    .security-features p {
        margin: 8px 0;
        color: #28a745;
    }

    .button.-large {
        width: 100%;
        margin: 10px 0;
    }

    .form-message {
        margin: 15px 0;
        line-height: 1.6;
    }
</style>