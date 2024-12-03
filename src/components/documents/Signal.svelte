<script lang="ts">
    import LabResultDetail from "./SignalDetail.svelte";
    import synonyms from "$data/synonyms";
    import { createEventDispatcher } from "svelte";
    import defaults from '$data/lab.properties.defaults.json';
    //import profile from '$lib/user/profile';

    const dispatch = createEventDispatcher();
    

    export let item: {
        signal: string,
        test: string,
        value: string | number,
        unit: string,
        reference: string,
        urgency?: number
    };



    export let showDetails: boolean = false;

    const code: string = item.signal || item.test;
    const key = code.toLowerCase().replace(/ /g, '_');
    const title: string = item.signal || item.test;
    const value: string | number = parseValue(item.value);
    const unit: string = item.unit || '';
    const urgency: number = item.urgency || -1;

    let referenceRange: {
        low: {
            value: number,
            unit: string
        },
        high: {
            value: number,
            unit: string
        }
    } | null = getRange();


    function parseValue(value: string | number) {
        if (typeof value == 'string') {
            const parsed = parseFloat(value.replace(',', '.'));
            if (!isNaN(parsed)) {
                return parsed;
            }
        } 
        return value;
    }


    function getRange() {
        try {
            return  getRangeItem(item?.reference) 
        } catch(e) {
            
            if (!defaults[key]) return null;

            const defRefRange = defaults[key].referenceRange;

            if (!defRefRange)  return null;

            const userRefRange = defRefRange.find((refRange) => {
                console.log('TODO', refRange)
                // TODO: check unit!!
                return {
                    low: {
                        value: 0,
                        unit:'x'
                    },
                    high: {
                        value: 0,
                        unit:  'x'
                    } 
                };

                return (refRange.sex == 'any' || refRange.age == profile.getSex())  
                    && (refRange.ageRange.min <= profile.getAge() && refRange.ageRange.max >= profile.getAge())      
            })


            if (!userRefRange)  return null;
 
            return {
                low: {
                    value: userRefRange.low,
                    unit
                },
                high: {
                    value: userRefRange.high,
                    unit
                }
            };
        }
    }



    function getRangeItem(itemRef: string | undefined) {

        if(itemRef) {
            let [low, high] = itemRef.split('-');
            return {
                low: {
                    value: parseValue(low),
                    unit: unit
                },
                high: {
                    value:  parseValue(high),
                    unit: unit
                }
            }
        }
        return null; 
    }
    
    /*
    function getStatus() {
        if (unit == 'arb.j.') {
            return (['neg', '-'].includes(value.toString())) ? 'ok' : 'risk';
        } else {
            let status: 'ok' | 'low' | 'high' = 'ok';
            
            if (referenceRange == null) return status;
            if (typeof value != 'number') return status;

            if (value < referenceRange.low.value) {
                status = 'low';
            } else if (value > referenceRange.high.value) {
                status = 'high';
            }
            return status;
        }
    }

    $: icon = getIcon(status);

    function getIcon(status) {
        return (status == 'ok') ? 'ok' : 'danger';
        
    }

    function toggleDetails() {
        if (!showDetails) dispatch('showDetails', {code, showDetails});
        showDetails = !showDetails;
    }
    

    export function closeDetails() {
        showDetails = false;
    }


*/
</script>

    <tr class="lab-result  urgency-{urgency}  status-{status}"  id="{code.toLocaleLowerCase()}-lab-result">
        
        <!--td class="more" class:opened={showDetails}>
            <svg>
                <use href="/sprite.svg#down"></use>
            </svg>
        </td-->
        
        <td class="title">{code}</td>

        <td class="-empty">
            <div class="actions">
                <button on:click={() => alert('TODO: chart')}>
                    <svg>
                        <use href="/icons.svg#chart-line"></use>
                    </svg>
                </button>
            </div>
        </td>

        {#if unit == 'arb.j.'}
            <td class="-empty value">
                <div class="status status-{status} urgency-{urgency}">
                    <!--svg>
                        <use href="/sprite.svg#status-{icon}"></use>
                    </svg-->
                    <strong>{value}</strong>
                </div>
            </td>
        {:else}
            <td class="-empty value">
                <div class="status  urgency-{urgency}">
                    <!--svg>
                        <use href="/sprite.svg#status-{icon}"></use>
                    </svg-->
                    <strong>{value} </strong>
                    {#if unit}
                    <span class="unit">{unit}</span>
                    {/if}
                </div>
            </td>
        {/if}

    </tr>


    <!--tr class="lab-details" class:opened={showDetails}>
        <td colspan="4" >
            <div class="details"  class:opened={showDetails}>

            {#if showDetails}

                <LabResultDetail
                    {code}
                    {status}
                    {item}
                    {unit}
                    {value}
                    {referenceRange}
                    {report} />
            {/if}
            </div>
        </td>
    </tr-->


<style>



    /*.lab-result td:first-child {
        border-top-left-radius: var(--border-radius);
        border-bottom-left-radius: var(--border-radius);
    }
    .lab-result td:last-child {
        border-top-right-radius: var(--border-radius);
        border-bottom-right-radius: var(--border-radius);
    }
*/
/*
    .lab-result:hover td,
    .lab-result.opened td {
        background-color: var(--color-white);
    }
    .lab-result.opened .title {
        font-weight: bold;
    }

    .table-list .lab-details td {
        width: 100%;
        margin: 0;
        padding: 0;
    }

    .title {

        font-size: 1.1rem;
        width:100%
    }
*/

    tr td:first-child {
        border-left: .5rem solid var(--background-color);
    }



    .value {
        text-align: right;
        vertical-align: middle;
    }
/*
    .details {
        max-height: 0;
        transition: max-height .3s ease-in-out;
        width: 100%;
        overflow: hidden;
    }

    .details.opened {
        max-height: 100vh;
        overflow: auto;
    }

        */
    .status {
        margin-right: 1rem;
        min-width: 4rem;
        border-radius: var(--border-radius);
        padding: 0  1.5rem 0 1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #FFF;
        font-weight: 500;
        flex-grow: 1;
        width: 100%;
        height: 100%;
        text-align: right;
        transition: background-color .1s ease-in-out;
        background-color: var(--background-color);
        color: var(--text-color);
    }

    .status-ok {
        --background-color: var(--color-positive);
        --text-color: var(--color-positive-text);
    }
    .status-risk,
    .status-low,
    .status-high {
        --background-color: var(--color-negative);
        --text-color: var(--color-negative-text);
    }

    .urgency-1 {
        --background-color: var(--color-positive);
        --text-color: var(--color-positive-text);
    }
    .urgency-2 {
        --background-color: var(--color-warning);
        --text-color: var(--color-warning-text);
    }
    .urgency-3,
    .urgency-4,
    .urgency-5 {
        --background-color: var(--color-negative);
        --text-color: var(--color-negative-text);
    }
    

    .status svg {
        fill: currentColor;
        height: 1.5rem;
        width: 1.5rem;
        margin-right: .5rem;
    }
    .status strong {
        font-size: 1.5rem;
        font-weight: 900;
        margin-right: .5rem;
        flex-grow: 1;
    }
  

</style>
