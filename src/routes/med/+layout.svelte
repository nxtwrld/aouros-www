<script lang="ts">

    import { emitShortcut } from '$slib/shortcuts';

    import Unlock from '$scomponents/layout/Unlock.svelte';
    import UI from '$scomponents/layout/UI.svelte';



</script>


<svelte:window on:keypress={emitShortcut}></svelte:window>

<Unlock>
    <UI><slot /></UI>
</Unlock>