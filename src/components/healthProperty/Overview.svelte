<script lang="ts">
    import { type Signal } from "$lib/types.d"; 
    import { profile } from '$lib/profiles';
    import ReferenceRange from "$components/charts/ReferenceRange.svelte";
    import ReferenceRangeLineChart from "$components/charts/ReferenceRangeLineChart.svelte";
    import { t } from '$lib/i18n';

    export let property: Signal;

    console.log('property', property);
    let prop = $profile.health[property.signal] || $profile.health.signals[property.signal]; 

    console.log('prop', prop);
    console.log('health', $profile.health);

    let history = prop?.values || [];
    console.log('history', history);
    //$: ageOfEntry = (signal.date) ? durationFrom(signal.date) : undefined;
    // how much is the value expiring  1== recent  < 1 == older
    //$: isExpired = (signal.date) ? durationFromFormatted('days', signal.date) -  defaultSetup.valueExpirationInDays > 0 : false;

    function toLineChartData(data: any) {
        return data.map((d: any) => {
            return {
                id: 'value',
                date: d.date,
                value: d.value,
                unit: d.unit 
            }
        })
    }
</script>

<div class="property-overview">
<h2 class="h2">{$t('profile.health.props.'+ property.signal)}</h2>




{#if property.reference}
<ReferenceRange value={property.value} reference={property.reference} />
{/if}
<p class="p">TODO: value expiration status</p>

{#if history.length > 1}
<ReferenceRangeLineChart series={toLineChartData(history)} reference={property.reference} />
{:else}
<p class="p">No history available</p>
{/if}

</div>


<style>
.property-overview {
    min-width: 350px;
    width: 50vw;
    max-width: 100vw;
}
</style>