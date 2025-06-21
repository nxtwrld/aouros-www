<script lang="ts">
    import { prepareKeys } from '$lib/encryption/rsa';
    import { createHash } from '$lib/encryption/hash';
    import { generatePassphrase } from '$lib/encryption/passphrase';
    import { RecoveryKeyManager } from '$lib/encryption/recovery';
    import { 
        RecoverySetup, 
        MnemonicDisplay, 
        MnemonicVerification, 
        PassphraseCreation,
        type RecoveryFlowState 
    } from '$components/recovery';
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { logger } from '$lib/logging/logger';

    export const ready: boolean = true;

    let passphrase = $state(generatePassphrase());
    let testPassphrase: string = '';
    let automaticSavingCapable: boolean = $state(false);

    // Recovery-specific state
    let recoveryMnemonic: string = $state('');
    let recoverySetup: any = $state(null);

    interface Props {
        data: {
        bio: {
            email: string;
        }
        privacy: {
            enabled: boolean;
            key_hash?: string;
            privateKey?: string;
            publicKey?: string;
            passphrase?: string;
            recoveryKey?: string;
            recoveryHash?: string;
        };
    };
        profileForm: HTMLFormElement;
    }

    let { data = $bindable(), profileForm }: Props = $props();

    let onboardingState: RecoveryFlowState = $state((data.privacy.enabled && data.privacy.privateKey && data.privacy.publicKey) ? 'success' : 'setup');
    
    let isCustomPassphrase: boolean = $state(false);
    let viewPassphrase: boolean = $state(false);

    async function handleRecoveryGenerated(setup: any) {
        try {
            logger.api.debug('Generating recovery phrase');
            
            // First generate keys to get private key for recovery setup
            passphrase = generatePassphrase();
            const keys = await prepareKeys(passphrase);
            
            // Generate complete recovery setup
            recoverySetup = await RecoveryKeyManager.generateRecoverySetup(keys.privateKey);
            recoveryMnemonic = recoverySetup.mnemonic;
            
            // Update data with keys and recovery info
            data.privacy.privateKey = keys.encryptedPrivateKey;
            data.privacy.publicKey = keys.publicKeyPEM;
            data.privacy.key_hash = await createHash(passphrase);
            data.privacy.recoveryKey = recoverySetup.recoveryEncryptedPrivateKey;
            data.privacy.recoveryHash = recoverySetup.recoveryHash;
            
            onboardingState = 'display';
            logger.api.info('Recovery phrase generated successfully');
        } catch (error) {
            logger.api.error('Failed to generate recovery phrase', { error });
            alert('Failed to generate recovery phrase. Please try again.');
        }
    }

    function handleVerificationReady() {
        onboardingState = 'verify';
    }

    function handleVerificationComplete() {
        onboardingState = 'passphrase';
    }

    function handleGoBackToDisplay() {
        onboardingState = 'display';
    }

    async function handlePassphraseSet(newPassphrase: string, isCustom: boolean) {
        passphrase = newPassphrase;
        isCustomPassphrase = isCustom;
        
        logger.api.debug('Setting passphrase');

        if (automaticSavingCapable) {
            try {
                const passwordCredential = new (window as any).PasswordCredential({ 
                    id: data.bio.email, 
                    password: passphrase 
                });
                await navigator.credentials.store(passwordCredential);
                
                setTimeout(() => {
                    onboardingState = 'test';
                }, 100);
            } catch (error) {
                logger.api.error('Failed to store passphrase', { error });
                // Proceed without password manager
                await finalizeSetup();
            }
        } else {
            await finalizeSetup();
        }
    }

    function handleCustomModeChange(isCustom: boolean) {
        isCustomPassphrase = isCustom;
    }

    async function checkPassphrase() {
        try {
            let credentials = await navigator.credentials.get({ password: true } as any);
            testPassphrase = '';
            if (credentials && (credentials as any).password) {
                testPassphrase = (credentials as any).password;
            }

            if (testPassphrase === passphrase) {
                await finalizeSetup();
            } else {
                onboardingState = 'fail';
            }
            testPassphrase = '';
        } catch (error) {
            logger.api.error('Passphrase check failed', { error });
            onboardingState = 'fail';
        }
    }

    async function finalizeSetup() {
        try {
            // Regenerate keys with final passphrase if custom
            if (isCustomPassphrase && passphrase !== generatePassphrase()) {
                const keys = await prepareKeys(passphrase);
                recoverySetup = await RecoveryKeyManager.generateRecoverySetup(keys.privateKey);
                
                data.privacy.privateKey = keys.encryptedPrivateKey;
                data.privacy.publicKey = keys.publicKeyPEM;
                data.privacy.key_hash = await createHash(passphrase);
                data.privacy.recoveryKey = recoverySetup.recoveryEncryptedPrivateKey;
                data.privacy.recoveryHash = recoverySetup.recoveryHash;
            }

            // Clear passphrase from memory for security
            if (data.privacy.enabled) {
                data.privacy.passphrase = undefined;
            } else {
                data.privacy.passphrase = passphrase;
            }

            onboardingState = 'success';
            logger.api.info('Privacy setup completed successfully');
        } catch (error) {
            logger.api.error('Failed to finalize setup', { error });
            onboardingState = 'fail';
        }
    }

    function resetRecoveryFlow() {
        // Reset all recovery state
        recoveryMnemonic = '';
        recoverySetup = null;
        
        // Reset to initial state
        onboardingState = 'setup';
        passphrase = generatePassphrase();
    }

    onMount(async () => {
        await navigator.credentials.preventSilentAccess();
        automaticSavingCapable = !!(window as any)?.PasswordCredential;
        
        // Start with recovery setup if privacy is enabled
        if (data.privacy.enabled) {
            onboardingState = 'setup';
        }
    });

    async function forceKeySetup() {
        if (data.privacy.enabled) {
            resetRecoveryFlow();
        } else {
            // Reset privacy data when disabling
            data.privacy.privateKey = undefined;
            data.privacy.publicKey = undefined;
            data.privacy.key_hash = undefined;
            data.privacy.recoveryKey = undefined;
            data.privacy.recoveryHash = undefined;
            onboardingState = 'setup';
        }
    }
