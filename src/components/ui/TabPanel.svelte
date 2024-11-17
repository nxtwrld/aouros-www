<script lang="ts">
	import { getContext } from 'svelte';
	import { TABS } from './Tabs.svelte';
    import type { TabInterface } from './Tabs.svelte';

	const panel: number = crypto.getRandomValues(new Uint32Array(1))[0];
	const { registerPanel, selectedPanel } = getContext(TABS) as TabInterface;

	registerPanel(panel);
</script>

{#if $selectedPanel === panel}
	<slot></slot>
{/if}