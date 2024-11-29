<script lang="ts">
    import { t } from '$lib/i18n';
    import { properties } from '$lib/health/dataTypes';
    import { createEventDispatcher } from 'svelte';
    import { durationFrom } from '$lib/datetime';

    const dispatch = createEventDispatcher();

    type Signal = {
        signal?: string;
        value: number;
        unit?: string;
        reference?: string;
        urgency?: number;
        date?: string;
        trend?: number;
    }

    type Property = {
        key: string;
        signal: string;
        test: string;
        source: any;
        fn?: (v: any) => any;
        reference?: string;
        urgency?: number;
    }

    

    export let property:  Property;
    
    $: signal = getSignalFromProperty(property);

    $: ageOfEntry = durationFrom(signal.date);


    function getSignalFromProperty(p: Property): Signal {
        let value = undefined;
        let trend = undefined;
        let date = undefined;
        // combining multiple values - but only if all are set
        if (Array.isArray(p.source)) {
            value = (p.source.every(v => v != undefined)) ? p.source : undefined;
        } else {
            value = p.source;
        }
        
        // results is a time array of items - select the first one
        // or if it is multiple values, select the first value of each
        if (Array.isArray(value)) {
            if (Array.isArray(value[0])) {
                //value = value[0][0]?.value;
                date = value[0][0]?.date;
                value = value.map(v => v[0]?.value);
            } else {
                // calculate trend if available
                if (value.length > 1) {
                    trend = value[0].value - value[1].value;
                }
                date = value[0]?.date;
                value = value[0]?.value;
            }
        }

        // if there is a function to transform the value
        if (value && p.fn) {
            value = p.fn(value);
        }
        console.log('value  done', p, value);

        return {
            ...(properties[p.signal] || {}),
            ...p,
            date,
            trend,
            value

        } as Signal;

    }

    
    $: referenceRange = signal.reference?.split('-').map(Number)
    $: title = signal.signal as string;
//    $: unit = getUnit(signal.unit)

    $: icon = getResultIcon(signal);

    function getResultIcon(property: Signal) {
        switch (title) {
            case 'biologicalSex':
                return 'biologicalSex-' + signal.value;
            default:
                return title;
        }
    }

    function showUnit(unit: string) {
        if (!unit) return '';
        const localized = $t(`medical.units.${signal.unit}`);
        if (localized && localized !== `medical.units.${signal.unit}`) {
            return localized;
        } 
        return unit;
    }

</script>


<div class="grid-tile-wrapper">
    <svg class="icon">
        <use href="/icons-o.svg#prop-{icon}"></use>
    </svg>
    <button on:click={() => dispatch('open')} class="grid-tile prop-{signal.signal} urgency-{signal.urgency} prop-value-{signal.value}" class:-danger={referenceRange && (signal.value < referenceRange[0] || signal.value > referenceRange[1])} >

        <div class="title">
            {#if $t(`medical.props.${title}`) == `medical.props.${title}`}
                {title}
            {:else} 
                { $t(`medical.props.${title}`)}
            {/if}
            {#if signal.date}
                <div class="date">
                    {$t({ id: 'app.duration.'+ageOfEntry.format+'-ago', values: {value: ageOfEntry.value}})}
                </div>
            {/if}
        </div>

        <div class="value">
            {#if signal.trend}
                <span class="trend">{signal.trend > 0 ? '↑' : '↓'}</span>
            {/if}
            <strong>
            {#if properties[title]?.localize}
                { $t(`medical.prop-values.${title}.${signal.value}`) }
            {:else}
                {signal.value}
            {/if}
        </strong>
        {#if signal.unit}<span class="unit">{@html  showUnit(signal.unit)  } </span>{/if}</div>

    </button>
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
        padding: .3rem;
    }
    .grid-tile .unit {
        font-size: 1.5rem;
        font-weight: 300;
    }
    .grid-tile.urgency-1 .value {
        background-color: var(--color-warning);
        color: var(--color-warning-text);
    }
    .grid-tile.urgency-2,
    .grid-tile.urgency-3 {
        background-color: var(--color-negative);
        color: var(--color-negative-text);
    }
</style>