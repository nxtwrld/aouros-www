<script lang="ts">
    import { onMount } from 'svelte';
    import SankeyDiagram from './SankeyDiagram.svelte';
    import SessionSidebar from './SessionSidebar.svelte';
    import sampleTranscript from './sample.transcript.1.cz.json';
    import shortcuts from '$lib/shortcuts';
    import type { SessionAnalysis, NodeSelectEvent, LinkSelectEvent } from './types/visualization';
    // import { analysisActions } from '$lib/session/analysis-store';
    import { t } from '$lib/i18n';

    interface Props {
        sessionData: SessionAnalysis;
        isRealTime?: boolean;
        showLegend?: boolean;
        enableInteractions?: boolean;
        transcript?: any[];
        onnodeAction?: (detail: { action: string; targetId: string; reason?: string }) => void;
    }

    let { 
        sessionData, 
        isRealTime = true, 
        showLegend = true, 
        enableInteractions = true,
        transcript = sampleTranscript.conversation,
        onnodeAction
    }: Props = $props();

    let selectedNodeId = $state<string | null>(null);
    let selectedLink = $state<any | null>(null);
    let focusedNodeIndex = $state<number>(-1);
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
        
        // Debug sessionData loading
        console.log('🚀 SessionMoeVisualizer mounted with sessionData:', {
            sessionId: sessionData.sessionId,
            analysisVersion: sessionData.analysisVersion,
            nodes: {
                symptoms: sessionData.nodes?.symptoms?.length || 0,
                diagnoses: sessionData.nodes?.diagnoses?.length || 0,
                treatments: sessionData.nodes?.treatments?.length || 0,
                actions: sessionData.nodes?.actions?.length || 0
            },
            sampleDiagnoses: sessionData.nodes?.diagnoses?.slice(0, 3).map(d => ({id: d.id, name: d.name})) || []
        });

        // Setup keyboard shortcuts
        const off = [
            shortcuts.listen('Escape', handleClearSelection),
            shortcuts.listen('Tab', handleFocusNext),
            shortcuts.listen('Shift+Tab', handleFocusPrevious),
            shortcuts.listen('Enter', handleSelectFocused),
            shortcuts.listen('Space', handleSelectFocused)
        ];
        
        return () => {
            window.removeEventListener('resize', checkViewport);
            off.forEach(f => f());
        };
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
        console.log('🔍 Node selected:', event.detail.nodeId);
        selectedNodeId = event.detail.nodeId;
        selectedLink = null; // Clear link selection when node is selected
        // Note: Tab switching and sidebar opening now handled by $effect
    }

    function handleLinkSelect(event: CustomEvent<LinkSelectEvent>) {
        console.log('🔗 Link selected:', event.detail.link);
        selectedLink = event.detail.link;
        selectedNodeId = null; // Clear node selection when link is selected
        // Tab switching and sidebar opening will be handled by $effect
    }


    function handleNodeAction(detail: { action: string; targetId: string; reason?: string }) {
        onnodeAction?.(detail);
    }

    function handleRelationshipNodeClick(detail: { nodeId: string }) {
        console.log('🔗 Relationship node clicked:', detail.nodeId);
        selectedNodeId = detail.nodeId;
        // This will automatically trigger the $effect that handles tab switching and sidebar opening
    }

    function handleClearSelection() {
        const hadNodeSelection = selectedNodeId !== null;
        const hadLinkSelection = selectedLink !== null;
        const hadFocus = focusedNodeIndex !== -1;
        
        selectedNodeId = null;
        selectedLink = null;
        focusedNodeIndex = -1;
        
        // Also clear the unified selection system via SankeyDiagram
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.clearSelection) {
            navFunctions.clearSelection();
        }
        
        // console.log('🎹 Selection and focus cleared via Escape key');
    }

    function handleSelectionClear() {
        const hadNodeSelection = selectedNodeId !== null;
        const hadLinkSelection = selectedLink !== null;
        
        selectedNodeId = null;
        selectedLink = null;
        
        // Also clear the unified selection system (SankeyDiagram handles this internally) 
        // analysisActions.clearSelection();
        
        // console.log('🖱️ Selection cleared via canvas click');
    }

    function handleFocusNext() {
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.focusNext) {
            navFunctions.focusNext();
            console.log('🎹 Focus next node via Tab key, focusedIndex now:', focusedNodeIndex);
        } else {
            console.warn('🎹 Tab navigation not available - navFunctions not found');
        }
    }

    function handleFocusPrevious() {
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.focusPrevious) {
            navFunctions.focusPrevious();
            console.log('🎹 Focus previous node via Shift+Tab key, focusedIndex now:', focusedNodeIndex);
        } else {
            console.warn('🎹 Shift+Tab navigation not available - navFunctions not found');
        }
    }

    function handleSelectFocused() {
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.selectFocused) {
            navFunctions.selectFocused();
            console.log('🎹 Select focused node via Enter/Space key, focusedIndex:', focusedNodeIndex);
        } else {
            console.warn('🎹 Enter/Space selection not available - navFunctions not found');
        }
    }

    function handleFocusChange(event: CustomEvent<{ index: number }>) {
        focusedNodeIndex = event.detail.index;
        console.log('🎯 Focus changed to index:', focusedNodeIndex);
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
    const selectedNode = $derived.by(() => {
        console.log('🔍 selectedNode $derived called with selectedNodeId:', selectedNodeId);
        if (!selectedNodeId) {
            console.log('🔍 No selectedNodeId, returning null');
            return null;
        }
        
        const allNodes = [
            ...(sessionData.nodes.symptoms || []), 
            ...(sessionData.nodes.diagnoses || []), 
            ...(sessionData.nodes.treatments || []), 
            ...(sessionData.nodes.actions || [])
        ];
        
        console.log('🎯 Looking for node:', selectedNodeId);
        console.log('🎯 SessionData structure:', {
            symptoms: sessionData.nodes.symptoms?.length || 0,
            diagnoses: sessionData.nodes.diagnoses?.length || 0,
            treatments: sessionData.nodes.treatments?.length || 0,
            actions: sessionData.nodes.actions?.length || 0
        });
        console.log('🎯 Available nodes:', allNodes.map(n => ({ id: n.id, type: n.type || 'unknown', name: n.name || n.text || 'unnamed' })));
        
        const foundNode = allNodes.find(n => n.id === selectedNodeId);
        console.log('🎯 Found node:', foundNode ? { id: foundNode.id, name: foundNode.name || foundNode.text || 'unnamed', fullNode: foundNode } : null);
        
        return foundNode || null;
    });

    // Handle tab selection when selectedNodeId or selectedLink changes
    $effect(() => {
        console.log('🎯 Effect called - selectedNodeId:', selectedNodeId, 'selectedLink:', selectedLink ? 'link selected' : null, 'selectedNode:', selectedNode ? {id: selectedNode.id, name: selectedNode.name || selectedNode.text} : null);
        
        // Handle node selection
        if (selectedNodeId && selectedNode) {
            console.log('🎯 Node selection effect triggered for:', selectedNodeId);
            
            // Auto-show sidebar when node is selected
            if (!showSidebar && !isMobile) {
                showSidebar = true;
                console.log('📂 Sidebar opened via node selection effect');
            }
            
            // Auto-select Details tab when node is selected
            if (tabsRef?.selectTab) {
                const hasTranscript = transcript && transcript.length > 0;
                // Tab order: Questions (0), Transcript (1), Details (2), Legend (3 desktop only)
                const detailsTabIndex = hasTranscript ? 2 : 1;
                console.log('📋 Switching to Details tab via node selection effect (index:', detailsTabIndex, ')');
                setTimeout(() => tabsRef.selectTab(detailsTabIndex), 10); // Small delay to ensure DOM is ready
            } else {
                console.warn('⚠️ tabsRef or selectTab not available in effect:', { tabsRef, selectTab: tabsRef?.selectTab });
            }
        }
        
        // Handle link selection
        if (selectedLink) {
            console.log('🎯 Link selection effect triggered for:', selectedLink);
            
            // Auto-show sidebar when link is selected
            if (!showSidebar && !isMobile) {
                showSidebar = true;
                console.log('📂 Sidebar opened via link selection effect');
            }
            
            // Auto-select Details tab when link is selected
            if (tabsRef?.selectTab) {
                const hasTranscript = transcript && transcript.length > 0;
                // Tab order: Questions (0), Transcript (1), Details (2), Legend (3 desktop only)
                const detailsTabIndex = hasTranscript ? 2 : 1;
                console.log('📋 Switching to Details tab via link selection effect (index:', detailsTabIndex, ')');
                setTimeout(() => tabsRef.selectTab(detailsTabIndex), 10); // Small delay to ensure DOM is ready
            } else {
                console.warn('⚠️ tabsRef or selectTab not available in effect:', { tabsRef, selectTab: tabsRef?.selectTab });
            }
        }
    });
</script>

<div class="session-visualizer" class:mobile={isMobile}>
    <!-- Mobile Header -->
    {#if isMobile}
        <header class="mobile-header">
            <div class="header-info">
                <h2>Analysis v{sessionData.analysisVersion}</h2>
                <div class="stats">
                    <span class="stat">
                        <span class="count">{questionCount}</span> {$t('session.headers.questions')}
                    </span>
                    <span class="stat">
                        <span class="count urgent">{pendingQuestions}</span> {$t('session.status.pending')}
                    </span>
                </div>
            </div>
            <div class="header-actions">
                <button class="sidebar-toggle" onclick={toggleSidebar}>
                    {showSidebar ? $t('session.actions.hide-panel') : $t('session.actions.show-panel')}
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
                {focusedNodeIndex}
                onnodeSelect={handleNodeSelect}
                onlinkSelect={handleLinkSelect}
                onselectionClear={handleSelectionClear}
                onfocusChange={handleFocusChange}
            />
        </div>

        <!-- Sidebar -->
        <SessionSidebar
            {sessionData}
            {transcript}
            {selectedNode}
            {selectedLink}
            {pendingQuestions}
            {isMobile}
            {showSidebar}
            {sidebarWidth}
            bind:tabsRef
            onnodeAction={handleNodeAction}
            onrelationshipNodeClick={handleRelationshipNodeClick}
            onToggleSidebar={toggleSidebar}
            onStartResize={startResize}
        />
    </div>


    <!-- Mobile sidebar overlay -->
    {#if isMobile && showSidebar}
        <div class="mobile-overlay" onclick={toggleSidebar}></div>
    {/if}
</div>

<style>
    .session-visualizer {
        display: flex;
        flex-direction: column;
        height: 100%;
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