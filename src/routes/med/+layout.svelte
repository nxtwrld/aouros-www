<script lang="ts">

    import { emitShortcut } from '$lib/shortcuts';

    import Unlock from '$components/layout/Unlock.svelte';
    import UI from '$components/layout/UI.svelte';



</script>


<svelte:window on:keydown={emitShortcut}></svelte:window>

<Unlock>
    <UI><slot /></UI>
</Unlock>