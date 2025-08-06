<script lang="ts">
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    import SankeyDiagram from './SankeyDiagram.svelte';
    import NodeDetails from './NodeDetails.svelte';  
    import QuestionManager from './QuestionManager.svelte';
    import Legend from './Legend.svelte';
    import type { SessionAnalysis, NodeSelectEvent, LinkSelectEvent, QuestionAnswerEvent } from './types/visualization';

    export let sessionData: SessionAnalysis;
    export let isRealTime: boolean = true;
    export let showLegend: boolean = true;
    export let enableInteractions: boolean = true;

    const dispatch = createEventDispatcher<{
        questionAnswer: QuestionAnswerEvent;
        nodeAction: { action: string; targetId: string; reason?: string };
    }>();

    let selectedNodeId: string | null = null;
    let isMobile = false;
    let showSidebar = true;
    let sidebarContent: 'questions' | 'details' | 'legend' = 'questions';
    
    // Responsive breakpoints
    const MOBILE_BREAKPOINT = 640;
    const TABLET_BREAKPOINT = 1024;

    onMount(() => {
        checkViewport();
        window.addEventListener('resize', checkViewport);
        return () => window.removeEventListener('resize', checkViewport);
    });

    function checkViewport() {
        const width = window.innerWidth;
        isMobile = width < MOBILE_BREAKPOINT;
        showSidebar = width >= TABLET_BREAKPOINT;
        
        // Auto-hide sidebar on mobile
        if (isMobile) {
            showSidebar = false;
        }
    }

    function handleNodeSelect(event: CustomEvent<NodeSelectEvent>) {
        selectedNodeId = event.detail.nodeId;
        sidebarContent = 'details';
        
        // Auto-show sidebar when node is selected
        if (!showSidebar && !isMobile) {
            showSidebar = true;
        }
    }

    function handleLinkSelect(event: CustomEvent<LinkSelectEvent>) {
        // For now, just show link details in console
        console.log('Link selected:', event.detail.link);
    }

    function handleQuestionAnswer(event: CustomEvent<QuestionAnswerEvent>) {
        dispatch('questionAnswer', event.detail);
    }

    function handleNodeAction(action: string, targetId: string, reason?: string) {
        dispatch('nodeAction', { action, targetId, reason });
    }

    function toggleSidebar() {
        showSidebar = !showSidebar;
    }

    function setSidebarContent(content: typeof sidebarContent) {
        sidebarContent = content;
        if (!showSidebar && !isMobile) {
            showSidebar = true;
        }
    }

    // Get counts for UI display
    $: questionCount = sessionData.nodes.actions?.filter(a => a.actionType === 'question')?.length || 0;
    $: pendingQuestions = sessionData.nodes.actions?.filter(a => a.actionType === 'question' && a.status === 'pending')?.length || 0;
    $: alertCount = sessionData.nodes.actions?.filter(a => a.actionType === 'alert')?.length || 0;
    $: selectedNode = selectedNodeId ? 
        [...(sessionData.nodes.symptoms || []), ...(sessionData.nodes.diagnoses || []), 
         ...(sessionData.nodes.treatments || []), ...(sessionData.nodes.actions || [])]
        .find(n => n.id === selectedNodeId) : null;
</script>

