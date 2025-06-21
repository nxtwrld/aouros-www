<script lang="ts">
    import { RecoveryKeyManager, logRecoveryAttempt } from '$lib/encryption/recovery';
    import { prepareKeys } from '$lib/encryption/rsa';
    import { createHash } from '$lib/encryption/hash';
    import { passwordStrength } from 'check-password-strength';
    import { logger } from '$lib/logging/logger';

    interface Props {
        onRecoveryComplete: (data: any) => void;
        onCancel: () => void;
    }

    let { onRecoveryComplete, onCancel }: Props = $props();

    let recoveryPhrase = $state('');
    let newPassphrase = $state('');
    let confirmPassphrase = $state('');
    let recoveryStep: 'mnemonic' | 'passphrase' = $state('mnemonic');
    let isLoading = $state(false);
    let errorMessage = $state('');
    
    let strength = $derived(passwordStrength(newPassphrase).value);
    let passwordsMatch = $derived(newPassphrase === confirmPassphrase && newPassphrase.length > 0);

    let recoveryData: any = null;

    async function validateAndProceed() {
        if (!recoveryPhrase.trim()) {
            errorMessage = 'Please enter your recovery phrase.';
            return;
        }

        isLoading = true;
        errorMessage = '';

        try {
            // Validate mnemonic format
            const isValidFormat = await RecoveryKeyManager.validateMnemonicFormat(recoveryPhrase.trim());
            if (!isValidFormat) {
                throw new Error('Invalid recovery phrase format. Please check your 24-word phrase.');
            }

            // Attempt to verify recovery phrase against user account
            const response = await fetch('/v1/auth/verify-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recovery_phrase: recoveryPhrase.trim()
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Recovery phrase verification failed');
            }

            recoveryData = await response.json();
            
            // Log successful verification
            await logRecoveryAttempt({
                userId: recoveryData.user_id,
                attemptType: 'mnemonic_verification',
                success: true
            });

            logger.api.info('Recovery phrase verified successfully');
            recoveryStep = 'passphrase';

        } catch (error: any) {
            logger.api.error('Recovery verification failed', { error });
            errorMessage = error.message || 'Recovery verification failed. Please check your recovery phrase.';
            
            // Log failed attempt (if we have user context)
            if (recoveryData?.user_id) {
                await logRecoveryAttempt({
                    userId: recoveryData.user_id,
                    attemptType: 'mnemonic_verification',
                    success: false,
                    errorMessage: error.message
                });
            }
        } finally {
            isLoading = false;
        }
    }

    async function completeRecovery() {
        if (!newPassphrase || !confirmPassphrase) {
            errorMessage = 'Please enter and confirm your new passphrase.';
            return;
        }

        if (newPassphrase !== confirmPassphrase) {
            errorMessage = 'Passphrases do not match.';
            return;
        }

        if (newPassphrase.length < 8) {
            errorMessage = 'Passphrase must be at least 8 characters long.';
            return;
        }

        isLoading = true;
        errorMessage = '';

        try {
            // Recover the private key using the mnemonic
            const privateKeyPEM = await RecoveryKeyManager.recoverPrivateKey(
                recoveryPhrase.trim(),
                recoveryData.recovery_key
            );

            // Generate new keys with the new passphrase
            const newKeys = await prepareKeys(newPassphrase);
            const newKeyHash = await createHash(newPassphrase);

            // Create new recovery setup
            const newRecoverySetup = await RecoveryKeyManager.generateRecoverySetup(newKeys.privateKey);

            // Update the user's account with new keys
            const response = await fetch('/v1/auth/complete-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: recoveryData.user_id,
                    new_private_key: newKeys.encryptedPrivateKey,
                    new_public_key: newKeys.publicKeyPEM,
                    new_key_hash: newKeyHash,
                    new_recovery_key: newRecoverySetup.recoveryEncryptedPrivateKey,
                    new_recovery_hash: newRecoverySetup.recoveryHash
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to complete account recovery');
            }

            // Log successful recovery
            await logRecoveryAttempt({
                userId: recoveryData.user_id,
                attemptType: 'key_recovery',
                success: true
            });

            logger.api.info('Account recovery completed successfully');
            
            onRecoveryComplete({
                success: true,
                newMnemonic: newRecoverySetup.mnemonic,
                userId: recoveryData.user_id
            });

        } catch (error: any) {
            logger.api.error('Account recovery failed', { error });
            errorMessage = error.message || 'Account recovery failed. Please try again.';
            
            await logRecoveryAttempt({
                userId: recoveryData.user_id,
                attemptType: 'key_recovery',
                success: false,
                errorMessage: error.message
            });
        } finally {
            isLoading = false;
        }
    }

    function resetRecovery() {
        recoveryPhrase = '';
        newPassphrase = '';
        confirmPassphrase = '';
        recoveryStep = 'mnemonic';
        errorMessage = '';
        recoveryData = null;
    }
</script>

