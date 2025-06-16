<script lang="ts">
    import { profile } from '$lib/profiles';
    import { onDestroy } from 'svelte';
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    onDestroy(() => {
        profile.set(null);
    });
</script>

{@render children?.()}