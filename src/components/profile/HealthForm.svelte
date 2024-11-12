<script lang="ts">
    import { definitions as FORM_DEFINITION } from '$lib/health/dataTypes';
    import HealthFormField from './HealthFormField.svelte';
    import { createEventDispatcher } from 'svelte';
    import { profile } from '$lib/med/profiles';
    const dispatch = createEventDispatcher();

    export let config: {
        keys: string[];
        values: any[];
    } | true = true;
    
    enum BloodType {
        'A+' = 'A+', 
        'A-' = 'A-', 
        'B+' = 'B+', 
        'B-' = 'B-', 
        'AB+' = 'AB+', 
        'AB-' = 'AB-', 
        'O+' = 'O+', 
        'O-' = 'O-'
    }



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





    console.log('profile', $profile);
    export let data: {
        [key: string]: any;
    } = FORM_DEFINITION.reduce((acc, prop) => {
        // passed data from dialog config
        const index =  (config && config !== true) ? config.keys.indexOf(prop.key) : -1;
        const value = (config && config !== true && index >= 0) ? config.values[index] : null;

        // map time-series fields
        if (prop.type === 'time-series' && prop.fields) {
            acc[prop.key] = prop.fields.reduce((acc, field) => {
                acc[field.key] = value || field.default || '';
                if (field.key === 'date') {
                    acc[field.key] = new Date().toISOString();
                }
                return acc;
            }, {} as { [key: string]: any });
            return acc;
        }
        // map property values
        acc[prop.key] =  value || prop.default || '';
        return acc;
    }, {} as { [key: string]: any });

    console.log(data);


    // Manage actiov tabs
    let activeTab: number = 0;
    function showTab(index: number) {
        console.log(index);
        activeTab = index;
    }


    function saveForm() {
        console.log(data);
        // TODO: update profile
        dispatch('save', data);
    }
</script>




<h2 class="h2">Health Form</h2>


<form class="form">
    {#if TABS.length > 1}
        <div class="tab-heads">
        {#each TABS as tab, index}
            <button on:click={() => showTab(index)} class:-active={index == activeTab}>{tab.title}</button>
        {/each}
        </div>
    {/if}
    {#each TABS as tab, index}
    <div class="tab-body" class:-active={index == activeTab}>
        {#each tab.properties as propKey}
        {@const prop = FORM[propKey]}
        {#if prop}
        <div>
            {#if prop.type === 'time-series' && prop.fields}
                {#each prop.fields as field}
                     {#if field.type == 'date'}
                   
                    {:else}
                    <HealthFormField prop={field} bind:data={data[prop.key][field.key]} />
                    {/if}
                {/each}
            {:else}
                <HealthFormField {prop} bind:data={data[prop.key]} />
            {/if}
        </div>    
        {:else }
        ----- Unkonwn property: {propKey} -----
        {/if}    
        {/each}
    </div>
    {/each}

    <div class="form-actions">
        <button class="button" on:click={() => dispatch('abort')}>Abort</button>
        <button class="button -primary" on:click={saveForm}>Save</button>
    </div>

</form>


<style>
    .form {
        width: 35rem;
        max-width: 100%;
    }
</style>