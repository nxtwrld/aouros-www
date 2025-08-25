<script lang="ts">
	import { getContext, onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';
	import { TABS } from './Tabs.svelte';
    import type { TabInterface } from './Tabs.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const panel: number = crypto.getRandomValues(new Uint32Array(1))[0];
	const tabContext = getContext(TABS) as TabInterface | undefined;
	
	// Gracefully handle missing context
	const registerPanel = tabContext?.registerPanel ?? (() => {});
	const selectedPanel = tabContext?.selectedPanel ?? writable(0);
	const fixedHeight = tabContext?.fixedHeight ?? false;
	const registerPanelHeight = tabContext?.registerPanelHeight ?? (() => {});
	const panels = tabContext?.panels ?? [];

	registerPanel(panel);
	
	// Get panel index for transform calculation
	let panelIndex = $derived(panels?.indexOf(panel) ?? 0);

	let panelElement: HTMLDivElement;
	let resizeObserver: ResizeObserver | null = null;

	// Update height when content changes
	function updateHeight() {
		if (fixedHeight && panelElement && registerPanelHeight) {
			const height = panelElement.scrollHeight;
			console.log(`📏 Panel ${panel} height: ${height}px`);
			registerPanelHeight(panel, height);
		}
	}

	// Measure height after initial render and when content changes
	$effect(() => {
		// Use a small delay to ensure content is fully rendered
		const timeoutId = setTimeout(() => {
			updateHeight();
		}, 50);
		
		return () => clearTimeout(timeoutId);
	});
	
	// Also update when panel becomes active
	$effect(() => {
		if ($selectedPanel === panel) {
			updateHeight();
		}
	});
	
	// Set up ResizeObserver for dynamic content changes
	onMount(() => {
		if (fixedHeight && panelElement) {
			resizeObserver = new ResizeObserver(() => {
				updateHeight();
			});
			resizeObserver.observe(panelElement);
		}
	});
	
	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});
</script>

<div 
	bind:this={panelElement}
	class="tab-panel" 
	class:active={$selectedPanel === panel}
	class:fixed-height-mode={fixedHeight}
>
	{@render children?.()}
</div>

<style>
	.tab-panel {
		width: 100%;
	}

	/* Dynamic height mode - traditional display switching */
	.tab-panel:not(.fixed-height-mode) {
		display: none;
	}

	.tab-panel:not(.fixed-height-mode).active {
		display: block;
	}

	/* Fixed height mode - grid layout handled by parent CSS */
	.tab-panel.fixed-height-mode {
		/* Grid column placement and sizing handled by parent .tab-panels-grid */
		display: block; /* Always visible in grid */
	}
</style>