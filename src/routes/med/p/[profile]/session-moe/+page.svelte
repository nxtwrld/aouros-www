<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import SessionMoeVisualizer from '$components/session/SessionMoeVisualizer.svelte';
    import type { SessionAnalysis } from '$components/session/types/visualization';
    import { initializeSessionAnalysis } from '$lib/session/analysis-integration';
    import { sessionDataActions, sessionData } from '$lib/session/stores/session-data-store';
    import { sessionViewerActions } from '$lib/session/stores/session-viewer-store';
    import { unifiedSessionActions } from '$lib/session/stores/unified-session-store';
    
    // Import sample data for development
    import sampleAnalysis from '$components/session/sample.analysis.1.cz.json';

    let sampleSessionData: SessionAnalysis = sampleAnalysis as SessionAnalysis;

    const profileId = $page.params.profile;

    onMount(async () => {
        // For now, we'll use the sample data
        // In production, this would load real session data
        // Loading MoE session analysis for profile (removed excessive logging)
        
        // Load session data into the new data store (this will compute all derived data once)
        sessionDataActions.loadSession(sampleSessionData);
        
        // Since we have mock data, set the session state to Paused
        // This will show the AudioButton in the header with "Continue" text
        unifiedSessionActions.loadSessionWithData(sampleSessionData);
        
        // Optionally connect to real-time updates (but sample data won't have a session emitter)
        // await initializeSessionAnalysis(sessionData.sessionId, sessionData);
    });

    function handleQuestionAnswer(event: CustomEvent) {
        const { questionId, answer, confidence } = event.detail;
        console.log('Question answered:', { questionId, answer, confidence });
        
        // Use the new viewer store for UI state
        sessionViewerActions.answerQuestion(questionId, answer, confidence);
    }

    function handleNodeAction(event: CustomEvent) {
        const { action, targetId, reason } = event.detail;
        console.log('Node action:', { action, targetId, reason });
        
        // Handle node actions - this might need to go to viewer store depending on the action
        // For now, log the action (specific implementation depends on what these actions do)
        console.log('Node action handled:', { action, targetId, reason });
    }
</script>

<svelte:head>
    <title>MoE Session Analysis - {profileId} | Mediqom</title>
    <meta name="description" content="Medical session analysis with Mixture of Experts visualization" />
</svelte:head>

<div class="session-moe-page">
    {#if !$sessionData}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading session analysis...</p>
        </div>
    {:else}
        <SessionMoeVisualizer 
            sessionData={$sessionData}
            isRealTime={false}
            showLegend={true}
            enableInteractions={true}
            onquestionAnswer={handleQuestionAnswer}
            onnodeAction={handleNodeAction}
        />
    {/if}
</div>

<style>
    .session-moe-page {
        height: 100%;
        background: var(--color-background, #f8fafc);
        overflow: hidden;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
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

    .loading-state p {
        margin: 0;
        font-size: 1rem;
        color: var(--color-text-secondary, #6b7280);
    }

    /* Ensure full height on mobile */
    @media (max-width: 640px) {
        .session-moe-page {
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for mobile browsers */
        }
    }
</style>