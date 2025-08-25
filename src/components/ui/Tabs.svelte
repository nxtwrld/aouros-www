<script module lang="ts">
    import type { Writable } from 'svelte/store';

    export interface TabInterface {
        registerTab: (tab: number) => void;
        registerPanel: (panel: number) => void;
        selectTab: (tab: number) => void;
		selectByIndex: (tab: number) => void;
        selectedTab?: Writable<number>;
        selectedPanel?: Writable<number>;
        fixedHeight?: boolean;
        registerPanelHeight?: (panel: number, height: number) => void;
        maxHeight?: Writable<number>;
        panels?: number[];
    }

	export const TABS: TabInterface = {
        registerTab: function(){},
        registerPanel: function(){},
        selectTab: function(){}
    };
</script>

<script lang="ts">
	import { setContext, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';
	interface Props {
		children?: import('svelte').Snippet;
		fixedHeight?: boolean;
	}

	let { children, fixedHeight = true }: Props = $props();

	const tabs: number[] = [];
	const panels: number[] = [];
	const selectedTab = writable(0);
	const selectedPanel = writable(0);
	
	// Height management for fixed height mode
	const panelHeights: Record<number, number> = {};
	const maxHeight = writable(0);
	
	// Track active panel index for transform
	let activePanelIndex = $state(0);
	
	// Calculate tab count for width calculations
	let tabCount = $derived(panels.length || 1);

	const tabContext: TabInterface = {
		registerTab: (tab: number) => {
			tabs.push(tab);
			selectedTab.update((current: number) => current || tab);
			
			onDestroy(() => {
				const i = tabs.indexOf(tab);
				tabs.splice(i, 1);
				selectedTab.update(current => current === tab ? (tabs[i] || tabs[tabs.length - 1]) : current);
			});
		},

		registerPanel: (panel: number) => {
			panels.push(panel);
			selectedPanel.update((current: number) => current || panel);
			
			onDestroy(() => {
				const i = panels.indexOf(panel);
				panels.splice(i, 1);
				selectedPanel.update((current: number) => current === panel ? (panels[i] || panels[panels.length - 1]) : current);
			});
		},

		selectTab: (tab: number) => {
			const i = tabs.indexOf(tab);
			selectedTab.set(tab);
			selectedPanel.set(panels[i]);
			activePanelIndex = i;  // Update index for transform
		},

		selectByIndex: (index: number) => {
			selectedTab.set(tabs[index]);
			selectedPanel.set(panels[index]);
			activePanelIndex = index;  // Update index for transform
		},

		registerPanelHeight: (panel: number, height: number) => {
			if (fixedHeight && height > 0) {
				console.log(`📊 Registering panel ${panel} height: ${height}px`);
				panelHeights[panel] = height;
				const newMaxHeight = Math.max(...Object.values(panelHeights), 0);
				console.log(`📈 New max height: ${newMaxHeight}px from panels:`, panelHeights);
				maxHeight.set(newMaxHeight);
			}
		},

		selectedTab,
		selectedPanel,
		fixedHeight,
		maxHeight,
		panels
	}

	// Export selectTab function to component instance
	export function selectTab(index: number) {
		tabContext.selectByIndex(index);
	}

	setContext(TABS, tabContext);
</script>

<div class="tabs" 
	class:fixed-height={fixedHeight} 
	style:--active-panel-index={activePanelIndex}
	style:--tab-count={tabCount}
	style:--max-panel-height={$maxHeight > 0 ? `${$maxHeight}px` : 'auto'}
>
	{@render children?.()}
</div>

<style>
	.tabs {
		width: 100%;
	}

	/* Fixed height mode with CSS Grid sliding */
	.tabs.fixed-height {
		min-height: var(--max-panel-height);
		transition: min-height 0.2s ease;
	}

	/* Wrapper clips the view to show only one tab */
	.tabs.fixed-height :global(.tab-panels-wrapper) {
		overflow: hidden;
		width: 100%;
		position: relative;
	}

	/* Grid container - wide enough for all panels side-by-side */
	.tabs.fixed-height :global(.tab-panels-grid) {
		display: grid;
		grid-template-columns: repeat(var(--tab-count), 1fr);
		width: calc(100% * var(--tab-count));
		transform: translateX(calc(-100% / var(--tab-count) * var(--active-panel-index)));
		transition: transform 0.3s ease;
	}

	/* Each panel takes one grid column automatically */
	.tabs.fixed-height :global(.tab-panel.fixed-height-mode) {
		min-height: var(--max-panel-height);
		/* No positioning needed - grid handles layout */
	}
</style>