<script lang="ts">
    import { t } from '$lib/i18n';
    
    interface Props {
        showSidebar: boolean;
        activeTab?: string;
        hasQuestions?: boolean;
        hasTranscript?: boolean;
        pendingQuestions?: number;
        isMobile?: boolean;
        onToggleSidebar: () => void;
        onTabSelect?: (tab: string) => void;
    }
    
    let {
        showSidebar,
        activeTab = '',
        hasQuestions = true,
        hasTranscript = true,
        pendingQuestions = 0,
        isMobile = false,
        onToggleSidebar,
        onTabSelect
    }: Props = $props();
    
    const tabs = $derived([
        { id: 'diagram', label: $t('session.diagram'), isDiagram: true },
        ...(hasQuestions ? [{ id: 'questions', label: $t('session.tabs.questions'), hasBadge: pendingQuestions > 0, badgeCount: pendingQuestions }] : []),
        ...(hasTranscript ? [{ id: 'transcript', label: $t('session.tabs.transcript') }] : []),
        { id: 'details', label: $t('session.tabs.details') },
        ...(!isMobile ? [{ id: 'legend', label: $t('session.tabs.legend') }] : [])
    ]);
    
    function handleTabClick(tabId: string) {
        if (tabId === 'diagram') {
            if (showSidebar) {
                onToggleSidebar();
            }
        } else {
            onTabSelect?.(tabId);
            if (!showSidebar) {
                onToggleSidebar();
            }
        }
    }
</script>

<div class="session-toolbar-tabs">
    <div class="tab-heads">
        {#each tabs as tab}
            <button 
                class="tab-head"
                class:-active={tab.isDiagram ? !showSidebar : (showSidebar && activeTab === tab.id)}
                onclick={() => handleTabClick(tab.id)}
                title={tab.label}
            >
                {tab.label}
                {#if tab.hasBadge && tab.badgeCount}
                    <span class="badge">{tab.badgeCount}</span>
                {/if}
            </button>
        {/each}
    </div>
    
    <button 
        class="sidebar-toggle-btn"
        onclick={onToggleSidebar}
        title={showSidebar ? $t('session.actions.hide-panel') : $t('session.actions.show-panel')}
    >
        <svg class="icon">
            <use href={showSidebar ? "/icons.svg#panel-right-close" : "/icons.svg#panel-right-open"} />
        </svg>
    </button>
</div>

<style>
    .session-toolbar-tabs {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        height: var(--toolbar-height, 48px);
        background: var(--color-surface, #fff);
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        padding-right: 0.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        z-index: 10;
    }
    
    .tab-heads {
        flex: 1;
        display: flex;
        align-items: stretch;
        gap: 0;
    }
    
    .tab-head {
        position: relative;
        flex-grow: 0;
        padding: 0.5rem 1rem;
        background-color: var(--color-white);
        border: none;
        border-top: 3px solid var(--color-border);
        border-right: 1px solid var(--color-border);
        height: 100%;
        color: var(--color-text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition:
            background-color 0.3s,
            color 0.3s,
            border-color 0.3s;
        white-space: nowrap;
        min-width: 100px;
    }
    
    .tab-head:first-child {
        border-left: none;
    }
    
    .tab-head:last-child {
        border-right: 1px solid var(--color-border);
    }
    
    .tab-head:hover {
        background-color: var(--color-surface-hover);
        color: var(--color-text-primary);
    }
    
    .tab-head.-active {
        font-weight: 700;
        border-top-color: var(--color-highlight, var(--color-primary));
        color: var(--color-highlight, var(--color-primary));
        background-color: var(--color-surface);
    }
    
    .badge {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        background: var(--color-error, #dc2626);
        color: white;
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.125rem 0.25rem;
        border-radius: 10px;
        min-width: 1rem;
        text-align: center;
        line-height: 1;
    }
    
    .sidebar-toggle-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 0.75rem;
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .sidebar-toggle-btn:hover {
        background: var(--color-surface-hover);
        color: var(--color-text-primary);
    }
    
    .sidebar-toggle-btn .icon {
        width: 1.25rem;
        height: 1.25rem;
        fill: currentColor;
    }
    
    /* Mobile adjustments */
    @media (max-width: 768px) {
        .tab-head {
            min-width: auto;
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
        }
        
        .session-toolbar-tabs {
            padding-right: 0.25rem;
        }
        
        .sidebar-toggle-btn {
            padding: 0 0.5rem;
        }
    }
    
    /* Very small screens - show only active tab */
    @media (max-width: 480px) {
        .tab-head {
            flex-grow: 1;
        }
        
        .tab-head:not(.-active) {
            display: none;
        }
    }
</style>