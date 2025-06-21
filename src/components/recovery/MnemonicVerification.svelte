<script lang="ts">
    import { RecoveryKeyManager, RECOVERY_CONSTANTS } from '$lib/encryption/recovery';
    import { logger } from '$lib/logging/logger';

    interface Props {
        mnemonic: string;
        onVerificationComplete: () => void;
        onGoBack: () => void;
    }

    let { mnemonic, onVerificationComplete, onGoBack }: Props = $props();

    let verificationIndices = $state<number[]>([]);
    let userVerificationWords = $state<string[]>(['', '', '', '']);

    // Generate verification indices on component mount
    $effect(() => {
        verificationIndices = RecoveryKeyManager.generateVerificationIndices(
            RECOVERY_CONSTANTS.MNEMONIC_WORD_COUNT,
            RECOVERY_CONSTANTS.VERIFICATION_WORD_COUNT
        );
    });

    function verifyRecoveryPhrase() {
        const isValid = RecoveryKeyManager.verifyMnemonicWords(
            mnemonic,
            verificationIndices,
            userVerificationWords
        );

        if (isValid) {
            logger.api.info('Recovery phrase verification successful');
            onVerificationComplete();
        } else {
            alert('The words you entered do not match. Please check and try again.');
            // Reset verification inputs
            userVerificationWords = ['', '', '', ''];
        }
    }
</script>

<div class="recovery-verification">
    <h3>✅ Verify Recovery Phrase</h3>
    <p class="form-message">
        To ensure you've written down your recovery phrase correctly, 
        please enter the following words from your phrase:
    </p>
    
    <div class="verification-words">
        {#each verificationIndices as wordIndex, i}
            <div class="verification-word">
                <label for="word-{i}">Word #{wordIndex + 1}:</label>
                <input 
                    id="word-{i}"
                    type="text" 
                    bind:value={userVerificationWords[i]}
                    placeholder="Enter word {wordIndex + 1}"
                    autocomplete="off"
                    spellcheck="false"
                />
            </div>
        {/each}
    </div>
    
    <div class="verification-actions">
        <button class="button -large" onclick={verifyRecoveryPhrase}>Verify & Continue</button>
        <button class="button" onclick={onGoBack}>← Go Back</button>
    </div>
</div>

<style>
    .recovery-verification {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }

    .form-message {
        margin: 15px 0;
        line-height: 1.6;
    }

    .verification-words {
        margin: 20px 0;
    }

    .verification-word {
        margin: 15px 0;
    }

    .verification-word label {
        display: block;
        font-weight: 500;
        margin-bottom: 5px;
    }

    .verification-word input {
        width: 100%;
        max-width: 200px;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .verification-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }

    .button.-large {
        width: 100%;
        margin: 10px 0;
    }
</style>