</script>

<h2 class="h2">{ $t('app.onboarding.privacy-and-amp-encryption') } (Required for Security)</h2>

<div class="input">
    <input type="checkbox" id="enabled" bind:checked={data.privacy.enabled} onclick={forceKeySetup} />
    <label for="enabled">{ $t('app.onboarding.enable-total-privacy') }</label>
</div>

{#if !data.privacy.enabled}
    <p class="p form-message">{ $t('app.onboarding.your-data-are-currently-stored-securely-on-our-backend-in-encrypted-form') }</p>
    <p class="p form-message">
        <svg>
            <use href="/icons-o.svg#encrypt" />
        </svg>
        { $t('app.onboarding.total-privacy-lets-you-add-another-layer-of-privacy-by-encrypt-all-your-data-with-a-custom-passphrase-that-even-the-serv') }
    </p>
    <p class="p form-message -warning">
        <strong>⚠️ IMPORTANT:</strong> To proceed, you must enable privacy mode and set up account recovery. 
        This ensures your medical data remains secure and recoverable.
    </p>
{:else}
    <!-- Recovery Setup Flow -->
    {#if onboardingState === 'setup'}
        <RecoverySetup onRecoveryGenerated={handleRecoveryGenerated} />

    {:else if onboardingState === 'display'}
        <MnemonicDisplay 
            mnemonic={recoveryMnemonic} 
            onVerificationReady={handleVerificationReady} 
        />

    {:else if onboardingState === 'verify'}
        <MnemonicVerification 
            mnemonic={recoveryMnemonic}
            onVerificationComplete={handleVerificationComplete}
            onGoBack={handleGoBackToDisplay}
        />

    {:else if onboardingState === 'passphrase'}
        <PassphraseCreation 
            email={data.bio.email}
            onPassphraseSet={handlePassphraseSet}
            onCustomModeChange={handleCustomModeChange}
        />

    {:else if onboardingState === 'test'}
        <div class="passphrase-test">
            <h3>🔍 Verify Passphrase Storage</h3>
            <p class="form-message">
                Click to verify that your passphrase was saved correctly in your password manager.
            </p>
            <button class="button -large" onclick={checkPassphrase}>Verify Saved Passphrase</button>
        </div>

    {:else if onboardingState === 'success'}
        <div class="setup-success">
            <h3>🎉 Privacy Setup Complete!</h3>
            <div class="success-summary">
                <p>✅ Recovery phrase generated and verified</p>
                <p>✅ Master passphrase configured</p>
                <p>✅ Zero-knowledge encryption enabled</p>
                <p>🔐 Your medical data is now fully protected</p>
            </div>
            <p class="form-message -success">
                Your privacy setup is complete. Remember to keep your recovery phrase secure and accessible.
            </p>
            <button class="a" onclick={resetRecoveryFlow}>Reconfigure Security Settings</button>
        </div>

    {:else if onboardingState === 'error'}
        <div class="setup-fail">
            <h3>❌ Setup Failed</h3>
            <p class="form-message -fail">
                There was an issue with your privacy setup. Please try again.
            </p>
            <button class="button" onclick={resetRecoveryFlow}>Try Again</button>
        </div>
    {/if}

    {#if onboardingState !== 'success'}
        <p class="p form-message -warning">⚠️ Privacy setup is not yet complete</p>
    {/if}
{/if}

<style>
    .automatic-passphrase {
        position: fixed;
        top: -100000000px;
        left: -100000000px;
    }

    .button.-large {
        width: 100%;
        margin: 10px 0;
    }

    .recovery-setup, .recovery-display, .recovery-verification, 
    .passphrase-creation, .passphrase-test, .setup-success, .setup-fail {
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

    .verification-actions, .mnemonic-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }

    .security-summary, .success-summary {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 6px;
        padding: 15px;
        margin: 15px 0;
    }

    .security-summary p, .success-summary p {
        margin: 5px 0;
        color: #155724;
    }

    .security-features {
        margin: 15px 0;
    }

    .security-features p {
        margin: 8px 0;
        color: #28a745;
    }

    .passphrase-display {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 15px 0;
    }

    .passphrase-display input {
        flex: 1;
        font-family: 'Courier New', monospace;
    }

    .password-strength {
        margin: 10px 0;
        font-weight: 500;
    }

    .form-message.-warning {
        color: #856404;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 10px;
        border-radius: 4px;
    }

    .form-message.-success {
        color: #155724;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        padding: 10px;
        border-radius: 4px;
    }

    .form-message.-fail {
        color: #721c24;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        padding: 10px;
        border-radius: 4px;
    }

    .a {
        background: none;
        border: none;
        color: var(--color-primary);
        text-decoration: underline;
        cursor: pointer;
        font-size: inherit;
    }

    .a:hover {
        color: var(--color-primary-dark);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>