<script lang="ts">
    import { isObject } from '$lib/context/objects';
	import focused from '$lib/focused';
    import { isElementInViewport } from '$lib/viewport';
	import ui from '$lib/ui';
	import { createEventDispatcher, onMount } from 'svelte';
	import { throttle } from 'throttle-debounce';


    export let tags: string[] = [];

	const dispatch = createEventDispatcher();

	$: safeTags = tags.map(tag => tag.replace(/ /g, '_'));

	export let focusable: boolean = true;
	export let active: boolean = true;

	$: focusableTags = safeTags.filter((tag) => isObject(tag));

	

	let tagContainer: HTMLElement;

	function focus(event: MouseEvent, tag: string) {
		event.preventDefault();
		event.stopPropagation();
		focused.set({ object: tag.replace(/ /ig, '_') });
		dispatch('click', tag);
	}

	const checkIfInView = throttle(500, function () {
		if (isElementInViewport(tagContainer)) {
			focused.set({ object: focusableTags[0]});
		}
	});

	onMount(() => {
		return ui.listen('scroll', () => {
			if (focusable) checkIfInView();
		});
	});

</script>

<div class="tags" bind:this={tagContainer}>
	{#each tags as tag}
        {#if isObject(tag.replace(/ /g, '_'))}
			{#if active}
            	<button class="tag -object" class:-highlight={tag == $focused.object} on:click={(event) => focus(event, tag)}>{tag}</button>
			{:else}
				<span class="tag -object" class:-highlight={tag == $focused.object} on:click={() => dispatch('click', tag)}>{tag}</span>	
			{/if}
        {:else}
    		<span class="tag" on:click={() => dispatch('click', tag)}>{tag}</span>
        {/if}
	{/each}
</div>


<style>
    .tags {
        display: inline-flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background-color: var(--color-gray-800);
		color: var(--color-white);
		cursor: pointer;
	}
	.tag.-object {
		background-color: var(--color-interactivity);
		color: var(--color-interactivity-text);
	}
	.tag.-object.-highlight {
		background-color: var(--color-highlight);
		color: var(--color-highlight-text);
	}

    button {
        pointer-events: all;
    }

</style>