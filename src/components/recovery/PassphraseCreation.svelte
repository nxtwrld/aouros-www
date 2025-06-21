<script lang="ts">
    import { passwordStrength } from 'check-password-strength';
    import { generatePassphrase } from '$lib/encryption/passphrase';
    import { logger } from '$lib/logging/logger';

    interface Props {
        email: string;
        onPassphraseSet: (passphrase: string, isCustom: boolean) => void;
        onCustomModeChange: (isCustom: boolean) => void;
    }

    let { email, onPassphraseSet, onCustomModeChange }: Props = $props();

    let passphrase = $state(generatePassphrase());
    let isCustomPassphrase = $state(false);
    let viewPassphrase = $state(false);
    let automaticSavingCapable = $state(false);

    let strength = $derived(passwordStrength(passphrase).value);

    async function setPassphrase() {
        logger.api.debug('Setting passphrase');
        onPassphraseSet(passphrase, isCustomPassphrase);
    }

    function setAutomaticPassword() {
        passphrase = generatePassphrase();
        isCustomPassphrase = false;
        onCustomModeChange(false);
    }

    function setCustomPassword() {
        passphrase = '';
        isCustomPassphrase = true;
        onCustomModeChange(true);
    }

    // Check for password credential support
    $effect(() => {
        automaticSavingCapable = !!(window as any)?.PasswordCredential;
    });
</script>

<div class="passphrase-creation">
    <h3>🔐 Create Master Passphrase</h3>
    <div class="security-summary">
        <p>✅ Recovery phrase verified and stored</p>
        <p>🔒 Passphrase protects daily access</p>
        <p>🛡️ Double protection against account loss</p>
    </div>
    
    {#if !isCustomPassphrase}
        <div class="automatic-passphrase-section">
            <h4>Automatic Secure Passphrase</h4>
            <div class="passphrase-display">
                {#if viewPassphrase}
                    <input type="text" bind:value={passphrase} readonly />
                    <button class="button" onclick={() => navigator.clipboard.writeText(passphrase)}>📋 Copy</button>
                    <button class="button" onclick={() => viewPassphrase = false}>👁️ Hide</button>
                {:else}
                    <button class="button" onclick={() => viewPassphrase = true}>👁️ View Passphrase</button>
                {/if}
            </div>
            
            <button class="button -large" onclick={setPassphrase}>Set This Passphrase</button>
            <p class="form-message">Click to save this passphrase in your password manager.</p>
            <p><button class="a" onclick={setCustomPassword}>Use custom passphrase instead</button></p>
        </div>
    {:else}
        <div class="custom-passphrase-section">
            <!-- Hidden username field for password managers -->
            <div class="automatic-passphrase">
                <input type="text" autocomplete="username" value={email} />
            </div>
            
            <div class="input">
                <label for="custom-passphrase">Custom Passphrase:</label>
                <input 
                    id="custom-passphrase"
                    type="password" 
                    autocomplete="new-password" 
                    bind:value={passphrase} 
                    placeholder="Enter your passphrase"
                />
            </div>
            <p class="password-strength">Strength: {strength}</p>
            
            {#if automaticSavingCapable}
                <button class="button -large" onclick={setPassphrase}>Set Passphrase</button>
                <p class="form-message">Click to save in your password manager.</p>
            {:else}
                <button class="button -large" onclick={setPassphrase}>Set Passphrase</button>
                <p class="form-message">Make sure to store this passphrase securely.</p>
            {/if}
            
            <p><button class="a" onclick={setAutomaticPassword}>Use auto-generated passphrase instead</button></p>
        </div>
    {/if}
</div>

<style>
    .passphrase-creation {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }

    .security-summary {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 6px;
        padding: 15px;
        margin: 15px 0;
    }

    .security-summary p {
        margin: 5px 0;
        color: #155724;
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
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .input {
        margin: 15px 0;
    }

    .input label {
        display: block;
        font-weight: 500;
        margin-bottom: 5px;
    }

    .input input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .password-strength {
        margin: 10px 0;
        font-weight: 500;
    }

    .form-message {
        margin: 10px 0;
        line-height: 1.6;
    }

    .button.-large {
        width: 100%;
        margin: 10px 0;
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

    .automatic-passphrase {
        position: fixed;
        top: -100000000px;
        left: -100000000px;
    }
</style>