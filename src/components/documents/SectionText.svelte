<script lang="ts">
    import Flag from "$components/ui/Flag.svelte";
    import Markdown from "$components/ui/Markdown.svelte";
    import { t } from '$lib/i18n';
    import user from '$lib/user';
    
    interface Props {
        data: {
        text: string;
        original: string;
        language: string;
    };
    }

    let { data }: Props = $props();

    let viewOriginal: boolean = $state(false);

</script>


{#if data && (data.original) && (data.original != '')}


    <h3 class="h3 heading -sticky">{ $t('report.report') }</h3>


    {#if $user?.language != data.language && data.text != data.original && data.text && data.text != ''}
        <div class="panel">
            <Flag country={data.language} /> { $t('report.translated-from', { values: { language: $t('languages.'+ data.language) }}) }
            <button class="a" onclick={() => viewOriginal = !viewOriginal}>{ $t('report.toggle-original-contents') }</button>
        </div>
        <div class="panel">
            <Markdown text={viewOriginal ? data.original : data.text} />
        </div>
    {:else}   
        <div class="panel">
            <Markdown text={data.original} />
        </div>
    {/if}  
{/if}

<style>
    .panel {
        padding: 1rem;
        background-color: var(--color-background);
        margin-bottom: var(--gap);
    }
</style>
