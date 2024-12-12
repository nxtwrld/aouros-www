<script lang="ts">

    import { emitShortcut } from '$lib/shortcuts';
    import Unlock from '$components/layout/Unlock.svelte';
    //import UI from '$components/layout/UI.svelte';
    import { onMount } from 'svelte';

    let lazyUnlock: Promise<{ default: any }> | null = null;

    onMount(() => {
        lazyUnlock = import('$components/layout/UI.svelte');
    });

</script>


<svelte:window on:keydown={emitShortcut}></svelte:window>

<Unlock>
    {#if lazyUnlock !== null}
        {#await lazyUnlock  then { default: LazyComponent }}
            <LazyComponent><slot/></LazyComponent>
        {/await}
    {/if}
</Unlock>