<div class="account-recovery">
    {#if recoveryStep === 'mnemonic'}
        <div class="recovery-step">
            <h2>Enter Recovery Phrase</h2>
            <p class="step-description">
                Enter the 24-word recovery phrase you saved during account setup. 
                This phrase will restore access to your encrypted medical data.
            </p>

            <div class="input-group">
                <label for="recovery-phrase">Recovery Phrase</label>
                <textarea 
                    id="recovery-phrase"
                    bind:value={recoveryPhrase}
                    placeholder="Enter your 24-word recovery phrase separated by spaces"
                    rows="4"
                    disabled={isLoading}
                ></textarea>
                <small class="input-help">
                    Enter all 24 words separated by spaces. Case and extra spaces don't matter.
                </small>
            </div>

            {#if errorMessage}
                <div class="error-message">
                    ❌ {errorMessage}
                </div>
            {/if}

            <div class="button-group">
                <button 
                    class="button primary"
                    onclick={validateAndProceed}
                    disabled={isLoading || !recoveryPhrase.trim()}
                >
                    {isLoading ? 'Verifying...' : 'Verify Recovery Phrase'}
                </button>
                <button class="button secondary" onclick={onCancel}>
                    ← Cancel
                </button>
            </div>
        </div>

    {:else if recoveryStep === 'passphrase'}
        <div class="recovery-step">
            <h2>Set New Passphrase</h2>
            <p class="step-description">
                Your recovery phrase has been verified. Now create a new passphrase to protect your account.
            </p>

            <div class="input-group">
                <label for="new-passphrase">New Passphrase</label>
                <input 
                    id="new-passphrase"
                    type="password"
                    bind:value={newPassphrase}
                    placeholder="Enter your new passphrase"
                    disabled={isLoading}
                    autocomplete="new-password"
                />
                <small class="password-strength">Strength: {strength}</small>
            </div>

            <div class="input-group">
                <label for="confirm-passphrase">Confirm Passphrase</label>
                <input 
                    id="confirm-passphrase"
                    type="password"
                    bind:value={confirmPassphrase}
                    placeholder="Confirm your new passphrase"
                    disabled={isLoading}
                    autocomplete="new-password"
                />
                {#if confirmPassphrase && !passwordsMatch}
                    <small class="error-text">Passphrases do not match</small>
                {:else if passwordsMatch}
                    <small class="success-text">✓ Passphrases match</small>
                {/if}
            </div>

            {#if errorMessage}
                <div class="error-message">
                    ❌ {errorMessage}
                </div>
            {/if}

            <div class="security-note">
                <h4>🔒 Security Note</h4>
                <p>A new recovery phrase will be generated with your new passphrase. Make sure to save it securely.</p>
            </div>

            <div class="button-group">
                <button 
                    class="button primary"
                    onclick={completeRecovery}
                    disabled={isLoading || !passwordsMatch || newPassphrase.length < 8}
                >
                    {isLoading ? 'Recovering Account...' : 'Complete Recovery'}
                </button>
                <button class="button secondary" onclick={resetRecovery}>
                    ← Start Over
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .account-recovery {
        max-width: 500px;
        margin: 0 auto;
    }

    .recovery-step {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 30px;
        margin: 20px 0;
    }

    .recovery-step h2 {
        color: #333;
        margin-bottom: 15px;
        font-size: 1.5rem;
    }

    .step-description {
        color: #666;
        margin-bottom: 25px;
        line-height: 1.6;
    }

    .input-group {
        margin-bottom: 20px;
    }

    .input-group label {
        display: block;
        margin-bottom: 8px;
        color: #333;
        font-weight: 500;
    }

    .input-group input,
    .input-group textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        transition: border-color 0.3s;
    }

    .input-group input:focus,
    .input-group textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-group textarea {
        resize: vertical;
        min-height: 100px;
        font-family: 'Courier New', monospace;
    }

    .input-help {
        display: block;
        margin-top: 5px;
        color: #888;
        font-size: 14px;
    }

    .password-strength {
        display: block;
        margin-top: 5px;
        color: #666;
        font-weight: 500;
    }

    .success-text {
        color: #28a745;
        font-weight: 500;
    }

    .error-text {
        color: #dc3545;
        font-weight: 500;
    }

    .button-group {
        display: flex;
        gap: 15px;
        margin-top: 25px;
    }

    .button {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        flex: 1;
    }

    .button.primary {
        background: #667eea;
        color: white;
    }

    .button.primary:hover:not(:disabled) {
        background: #5a6fd8;
        transform: translateY(-1px);
    }

    .button.secondary {
        background: #f8f9fa;
        color: #333;
        border: 1px solid #ddd;
    }

    .button.secondary:hover:not(:disabled) {
        background: #e9ecef;
    }

    .button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    .error-message {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 12px;
        border-radius: 6px;
        margin: 15px 0;
    }

    .security-note {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 15px;
        border-radius: 6px;
        margin: 20px 0;
    }

    .security-note h4 {
        margin: 0 0 10px 0;
        color: #856404;
    }

    .security-note p {
        margin: 0;
        color: #856404;
    }
</style>