<script lang="ts">
    import { t } from '$lib/i18n';
    import { properties } from '$lib/health/dataTypes';

    type Result = {
        key?: string;
        test?: string;
        value: number;
        unit?: string;
        reference?: string;
    }

    export let property:  Result;


    
    $: referenceRange = property.reference?.split('-').map(Number)
    $: title = property.key || property.test as string;
//    $: unit = getUnit(property.unit)

    let icon: string = getResultIcon(property)

    function getResultIcon(property: Result) {
        switch (title) {
            case 'biologicalSex':
                return 'biologicalSex-' + property.value;
            default:
                return title;
        }
    }

    function showUnit(unit: string) {
        if (!unit) return '';
        const localized = $t(`medical.units.${property.unit}`);
        if (localized && localized !== `medical.units.${property.unit}`) {
            return localized;
        } 
        return unit;
    }

</script>


<div class="grid-tile-wrapper">
    <svg class="icon">
        <use href="/icons-o.svg#prop-{icon}"></use>
    </svg>
    <div class="grid-tile prop-{property.key} prop-value-{property.value}" class:-danger={referenceRange && (property.value < referenceRange[0] || property.value > referenceRange[1])} >

        <div class="title">{ $t(`medical.props.${title}`)}</div>

        <div class="value"><strong>
            {#if properties[title]?.localize}
                { $t(`medical.prop-values.${title}.${property.value}`) }
            {:else}
                {property.value}
            {/if}
        </strong> <span class="unit">{@html  showUnit(property.unit)  } </span></div>

    </div>
</div>

<style>


    .grid-tile-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        /*border-radius: var(--radius-8);*/
        margin-bottom: var(--gap);
        background-color: var(--background-color);
        text-align: left;
    }

    .grid-tile {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: .5rem;
        padding: .5rem;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        align-items: stretch;

    }
    .grid-tile .title {
        text-align: right;

    }
    .grid-tile-wrapper .icon {
        width: 4.5rem;
        height: 4.5rem;
        margin: 1rem 1rem .5rem 1rem;
        fill: var(--color-gray-500);
    }

    .grid-tile .value {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: flex-end;
        flex-grow: 1;
        gap: .2rem;
        font-size: 2rem;
        font-weight: 700;
    }
    .grid-tile .unit {
        font-size: 1.5rem;
        font-weight: 300;
    }


</style>