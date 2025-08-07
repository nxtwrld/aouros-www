<script lang="ts">
    import { onMount } from 'svelte';
    import SankeyDiagram from './SankeyDiagram.svelte';
    import NodeDetails from './NodeDetails.svelte';  
    import QuestionManager from './QuestionManager.svelte';
    import Legend from './Legend.svelte';
    import Transcript from '../profile/Session/Transcript.svelte';
    import Tabs from '../ui/Tabs.svelte';
    import TabHead from '../ui/TabHead.svelte';
    import TabHeads from '../ui/TabHeads.svelte';
    import TabPanel from '../ui/TabPanel.svelte';
    import type { SessionAnalysis, NodeSelectEvent, LinkSelectEvent, QuestionAnswerEvent } from './types/visualization';

    interface Props {
        sessionData: SessionAnalysis;
        isRealTime?: boolean;
        showLegend?: boolean;
        enableInteractions?: boolean;
        transcript?: any[];
        onquestionAnswer?: (event: CustomEvent<QuestionAnswerEvent>) => void;
        onnodeAction?: (event: CustomEvent<{ action: string; targetId: string; reason?: string }>) => void;
    }

    let { 
        sessionData, 
        isRealTime = true, 
        showLegend = true, 
        enableInteractions = true,
        transcript = [],
        onquestionAnswer,
        onnodeAction
    }: Props = $props();

    let selectedNodeId = $state<string | null>(null);
    let isMobile = $state(false);
    let showSidebar = $state(true);
    let sidebarWidth = $state(400);
    let isResizing = $state(false);
    let tabsRef = $state<any>();
    
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
        
        // Auto-show sidebar when node is selected
        if (!showSidebar && !isMobile) {
            showSidebar = true;
        }
        
        // Auto-select Details tab when node is selected
        if (tabsRef?.selectTab) {
            const hasTranscript = transcript && transcript.length > 0;
            const detailsTabIndex = hasTranscript ? 2 : 1;
            tabsRef.selectTab(detailsTabIndex);
        }
    }

    function handleLinkSelect(event: CustomEvent<LinkSelectEvent>) {
        // For now, just show link details in console
        console.log('Link selected:', event.detail.link);
    }

    function handleQuestionAnswer(event: CustomEvent<QuestionAnswerEvent>) {
        onquestionAnswer?.(event);
    }

    function handleNodeAction(action: string, targetId: string, reason?: string) {
        onnodeAction?.(new CustomEvent('nodeAction', { detail: { action, targetId, reason }}));
    }

    function toggleSidebar() {
        showSidebar = !showSidebar;
    }

    // Handle sidebar resize
    function startResize(event: MouseEvent) {
        if (isMobile) return;
        isResizing = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        event.preventDefault();
    }

    function handleResize(event: MouseEvent) {
        if (!isResizing) return;
        
        const newWidth = window.innerWidth - event.clientX;
        sidebarWidth = Math.max(320, Math.min(600, newWidth));
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    // Get counts for UI display
    const questionCount = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'question')?.length || 0);
    const pendingQuestions = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'question' && a.status === 'pending')?.length || 0);
    const alertCount = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'alert')?.length || 0);
    const selectedNode = $derived(selectedNodeId ? 
        [...(sessionData.nodes.symptoms || []), ...(sessionData.nodes.diagnoses || []), 
         ...(sessionData.nodes.treatments || []), ...(sessionData.nodes.actions || [])]
        .find(n => n.id === selectedNodeId) : null);
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
                <button class="sidebar-toggle" onclick={toggleSidebar}>
                    {showSidebar ? 'Hide' : 'Show'} Panel
                </button>
            </div>
        </header>
    {/if}

    <div class="visualization-container">
        <!-- Main Sankey Diagram -->
        <div class="diagram-area">
            <SankeyDiagram 
                data={sessionData}
                {isMobile}
                {selectedNodeId}
                onnodeSelect={handleNodeSelect}
                onlinkSelect={handleLinkSelect}
            />
        </div>

        <!-- Desktop Sidebar -->
        {#if showSidebar && !isMobile}
            <aside class="sidebar desktop" style="width: {sidebarWidth}px">
                <!-- Resize Handle -->
                <div 
                    class="resize-handle"
                    onmousedown={startResize}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize sidebar"
                ></div>
                
                <!-- Sidebar Header -->
                <header class="sidebar-header">
                    <h3>Session Details</h3>
                    <button class="close-btn" onclick={toggleSidebar}>
                        ✕
                    </button>
                </header>

                <!-- Tabs Content -->
                <div class="sidebar-content">
                    <Tabs bind:this={tabsRef}>
                        <TabHeads>
                            <TabHead>
                                Questions
                                {#if pendingQuestions > 0}
                                    <span class="badge">{pendingQuestions}</span>
                                {/if}
                            </TabHead>
                            {#if transcript && transcript.length > 0}
                                <TabHead>Transcript</TabHead>
                            {/if}
                            <TabHead>Details</TabHead>
                            <TabHead>Legend</TabHead>
                        </TabHeads>
                        
                        <TabPanel>
                            <QuestionManager 
                                questions={sessionData.nodes.actions?.filter(a => a.actionType === 'question') || []}
                                alerts={sessionData.nodes.actions?.filter(a => a.actionType === 'alert') || []}
                                onquestionAnswer={handleQuestionAnswer}
                            />
                        </TabPanel>
                        
                        {#if transcript && transcript.length > 0}
                            <TabPanel>
                                <Transcript conversation={transcript} />
                            </TabPanel>
                        {/if}
                        
                        <TabPanel>
                            {#if selectedNode}
                                <NodeDetails 
                                    node={selectedNode}
                                    allNodes={sessionData.nodes}
                                    onnodeAction={(e) => handleNodeAction(e.detail.action, e.detail.targetId, e.detail.reason)}
                                />
                            {:else}
                                <div class="empty-state">
                                    <p>Select a node from the diagram to view details</p>
                                </div>
                            {/if}
                        </TabPanel>
                        
                        <TabPanel>
                            <Legend detailed={true} />
                        </TabPanel>
                    </Tabs>
                </div>
            </aside>
        {/if}
    </div>

    <!-- Mobile Sidebar -->
    {#if showSidebar && isMobile}
        <aside class="sidebar mobile">
            <div class="mobile-sidebar-header">
                <button class="close-btn" onclick={toggleSidebar}>✕</button>
            </div>
            <div class="sidebar-content">
                <Tabs>
                    <TabHeads>
                        <TabHead>
                            Questions
                            {#if pendingQuestions > 0}
                                <span class="badge">{pendingQuestions}</span>
                            {/if}
                        </TabHead>
                        {#if transcript && transcript.length > 0}
                            <TabHead>Transcript</TabHead>
                        {/if}
                        <TabHead>Details</TabHead>
                    </TabHeads>
                    
                    <TabPanel>
                        <QuestionManager 
                            questions={sessionData.nodes.actions?.filter(a => a.actionType === 'question') || []}
                            alerts={sessionData.nodes.actions?.filter(a => a.actionType === 'alert') || []}
                            onquestionAnswer={handleQuestionAnswer}
                        />
                    </TabPanel>
                    
                    {#if transcript && transcript.length > 0}
                        <TabPanel>
                            <Transcript conversation={transcript} />
                        </TabPanel>
                    {/if}
                    
                    <TabPanel>
                        {#if selectedNode}
                            <NodeDetails 
                                node={selectedNode}
                                allNodes={sessionData.nodes}
                                onnodeAction={(e) => handleNodeAction(e.detail.action, e.detail.targetId, e.detail.reason)}
                            />
                        {:else}
                            <div class="empty-state">
                                <p>Select a node to view details</p>
                            </div>
                        {/if}
                    </TabPanel>
                </Tabs>
            </div>
        </aside>
    {/if}

    <!-- Mobile sidebar overlay -->
    {#if isMobile && showSidebar}
        <div class="mobile-overlay" onclick={toggleSidebar}></div>
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

    .sidebar-toggle {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s ease;
    }

    .sidebar-toggle:hover {
        background: var(--color-surface-hover, #f1f5f9);
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
        overflow: auto;
        min-width: 0;
    }

    /* Desktop Sidebar */
    .sidebar.desktop {
        position: relative;
        flex-shrink: 0;
        height: 100%;
        background: var(--color-surface, #fff);
        border-left: 1px solid var(--color-border, #e2e8f0);
        display: flex;
        flex-direction: column;
        box-shadow: -2px 0 4px rgba(0,0,0,0.05);
    }

    /* Resize Handle */
    .resize-handle {
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: transparent;
        cursor: col-resize;
        z-index: 10;
        transition: background-color 0.2s ease;
    }

    .resize-handle:hover {
        background: var(--color-primary, #3b82f6);
    }

    /* Mobile Sidebar */
    .sidebar.mobile {
        position: fixed;
        bottom: 0;
        right: 0;
        left: 0;
        height: 60vh;
        max-height: 400px;
        background: var(--color-surface, #fff);
        border-top: 1px solid var(--color-border, #e2e8f0);
        border-radius: 12px 12px 0 0;
        z-index: 50;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
    }

    .mobile-sidebar-header {
        display: flex;
        justify-content: flex-end;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
    }

    .close-btn {
        padding: 0.5rem;
        border: none;
        background: transparent;
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s ease;
        font-size: 1.25rem;
        line-height: 1;
    }

    .close-btn:hover {
        background: var(--color-surface-hover, #f1f5f9);
    }

    .sidebar-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    /* Tab customization */
    :global(.sidebar .tabs) {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    :global(.sidebar .tab-heads) {
        flex-shrink: 0;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        padding: 0 1rem;
        display: flex;
        gap: 0.5rem;
    }

    :global(.sidebar .tab-head) {
        position: relative;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
    }

    :global(.sidebar .tab-panel) {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
    }

    .badge {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        background: var(--color-error, #dc2626);
        color: white;
        font-size: 0.625rem;
        padding: 0.125rem 0.375rem;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
        font-weight: 600;
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-secondary, #6b7280);
        text-align: center;
        padding: 2rem;
    }

    .empty-state p {
        margin: 0;
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

    /* Responsive breakpoints */
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
    }
</style>