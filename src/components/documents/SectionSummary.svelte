<script lang="ts">
    import Markdown from "$components/ui/Markdown.svelte";
    export let data: any;
</script>


{#if data}
    <div class="page -block">
        <Markdown text={data} />
    </div>
{/if}
