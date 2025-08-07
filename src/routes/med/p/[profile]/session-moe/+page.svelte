<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import SessionMoeVisualizer from '$components/session/SessionMoeVisualizer.svelte';
    import type { SessionAnalysis } from '$components/session/types/visualization';
    
    // Import sample data for development
    import sampleAnalysis from '$components/session/sample.analysis.1.json';

    let sessionData: SessionAnalysis = sampleAnalysis as SessionAnalysis;
    let loading = false;
    let error: string | null = null;

    const profileId = $page.params.profile;

    onMount(() => {
        // For now, we'll use the sample data
        // In production, this would load real session data
        console.log('Loading MoE session analysis for profile:', profileId);
        console.log('Sample data loaded:', sessionData);
    });

    function handleQuestionAnswer(event: CustomEvent) {
        const { questionId, answer, confidence } = event.detail;
        console.log('Question answered:', { questionId, answer, confidence });
        
        // Update the session data
        if (sessionData.nodes.actions) {
            const questionIndex = sessionData.nodes.actions.findIndex(a => a.id === questionId);
            if (questionIndex !== -1) {
                sessionData.nodes.actions[questionIndex] = {
                    ...sessionData.nodes.actions[questionIndex],
                    status: 'answered',
                    answer: answer
                };
                
                // Trigger reactivity
                sessionData = { ...sessionData };
            }
        }
    }

    function handleNodeAction(event: CustomEvent) {
        const { action, targetId, reason } = event.detail;
        console.log('Node action:', { action, targetId, reason });
        
        // Handle accept/suppress/highlight actions
        // This would typically update the backend and refresh the analysis
        
        // For demo purposes, just log and potentially update UI state
        if (action === 'suppress') {
            // Find and suppress the node
            ['symptoms', 'diagnoses', 'treatments', 'actions'].forEach(nodeType => {
                if (sessionData.nodes[nodeType]) {
                    const nodeIndex = sessionData.nodes[nodeType].findIndex((n: any) => n.id === targetId);
                    if (nodeIndex !== -1) {
                        const node = sessionData.nodes[nodeType][nodeIndex];
                        if ('suppressed' in node) {
                            (node as any).suppressed = true;
                            (node as any).suppressionReason = reason || 'User suppressed';
                        }
                    }
                }
            });
            
            // Trigger reactivity
            sessionData = { ...sessionData };
        }
    }
</script>

<svelte:head>
    <title>MoE Session Analysis - {profileId} | Mediqom</title>
    <meta name="description" content="Medical session analysis with Mixture of Experts visualization" />
</svelte:head>

<div class="session-moe-page">
    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading session analysis...</p>
        </div>
    {:else if error}
        <div class="error-state">
            <h2>Error Loading Session</h2>
            <p>{error}</p>
            <button on:click={() => window.location.reload()}>
                Retry
            </button>
        </div>
    {:else if sessionData}
        <SessionMoeVisualizer 
            {sessionData}
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
        </div>
    {/if}
</div>

<style>
    .session-moe-page {
        height: 100vh;
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