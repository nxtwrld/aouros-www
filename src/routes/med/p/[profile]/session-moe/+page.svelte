<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import SessionMoeVisualizer from '$components/session/SessionMoeVisualizer.svelte';
    import type { SessionAnalysis } from '$components/session/types/visualization';
    import { initializeSessionAnalysis } from '$lib/session/analysis-integration';
    import { analysisActions, currentSession, isLoading } from '$lib/session/analysis-store';
    
    // Import sample data for development
    import sampleAnalysis from '$components/session/sample.analysis.1.cz.json';

    let sessionData: SessionAnalysis = sampleAnalysis as SessionAnalysis;

    const profileId = $page.params.profile;

    onMount(async () => {
        // For now, we'll use the sample data
        // In production, this would load real session data
        console.log('Loading MoE session analysis for profile:', profileId);
        
        // Initialize the analysis store directly - skip integration for now since this is sample data
        analysisActions.loadSession(sessionData);
        
        // Optionally connect to real-time updates (but sample data won't have a session emitter)
        // await initializeSessionAnalysis(sessionData.sessionId, sessionData);
    });

    function handleQuestionAnswer(event: CustomEvent) {
        const { questionId, answer, confidence } = event.detail;
        console.log('Question answered:', { questionId, answer, confidence });
        
        // Use the store action instead of manually updating local state
        analysisActions.answerQuestion(questionId, answer, confidence);
    }

    function handleNodeAction(event: CustomEvent) {
        const { action, targetId, reason } = event.detail;
        console.log('Node action:', { action, targetId, reason });
        
        // Use the store action instead of manually updating local state
        analysisActions.handleNodeAction(action, targetId, reason);
    }
</script>

<svelte:head>
    <title>MoE Session Analysis - {profileId} | Mediqom</title>
    <meta name="description" content="Medical session analysis with Mixture of Experts visualization" />
</svelte:head>

<div class="session-moe-page">
    {#if $isLoading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading session analysis...</p>
        </div>
    {:else if $currentSession}
        <SessionMoeVisualizer 
            sessionData={$currentSession}
            isRealTime={false}
            showLegend={true}
            enableInteractions={true}
            onquestionAnswer={handleQuestionAnswer}
            onnodeAction={handleNodeAction}
        />
    {:else}
        <div class="empty-state">
            <h2>No Session Data</h2>
            <p>Unable to load session analysis data.</p>
            <p>Debug: isLoading = {$isLoading}</p>
            <p>Debug: currentSession exists = {!!$currentSession}</p>
        </div>
    {/if}
</div>

<style>
    .session-moe-page {
        height: 100%;
        background: var(--color-background, #f8fafc);
        overflow: hidden;
    }

    .loading-state,
    .error-state,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
    }

    .loading-state {
        color: var(--color-text-secondary, #6b7280);
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--color-border, #e2e8f0);
        border-top: 3px solid var(--color-primary, #3b82f6);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .loading-state p,
    .empty-state p {
        margin: 0;
        font-size: 1rem;
        color: var(--color-text-secondary, #6b7280);
    }

    .error-state h2,
    .empty-state h2 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
    }

    .error-state {
        color: var(--color-error, #dc2626);
    }

    .error-state button {
        margin-top: 1.5rem;
        padding: 0.75rem 1.5rem;
        background: var(--color-primary, #3b82f6);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .error-state button:hover {
        background: var(--color-primary-dark, #2563eb);
    }

    /* Ensure full height on mobile */
    @media (max-width: 640px) {
        .session-moe-page {
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for mobile browsers */
        }
    }
</style>