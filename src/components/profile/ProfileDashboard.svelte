<script lang="ts">
    import { profile} from '$lib/med/profiles';
    import { getAge } from '$lib/med/datetime';
    import PropertyTile from './PropertyTile.svelte';
    import { properties } from '$lib/health/dataTypes';
    import user from '$lib/user';
    import ui from '$lib/ui';
    import Avatar from '$components/onboarding/Avatar.svelte';
    import Documents from '$components/documents/Index.svelte';
    import { t } from '$lib/i18n';
    
    interface Property {
        signal: string;
        value: string;
        editable?: string;
        label: string;
        unit: string;
        icon: string;
    }

    console.log('profile', $profile);
    $: props = (($profile) ? [

        {
            signal: 'age',
            source: $profile.health.birthDate,
            fn: getAge,
            editable: 'birthDate'
        },
        {
            signal: 'bloodType',
            source: $profile?.health?.bloodType
        },
        {
            signal: 'biologicalSex',
            source: $profile?.health?.biologicalSex
        },
        {
            signal: 'height',
            source: $profile?.health?.height,

        },
        {
            signal: 'weight',
            source: $profile?.health?.weight,

        },
        {
            signal: 'bloodPressure',
            source: [$profile?.health?.systolic, $profile?.health?.diastolic],
            fn: (v: any) => v.join('/'),
        },
        // add high priority signals to the set
        ...(Object.keys($profile?.health).reduce((acc, key) => {
            
            const o = (Array.isArray($profile.health[key])) ? $profile.health[key][0] : $profile.health[key];
            if (!o || !o.urgency || o?.urgency == 1) return acc;

            acc.push({
                signal: key,
                source: o.value,
                unit: o.unit,
                urgency: o.urgency
            });

            return acc;

        }, [] as Property[]))
    ] : [])/*.map(p => {
        let value = undefined;
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
                value = value.map(v => v[0]?.value);
            } else {
                value = value[0]?.value;
            }
        }

        // if there is a function to transform the value
        if (value && p.fn) {
            value = p.fn(value);
        }
        //console.log('value  done', value);

        const mapped = {
            ...(properties[p.signal] || {}),
            ...p,
            value

        } as Property;
        //console.log('mapped', mapped);
        return mapped;
    }).filter(p => p.value != undefined);*/


    $: isHealthSet  = Object.keys($profile?.health || {}).length > 0;
    $: isVcardSet  = Object.keys($profile?.vcard || {}).length > 0;
    $: isInsuranceSet  = Object.keys($profile?.insurance || {}).length > 0;



    function openTile(prop: Property) {
        console.log('openTile', prop.signal || prop.editable, prop);
        ui.emit('modal.healthForm', {
            keys: [prop.editable || prop.signal],
            values: [prop.value]
        });
    }

</script>

<div class="page -empty">
{#if $profile}
    <div class="profile-header">
        <div class="avatar">

            <Avatar id={$profile.id} bind:url={$profile.avatarUrl} editable={$user.id == $profile.id} />

        </div>
        

        <div class="profile-details">
            <h1 class="h1">{$profile.fullName}</h1>
            <div class="rest">
                
                <div class="profile">
                    {#if $profile.health}
                    {#if isHealthSet && $profile.health.birthDate}
                    <div>{ $t('app.profile.date-of-birth') }: {$profile.health.birthDate}</div>
                    {/if}
                    {#if isInsuranceSet}
                    <div>{ $t('app.profile.insurance') }: {$profile.insurance.provider} - {$profile.insurance.number}</div>
                    {:else}
                    <button class="button">{ $t('app.profile.setup-profile') }</button>
                    {/if}
                    
                    
                    {/if}                
                </div>

                <div class="contacts">
                    {#if isVcardSet}

                    <div>{$profile.vcard?.email?.[0].value}</div>
                        {#if $profile.vcard}
                            {#if $profile.vcard.tel}
                                {#each $profile.vcard.tel as tel}
                                <div>{$t('app.profile.phone')}: <a href="tel:{tel.value}" class="a">{tel.value} ({tel.type || 'default'})</a></div>
                                {/each}
                            {/if}

                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <div class="tiles">

        {#each props as prop}
            {#if prop.source}

                <PropertyTile property={prop} on:open={() => openTile(prop)} />

            {/if}
        {/each}
        <div class="tile">
            <button class="button --large" on:click={() => ui.emit('modal.healthForm')}>
                {$t('app.profile.edit-health-profile')}
            </button>
        </div>
    </div>

    <h3 class="h3 heading">{ $t('app.headings.documents') }</h3>
    <Documents user={$profile.id} />

    <!--ul>
        <li>Latest Lab results document + charts</li>
        <li>Medical History
            <ul>
                <li>Latest prescriptions</li>
                <li>Latest appointments</li>
                <li>Latest messages</li>
                <li>Latest reports</li>  
            </ul>
        </li>
    </ul-->

{/if}

</div>

<style>
    .profile-header {
        display: grid;
        grid-template-columns: 10rem 1fr;
        margin-bottom: var(--gap);
        background-color: var(--color-gray-300);
        padding: 1rem;
        grid-gap: 1rem;
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



    

    .avatar {
        width: 10rem;
        height: 10rem;

        display: flex;
        justify-content: center;
        align-items: center;
    }

  
    @media screen and (max-width: 800px) {
        .profile-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .profile-header > * {
            width: 100%;
        }
    }   

    
    .tiles {
        grid-template-rows: auto;
    }
    .tile:last-child {
        grid-column: auto / -1; 
        --background-color: var(--color-highlight);
        padding: 1rem;
    }
    .tile:last-child:first-child {
        grid-column: 1 / -1;
    }
    button.tile:hover {
        --background-color: var(--color-white);

    }
</style>