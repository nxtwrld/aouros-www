<script lang="ts">
    import { onMount } from "svelte";

    let isReady: boolean = false;

    onMount(() => {
        isReady = true;
    });
</script>

{#if isReady}
    <slot/>
{/if}


<style>
    :global(html), :global(body) {
        margin: 0;
        padding: 0;
        height: 100%;
    }
    :global(body) {

        font-family:'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
        font-size: 20px;
    }

</style>