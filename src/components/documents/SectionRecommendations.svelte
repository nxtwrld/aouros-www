<script lang="ts">
    import { t } from '$lib/i18n';

    export let data: any;

    function sortByUrgency(a, b) {
        return b.urgency - a.urgency;
    }

</script>


{#if data && data.length > 0}
    <h3 class="h3 heading -sticky">{ $t('report.recommendations') }</h3>

    <ul class="list-items">
        {#each data.sort(sortByUrgency) as { urgency, description}}
        <li class="panel urgency-{urgency}">
            {description}
        </li>
        {/each}
    </ul>
{/if}

<style>

    .list-items {
        list-style: none;
        padding: 0;
        --indicator-width: 0.5rem;
    }
    .list-items li {
        padding: 1rem;
        background-color: var(--color-background);
        margin-bottom: var(--gap);
    }

    li.panel {
        border-left: var(--indicator-width) solid var(--color-urgency);
    }

</style>