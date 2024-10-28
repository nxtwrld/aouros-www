<script lang="ts">
    import './styles.css';
    import Header from '$scomponents/Header.svelte';
    import { emitShortcut } from '$slib/shortcuts'


</script>


<svelte:window on:keypress={emitShortcut}></svelte:window>
<Header></Header>


<main>
    <slot/>
</main>