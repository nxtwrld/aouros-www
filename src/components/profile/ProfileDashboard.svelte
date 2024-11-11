<script lang="ts">
    import { profile} from '$slib/med/profiles';
    import { getAge } from '$slib/med/datetime';
    import PropertyTile from './PropertyTile.svelte';
    import { properties } from '$slib/health/dataTypes';
    import ui from '$slib/ui';

    interface Property {
        key: string;
        value: string;
        editable?: string;
        label: string;
        unit: string;
        icon: string;
    }

    //console.log('profile', $profile);
    $: props = (($profile) ?[
        {
            key: 'age',
            value: getAge($profile.health.birthDate),
            source: $profile.health.birthDate,
            editable: 'birthDate'
        },
        {
            key: 'bloodType',
            source: $profile?.health?.bloodType,
            value: $profile?.health?.bloodType
        },
        {
            key: 'biologicalSex',
            source: $profile?.health?.biologicalSex,
            value: $profile?.health?.biologicalSex
        },
        {
            key: 'height',
            source: $profile?.health?.height,
            value: $profile?.health?.height?.height,
        },
        {
            key: 'weight',
            source: $profile?.health?.weight,
            value: $profile?.health?.weight?.weight,
        },
        {
            key: 'bloodPressure',
            source: $profile?.health?.bloodPressure,
            value: $profile?.health?.bloodPressure?.systolic + '/' + $profile?.health?.bloodPressure?.diastolic,
        }

    ] : []).map(p => {
        return {
            ...(properties[p.key] || {}),
            ...p,

        } as Property;
    })

    function openTile(prop: Property) {
        console.log('openTile', prop.key || prop.editable, prop);
        ui.emit('modal.healthForm', {
            keys: [prop.editable || prop.key],
            values: [prop.value]
        });
    }

</script>

<div class="page -empty">
{#if $profile}
    <div class="profile-header">
        <div class="avatar">
            {#if $profile.avatarUrl}
                <img src="{$profile.avatarUrl}" alt="{$profile.fullName}" class="avatar" />
            {:else}
            Add Image
            {/if}
        </div>
        

        <div class="profile-details">
            <h1 class="h1">{$profile.fullName}</h1>
            <div class="rest">
                
                <div class="profile">

        
                    <div>Date of birth: {$profile.health.birthDate}</div>
        
                    {#if $profile.insurance}
                    <div>Insurance: {$profile.insurance.provider} - {$profile.insurance.number}</div>
                    {/if}                
                </div>

                <div class="contacts">
                    <div>{$profile.vcard?.email?.[0].value}</div>
                    {#if $profile.vcard}
                        {#if $profile.vcard.tel}
                            {#each $profile.vcard.tel as tel}
                            <div>Phone: <a href="tel:{tel.value}" class="a">{tel.value} ({tel.type || 'default'})</a></div>
                            {/each}
                        {/if}

                    {/if}
                </div>
            </div>
        </div>
    </div>

    <div class="tiles">

        {#each props as prop}
        {#if prop.value}
        <button class="tile" on:click={() => openTile(prop)}>
            <PropertyTile property={prop} />
        </button>
        {/if}
        {/each}
        <div class="tile">
            <button class="button --large" on:click={() => ui.emit('modal.healthForm')}>
                Open Health Form
            </button>
        </div>
    </div>

    <ul>
        <li>Latest Lab results document + charts</li>
        <li>Medical History
            <ul>
                <li>Latest prescriptions</li>
                <li>Latest appointments</li>
                <li>Latest messages</li>
                <li>Latest reports</li>  
            </ul>
        </li>
    </ul>

{/if}

</div>

<style>
    .profile-header {
        display: grid;
        grid-template-columns: 10rem 1fr;
        margin-bottom: var(--gap);
        background-color: var(--color-gray-300);
        padding: 1rem 0;
    }
    .profile-header > * {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .profile-header .rest {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 1rem;
    }
    .profile-header .rest > * {
        display: flex;
        flex-direction: column;
        justify-content: center;

    }
    .profile-header .h1 {
        width: 100%;
    }



    .tiles {
        --background-color: var(--color-gray-300);
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
        gap: var(--gap);
        margin-bottom: var(--gap);
        text-align: left;
    }
    .tile {
        background-color: var(--background-color);
        min-height: 6rem;
        min-width: 12rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .tile:last-child {
        grid-column: auto / -1; 
        --background-color: var(--color-highlight);
    }
    button.tile:hover {
        --background-color: var(--color-white);

    }
</style>