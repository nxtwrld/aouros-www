<script context="module" lang="ts">
    import type { Writable } from 'svelte/store';

    export interface TabInterface {
        registerTab: (tab: number) => void;
        registerPanel: (panel: number) => void;
        selectTab: (tab: number) => void;
		selectByIndex: (tab: number) => void;
        selectedTab?: Writable<number>;
        selectedPanel?: Writable<number>;
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

	const tabs: number[] = [];
	const panels: number[] = [];
	const selectedTab = writable(0);
	const selectedPanel = writable(0);

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
		},

		selectByIndex: (index: number) => {
			selectedTab.set(tabs[index]);
			selectedPanel.set(panels[index]);
		},

		selectedTab,
		selectedPanel
	}

	export const selectTab = tabContext.selectByIndex;

	setContext(TABS, tabContext);
</script>

<div class="tabs">
	<slot></slot>
</div>