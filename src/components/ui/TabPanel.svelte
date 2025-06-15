<script lang="ts">
	import { getContext } from 'svelte';
	import { TABS } from './Tabs.svelte';
    import type { TabInterface } from './Tabs.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const panel: number = crypto.getRandomValues(new Uint32Array(1))[0];
	const { registerPanel, selectedPanel } = getContext(TABS) as TabInterface;

	registerPanel(panel);
</script>

{#if $selectedPanel === panel}
	{@render children?.()}
{/if}