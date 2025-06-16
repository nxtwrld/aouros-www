<script lang="ts">
    import Markdown from "$components/ui/Markdown.svelte";
    interface Props {
        data: any;
    }

    let { data }: Props = $props();
</script>


{#if data}
    <div class="page -block">
        <Markdown text={data} />
    </div>
{/if}