<div class="session-visualizer" class:mobile={isMobile}>
    <!-- Mobile Header -->
    {#if isMobile}
        <header class="mobile-header">
            <div class="header-info">
                <h2>Analysis v{sessionData.analysisVersion}</h2>
                <div class="stats">
                    <span class="stat">
                        <span class="count">{questionCount}</span> questions
                    </span>
                    <span class="stat">
                        <span class="count urgent">{pendingQuestions}</span> pending
                    </span>
                </div>
            </div>
            <div class="header-actions">
                <button 
                    class="action-btn"
                    class:active={sidebarContent === 'questions'}
                    on:click={() => setSidebarContent('questions')}
                >
                    Questions
                    {#if pendingQuestions > 0}
                        <span class="badge">{pendingQuestions}</span>
                    {/if}
                </button>
                {#if selectedNode}
                    <button 
                        class="action-btn"
                        class:active={sidebarContent === 'details'}
                        on:click={() => setSidebarContent('details')}
                    >
                        Details
                    </button>
                {/if}
                <button class="sidebar-toggle" on:click={toggleSidebar}>
                    {showSidebar ? 'Hide' : 'Show'}
                </button>
            </div>
        </header>
    {/if}

    <div class="visualization-container" class:sidebar-open={showSidebar}>
        <!-- Main Sankey Diagram -->
        <div class="diagram-area">
            <SankeyDiagram 
                data={sessionData}
                {isMobile}
                {selectedNodeId}
                on:nodeSelect={handleNodeSelect}
                on:linkSelect={handleLinkSelect}
            />

            <!-- Legend overlay removed for better screen usage -->
        </div>
    </div>

    <!-- Sidebar -->
    <aside class="sidebar" class:open={showSidebar} class:mobile={isMobile}>
        <!-- Desktop Sidebar Header -->
        {#if !isMobile}
            <header class="sidebar-header">
                <div class="tabs">
                    <button 
                        class="tab"
                        class:active={sidebarContent === 'questions'}
                        on:click={() => setSidebarContent('questions')}
                    >
                        Questions ({questionCount})
                        {#if pendingQuestions > 0}
                            <span class="badge">{pendingQuestions}</span>
                        {/if}
                    </button>
                    {#if selectedNode}
                        <button 
                            class="tab"
                            class:active={sidebarContent === 'details'}
                            on:click={() => setSidebarContent('details')}
                        >
                            Details
                        </button>
                    {/if}
                </div>
                <button class="close-btn" on:click={toggleSidebar}>
                    ✕
                </button>
            </header>
        {/if}

        <div class="sidebar-content">
            {#if sidebarContent === 'questions'}
                <QuestionManager 
                    questions={sessionData.nodes.actions?.filter(a => a.actionType === 'question') || []}
                    alerts={sessionData.nodes.actions?.filter(a => a.actionType === 'alert') || []}
                    on:questionAnswer={handleQuestionAnswer}
                />
            {:else if sidebarContent === 'details' && selectedNode}
                <NodeDetails 
                    node={selectedNode}
                    allNodes={sessionData.nodes}
                    on:nodeAction={(e) => handleNodeAction(e.detail.action, e.detail.targetId, e.detail.reason)}
                />
            {:else if sidebarContent === 'legend'}
                <Legend detailed={true} />
            {/if}
        </div>
    </aside>

    <!-- Mobile sidebar overlay -->
    {#if isMobile && showSidebar}
        <div class="mobile-overlay" on:click={toggleSidebar}></div>
    {/if}
</div>

<style>
    .session-visualizer {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--color-background, #f8fafc);
        overflow: hidden;
    }

    /* Mobile Header */
    .mobile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--color-surface, #fff);
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .header-info h2 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.25rem;
        color: var(--color-text-primary, #1f2937);
    }

    .stats {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #6b7280);
    }

    .stat .count {
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
    }

    .stat .count.urgent {
        color: var(--color-error, #dc2626);
    }

    .header-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .action-btn {
        position: relative;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .action-btn.active {
        background: var(--color-primary, #3b82f6);
        color: white;
        border-color: var(--color-primary, #3b82f6);
    }

    .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--color-error, #dc2626);
        color: white;
        font-size: 0.75rem;
        padding: 0.125rem 0.375rem;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
    }

    .sidebar-toggle {
        padding: 0.5rem;
        font-size: 0.875rem;
        border: none;
        background: transparent;
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer;
    }

    /* Main Layout */
    .visualization-container {
        flex: 1;
        display: flex;
        position: relative;
        overflow: hidden;
    }

    .diagram-area {
        flex: 1;
        position: relative;
        transition: margin-right 0.3s ease;
    }

    .sidebar-open .diagram-area {
        margin-right: 320px;
    }

    .legend-overlay {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 6px;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        backdrop-filter: blur(4px);
    }

    /* Sidebar */
    .sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 320px;
        height: 100vh;
        background: var(--color-surface, #fff);
        border-left: 1px solid var(--color-border, #e2e8f0);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 50;
        display: flex;
        flex-direction: column;
    }

    .sidebar.open {
        transform: translateX(0);
    }

    .sidebar.mobile {
        width: 90vw;
        max-width: 400px;
        height: 60vh;
        top: auto;
        bottom: 0;
        border-left: none;
        border-top: 1px solid var(--color-border, #e2e8f0);
        border-radius: 12px 12px 0 0;
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
    }

    .tabs {
        display: flex;
        gap: 0.25rem;
    }

    .tab {
        position: relative;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        border: none;
        background: transparent;
        color: var(--color-text-secondary, #6b7280);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tab.active {
        background: var(--color-primary-bg, #dbeafe);
        color: var(--color-primary, #3b82f6);
    }

    .close-btn {
        padding: 0.5rem;
        border: none;
        background: transparent;
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .close-btn:hover {
        background: var(--color-surface-hover, #f1f5f9);
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
    }

    /* Mobile Overlay */
    .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 40;
    }

    /* Mobile-specific adjustments */
    .mobile .visualization-container {
        margin-bottom: 0;
    }

    .mobile .diagram-area {
        margin: 0.5rem;
    }

    .mobile.sidebar-open .diagram-area {
        margin-right: 0.5rem;
    }

    /* Responsive breakpoints */
    @media (min-width: 640px) and (max-width: 1023px) {
        .sidebar {
            width: 350px;
        }
    }

    @media (min-width: 1024px) {
        .session-visualizer {
            flex-direction: row;
        }

        .mobile-header {
            display: none;
        }

        .visualization-container {
            flex: 1;
        }

        .sidebar-open .diagram-area {
            margin-right: 1rem;
        }
    }

    @media (min-width: 1280px) {
        .sidebar {
            width: 400px;
        }
    }
</style>