<script lang="ts">
    import { AccountRecovery } from '$components/recovery';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { logger } from '$lib/logging/logger';

    let recoveryComplete = $state(false);
    let newMnemonic = $state('');

    function handleRecoveryComplete(data: any) {
        if (data.success) {
            recoveryComplete = true;
            newMnemonic = data.newMnemonic;
            logger.api.info('Account recovery completed', { userId: data.userId });
        }
    }

    function handleCancel() {
        goto('/login');
    }

    function goToLogin() {
        goto('/login');
    }

    onMount(() => {
        logger.api.debug('Account recovery page loaded');
    });
</script>

<svelte:head>
    <title>Account Recovery - Aouros</title>
    <meta name="description" content="Recover your Aouros account using your recovery phrase">
</svelte:head>

<div class="recovery-container">
    <div class="recovery-card">
        <div class="recovery-header">
            <h1>🔑 Account Recovery</h1>
            <p>Restore access to your account using your 24-word recovery phrase</p>
        </div>

        {#if !recoveryComplete}
            <AccountRecovery 
                onRecoveryComplete={handleRecoveryComplete}
                onCancel={handleCancel}
            />
        {:else}
            <div class="recovery-success">
                <h2>🎉 Recovery Complete!</h2>
                <p class="success-description">
                    Your account has been successfully recovered with a new passphrase.
                </p>

                {#if newMnemonic}
                    <div class="new-recovery-section">
                        <h3>New Recovery Phrase</h3>
                        <div class="new-recovery-phrase">
                            {newMnemonic}
                        </div>
                        <p class="warning-text">
                            <strong>⚠️ IMPORTANT:</strong> Write down this new recovery phrase and store it securely. 
                            Your old recovery phrase is no longer valid.
                        </p>
                    </div>
                {/if}

                <div class="success-actions">
                    <button class="button primary" onclick={goToLogin}>
                        Continue to Login
                    </button>
                </div>
            </div>
        {/if}

        <div class="recovery-help">
            <h4>Need Help?</h4>
            <p>If you're having trouble with account recovery:</p>
            <ul>
                <li>Make sure you're using the correct 24-word recovery phrase</li>
                <li>Check for typos or missing words</li>
                <li>Contact support if you've lost your recovery phrase</li>
            </ul>
        </div>
    </div>
</div>

<style>
    .recovery-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .recovery-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        padding: 40px;
        max-width: 600px;
        width: 100%;
    }

    .recovery-header {
        text-align: center;
        margin-bottom: 30px;
    }

    .recovery-header h1 {
        color: #333;
        margin-bottom: 10px;
        font-size: 2rem;
    }

    .recovery-header p {
        color: #666;
        font-size: 1.1rem;
    }

    .recovery-success {
        text-align: center;
        padding: 20px 0;
    }

    .recovery-success h2 {
        color: #333;
        margin-bottom: 15px;
        font-size: 1.8rem;
    }

    .success-description {
        color: #666;
        margin-bottom: 30px;
        font-size: 1.1rem;
    }

    .new-recovery-section {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        text-align: left;
    }

    .new-recovery-section h3 {
        color: #155724;
        margin-bottom: 15px;
    }

    .new-recovery-phrase {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        padding: 15px;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        font-weight: 500;
        margin: 10px 0;
        word-break: break-all;
        line-height: 1.6;
    }

    .warning-text {
        color: #856404;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 10px;
        border-radius: 4px;
        margin-top: 15px;
    }

    .success-actions {
        margin-top: 30px;
    }

    .button {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
    }

    .button.primary {
        background: #667eea;
        color: white;
        min-width: 200px;
    }

    .button.primary:hover {
        background: #5a6fd8;
        transform: translateY(-1px);
    }

    .recovery-help {
        margin-top: 40px;
        padding-top: 30px;
        border-top: 1px solid #eee;
    }

    .recovery-help h4 {
        color: #333;
        margin-bottom: 10px;
    }

    .recovery-help p {
        color: #666;
        margin-bottom: 10px;
    }

    .recovery-help ul {
        color: #666;
        margin-left: 20px;
    }

    .recovery-help li {
        margin-bottom: 5px;
    }

    @media (max-width: 768px) {
        .recovery-card {
            padding: 20px;
            margin: 10px;
        }

        .recovery-header h1 {
            font-size: 1.5rem;
        }
    }
</style>