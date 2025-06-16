<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>


<div class="flex -center">

	{@render children?.()}

</div>



<style>
	.flex.-center {
		background-color: var(--color-blue);
	}
</style>