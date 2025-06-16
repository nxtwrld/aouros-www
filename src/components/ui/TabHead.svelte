<script lang="ts">
	import { getContext } from 'svelte';
	import { TABS } from './Tabs.svelte';
    import type { TabInterface } from './Tabs.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const tab: number = crypto.getRandomValues(new Uint32Array(1))[0];
	const { registerTab, selectTab, selectedTab } = getContext(TABS) as TabInterface;

	registerTab(tab);
</script>



<button class="tab-head" class:active="{$selectedTab === tab}" onclick={() => selectTab(tab)}>
	{@render children?.()}
</button>