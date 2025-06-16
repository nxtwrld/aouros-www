<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="tab-heads">
	{@render children?.()}
</div>

<style>


    .tab-heads {
        display: flex;
        justify-content:space-around;
        border-bottom: 1px solid var(--color-divider-2);
    }

	.tab-heads :global(.tab-head) {
        border: none;
        background-color: transparent;
        color: var(--color-diver-4);
        font-size: 1rem;
        padding: 1rem;
        border-bottom: .2rem solid transparent;
        transition: border .3s ease-in-out;
        width: 100%;
        border-right: 1px solid var(--color-divider-2);
    }
    .tab-heads :global(.tab-head):last-child {
        border-right: none;
    }


    .tab-heads :global(.tab-head.active) {
        border-bottom: .2rem solid var(--color-primary);
    }
</style>