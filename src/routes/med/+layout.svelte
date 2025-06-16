<script lang="ts">

    import { emitShortcut } from '$lib/shortcuts';
    import Unlock from '$components/layout/Unlock.svelte';
    //import UI from '$components/layout/UI.svelte';
    import { onMount } from 'svelte';
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    let lazyUnlock: Promise<{ default: any }> | null = $state(null);

    onMount(() => {
        lazyUnlock = import('$components/layout/UI.svelte');
    });

</script>


<svelte:window onkeydown={emitShortcut}></svelte:window>

<Unlock>
    {#if lazyUnlock !== null}
        {#await lazyUnlock  then { default: LazyComponent }}
            <LazyComponent>{@render children?.()}</LazyComponent>
        {/await}
    {/if}
</Unlock>