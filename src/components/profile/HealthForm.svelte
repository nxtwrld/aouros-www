<script lang="ts">
    import { run } from 'svelte/legacy';

    import { definitions as FORM_DEFINITION } from '$lib/health/dataTypes';
    import HealthFormField from './HealthFormField.svelte';
    import { createEventDispatcher } from 'svelte';
    import { t } from '$lib/i18n';
///    import { profile } from '$lib/profiles';

    const dispatch = createEventDispatcher();

    
    const BloodType = {
        'A+': 'A+', 
        'A-': 'A-', 
        'B+': 'B+', 
        'B-': 'B-', 
        'AB+': 'AB+', 
        'AB-': 'AB-', 
        'O+': 'O+', 
        'O-': 'O-'
    } as const;



    console.log('property', config.property);

    const FORM = FORM_DEFINITION.reduce((acc, prop) => {
        acc[prop.key] = prop;
        return acc;
    }, {} as { [key: string]: any });

    let TABS = [
        {
            title: 'profile',
            properties: ["birthDate", "biologicalSex", "bloodType", "height", "weight"]
        },
        {
            title: 'lifeStyle',
            properties: ["smokingStatus", "alcoholConsumption", "physicalActivity", "diet"]
        },
        {
            title: 'vitals',
            properties: ['bloodPressure', 'heartRate', 'temperature', 'oxygenSaturation']
        },
        {
            title: 'vaccinations',
            properties: ['vaccinations']
        },
        {
            title: 'allergies',
            properties: ['allergies']
        },
        {
            title: 'chronicConditions',
            properties: ['chronicConditions']
        }
    ].reduce((acc, tab) => {
        // if config has a value of true, show all properties
        if (config === true) {
            acc.push(tab);
            return acc;
        } 
        // otherwise, filter the properties
        tab.properties = tab.properties.filter(prop => config.keys.includes(prop));
        if (tab.properties.length > 0) {
            acc.push(tab);
        }
        return acc;
    }, [] as { title: string, properties: string[] }[]);


    interface Props {
        config?: {
        keys: string[];
        values: any[];
        property: any;
    } | true;
        data?: any;
        inputs?: {
        [key: string]: any;
    };
    }

    let { config = true, data = $bindable({}), inputs = $bindable(mapFromToInputs()) }: Props = $props();

 
    function mapFromToInputs() {
        return FORM_DEFINITION.reduce((acc, prop) => {
            // passed inputs from dialog config
            const index =  (config && config !== true) ? config.keys.indexOf(prop.key) : -1;
            let value = (config && config !== true && index >= 0) ? config.values[index] : null;

            if (data && data[prop.key]) {
                value = data[prop.key];
            }


            // map time-series items
            if (prop.type === 'time-series' && prop.items) {
                acc[prop.key] = prop.items.reduce((acc, item) => {
                    acc[item.key] = value || item?.default || '';
                    if (item.key === 'date') {
                        acc[item.key] = new Date().toISOString();
                    }
                    return acc;
                }, {} as { [key: string]: any });
                return acc;
            }

            // map array items
            if (prop.type === 'array' && prop.items) {
                acc[prop.key] = [...mapFormArrayToInputs(prop)];

                return acc;
            }
            // map property values
            acc[prop.key] =  value || prop?.default || '';
            return acc;
        }, {} as { [key: string]: any });
    }

    function mapFormArrayToInputs(prop: { key: string, items: { key: string, type: string, default?: any }[] }, currentValues: any[] = []) {
        // passed inputs from dialog config
        const index =  (config && config !== true) ? config.keys.indexOf(prop.key) : -1;
        let values = (config && config !== true && index >= 0) ? config.values[index] : currentValues;

        if (data && data[prop.key]) {
            values = data[prop.key];
        }

        function mapValues(value: any) {
            return prop.items.reduce((acc, item) => {
                acc[item.key] = value || item.default || '';
                return acc;
            }, {} as { [key: string]: any });
        }
        
        let mapOutValues = [ ...values];

        return mapOutValues;
    }


    function mapInputsToData(inputs: { [key: string]: any }) {
        return Object.keys(inputs).reduce((acc, key) => {
            const prop = FORM[key];
            if (prop.type === 'time-series' && prop.items) {
                acc[key] = Object.keys(inputs[key]).reduce((acc, itemKey) => {
                    acc[itemKey] = inputs[key][itemKey];
                    return acc;
                }, {} as { [key: string]: any });
                return acc;
            }

            if (prop.type === 'array' && prop.items) {
                return acc;
            }
            acc[key] = inputs[key];
            return acc;
        }, {} as { [key: string]: any });
    }


    function addArrayItem(prop: { key: string, items: { key: string, type: string, default?: any }[] }) {
        inputs[prop.key] = [...inputs[prop.key], ...mapFormArrayToInputs(prop, [
            prop.items.reduce((acc, item) => {
                acc[item.key] = item.default || '';
                return acc;
            }, {} as { [key: string]: any })
        ])];
    }


    // Manage actiov tabs
    let activeTab: number = $state(0);
    function showTab(index: number) {
        activeTab = index;
    }


    run(() => {
        data = mapInputsToData(inputs);
    });
</script>


<h3 class="h3 heading -sticky">{ $t('profile.health.health-form') }</h3>

<form class="form">
    {#if TABS.length > 1}
        <div class="tab-heads">
        {#each TABS as tab, index}
            <button onclick={() => showTab(index)} class:-active={index == activeTab}>{ $t('profile.health.tabs.' + tab.title)}</button>
        {/each}
        </div>
    {/if}
    {#each TABS as tab, index}
    <div class="tab-body" class:-active={index == activeTab}>
        {#each tab.properties as propKey}
        {@const prop = FORM[propKey]}
        {#if prop}
        <div>
            {#if prop.type === 'time-series' && prop.items}
                {#each prop.items as item}
                     {#if item.type == 'date'}
                        <!-- Date fields are handled elsewhere -->
                    {:else}
                    <HealthFormField prop={item} bind:data={inputs[prop.key][item.key]} />
                    {/if}
                {/each}
            {:else if prop.type === 'array' && prop.items}
                {#each inputs[prop.key] as itemValue, index}
                           {#each prop.items as item}
                        <HealthFormField prop={item} bind:data={inputs[prop.key][index][item.key]} />
                    {/each}
                {/each}
                <button class="button" onclick={() => addArrayItem(prop)}>Add</button>
            {:else}
                <HealthFormField {prop} bind:data={inputs[prop.key]} />
            {/if}
        </div>    
        {:else }
        ----- Unkonwn property: {propKey} -----
        {/if}    
        {/each}
    </div>
    {/each}

    <!--div class="form-actions">
        <button class="button" on:click={() => dispatch('abort')}>Abort</button>
        <button class="button -primary" on:click={saveForm}>Save</button>
    </div-->

</form>


<style>
    .form {
        min-width: 35rem;
        max-width: 100%;
    }
</style>