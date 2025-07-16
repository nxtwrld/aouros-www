<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
    }

    let { data }: Props = $props();

    function sortByUrgency(a: any, b: any) {
        return b.urgency - a.urgency;
    }

    let sortedData = $derived(data ? [...data].sort(sortByUrgency) : []);

</script>


{#if data && data.length > 0}
    <h3 class="h3 heading -sticky">{ $t('report.recommendations') }</h3>

    <ul class="list-items">
        {#each sortedData as { urgency, description}}
        <li class="panel urgency-{urgency}">
            {description}
        </li>
        {/each}
    </ul>
{/if}

<style>
    /* SectionRecommendations specific styles */
    .list-items li.panel {
        border-left-color: var(--color-urgency);
    }
</style>