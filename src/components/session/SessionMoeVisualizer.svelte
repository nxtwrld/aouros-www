<script lang="ts">
    import { onMount } from 'svelte';
    import SankeyDiagram from './SankeyDiagram.svelte';
    import SessionSidebar from './SessionSidebar.svelte';
    import SessionToolbar from './SessionToolbar.svelte';
    import sampleTranscript from './sample.transcript.1.cz.json';
    import shortcuts from '$lib/shortcuts';
    import type { SessionAnalysis, NodeSelectEvent, LinkSelectEvent } from './types/visualization';
    import { t } from '$lib/i18n';
    import { selectedItem } from '$lib/session/stores/session-viewer-store';

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
    let activeTabId = $state<string>('questions');
    let activeMainView = $state<string>('diagram'); // Track main area view
    
    // Responsive breakpoints
    const MOBILE_BREAKPOINT = 640;
    const TABLET_BREAKPOINT = 1024;

    onMount(() => {
        checkViewport();
        window.addEventListener('resize', checkViewport);
        
        // Minimal mount work; avoid noisy logs in production

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
        const newIsMobile = width < MOBILE_BREAKPOINT;
        const newShowSidebar = width >= TABLET_BREAKPOINT;
        
        // Only update if values actually changed to prevent unnecessary re-renders
        if (newIsMobile !== isMobile) {
            isMobile = newIsMobile;
        }
        
        if (newShowSidebar !== showSidebar && !newIsMobile) {
            showSidebar = newShowSidebar;
        }
        
        // Auto-hide sidebar on mobile (only if changed to mobile)
        if (newIsMobile && showSidebar) {
            showSidebar = false;
        }
    }

    function handleNodeSelect(event: CustomEvent<NodeSelectEvent>) {
        selectedNodeId = event.detail.nodeId;
        selectedLink = null; // Clear link selection when node is selected
        // Note: Tab switching and sidebar opening now handled by $effect
    }

    function handleLinkSelect(event: CustomEvent<LinkSelectEvent>) {
        selectedLink = event.detail.link;
        selectedNodeId = null; // Clear node selection when link is selected
        // Tab switching and sidebar opening will be handled by $effect
    }


    function handleNodeAction(detail: { action: string; targetId: string; reason?: string }) {
        onnodeAction?.(detail);
    }

    function handleRelationshipNodeClick(detail: { nodeId: string }) {
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
        
        // console.log('🖱️ Selection cleared via canvas click');
    }

    function handleFocusNext() {
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.focusNext) {
            navFunctions.focusNext();
        } else {
            console.warn('🎹 Tab navigation not available - navFunctions not found');
        }
    }

    function handleFocusPrevious() {
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.focusPrevious) {
            navFunctions.focusPrevious();
        } else {
            console.warn('🎹 Shift+Tab navigation not available - navFunctions not found');
        }
    }

    function handleSelectFocused() {
        const navFunctions = (window as any).sankeyNavigationFunctions;
        if (navFunctions?.selectFocused) {
            navFunctions.selectFocused();
        } else {
            console.warn('🎹 Enter/Space selection not available - navFunctions not found');
        }
    }

    function handleFocusChange(event: CustomEvent<{ index: number }>) {
        focusedNodeIndex = event.detail.index;
        // focus index updated
    }

    function toggleSidebar() {
        showSidebar = !showSidebar;
    }
    
    function handleTabSelect(tabId: string) {
        activeTabId = tabId;
        if (tabsRef?.selectTab) {
            const tabIndex = getTabIndex(tabId);
            if (tabIndex !== -1) {
                tabsRef.selectTab(tabIndex);
            }
        }
    }
    
    function handleMainViewSelect(viewId: string) {
        activeMainView = viewId;
        // Future: Handle switching between different main views
        // For now, we only have 'diagram'
    }
    
    function getTabIndex(tabId: string): number {
        const hasTranscript = transcript && transcript.length > 0;
        const tabOrder = [
            'questions',
            ...(hasTranscript ? ['transcript'] : []),
            'details',
            ...(!isMobile ? ['legend'] : [])
        ];
        return tabOrder.indexOf(tabId);
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
    // Get selected node from viewer store (no reactive sessionData reads!)
    const selectedNode = $derived($selectedItem?.type === 'node' ? $selectedItem.item : null);

    // Handle tab selection when selectedNodeId or selectedLink changes
    $effect(() => {
        // Handle node selection
        if (selectedNodeId && selectedNode) {
            // Auto-show sidebar when node is selected
            if (!showSidebar && !isMobile) {
                showSidebar = true;
            }
            
            // Auto-select Details tab when node is selected
            activeTabId = 'details';
            selectDetailsTab();
        }
        
        // Handle link selection
        if (selectedLink) {
            // Auto-show sidebar when link is selected
            if (!showSidebar && !isMobile) {
                showSidebar = true;
            }
            
            // Auto-select Details tab when link is selected
            activeTabId = 'details';
            selectDetailsTab();
        }
    });

    // Helper function to handle tab selection with proper timing
    function selectDetailsTab() {
        if (tabsRef?.selectTab) {
            const hasTranscript = transcript && transcript.length > 0;
            // Tab order: Questions (0), Transcript (1), Details (2), Legend (3 desktop only)
            const detailsTabIndex = hasTranscript ? 2 : 1;
            setTimeout(() => tabsRef.selectTab(detailsTabIndex), 10); // Small delay to ensure DOM is ready
        } else if (tabsRef !== undefined) {
            // Only warn if tabsRef is defined but doesn't have selectTab method
            // Skip warning during initial render when tabsRef is undefined
            console.warn('⚠️ tabsRef.selectTab not available:', { tabsRef, hasSelectTab: !!tabsRef?.selectTab });
        }
    }
    
    // No reactive effects needed - path calculation is handled by the store
    
    // Track active tab changes from the SessionTabs component
    $effect(() => {
        if (tabsRef?.activeTab !== undefined) {
            const tabIds = [
                'questions',
                ...(transcript && transcript.length > 0 ? ['transcript'] : []),
                'details',
                ...(!isMobile ? ['legend'] : [])
            ];
            activeTabId = tabIds[tabsRef.activeTab] || 'questions';
        }
    });
</script>

<div class="session-visualizer" class:mobile={isMobile}>
    <!-- Desktop Toolbar -->
    {#if !isMobile}
        <SessionToolbar 
            {showSidebar}
            activeTab={activeTabId}
            {activeMainView}
            hasQuestions={questionCount > 0}
            hasTranscript={transcript && transcript.length > 0}
            {pendingQuestions}
            {isMobile}
            onToggleSidebar={toggleSidebar}
            onTabSelect={handleTabSelect}
            onMainViewSelect={handleMainViewSelect}
        />
    {/if}
    
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
                {isMobile}
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

    /* Responsive breakpoints 
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
    }*/
</style>