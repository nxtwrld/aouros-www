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
            value: ($profile?.health?.bloodPressure) ? $profile?.health?.bloodPressure?.systolic + '/' + $profile?.health?.bloodPressure?.diastolic : undefined,
        }

    ] : []).map(p => {
        return {
            ...(properties[p.key] || {}),
            ...p,

        } as Property;
    })

    $: isHealthSet  = Object.keys($profile?.health || {}).length > 0;
    $: isVcardSet  = Object.keys($profile?.vcard || {}).length > 0;
    $: isInsuranceSet  = Object.keys($profile?.insurance || {}).length > 0;



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
        {#if prop.value}
        <button class="tile" on:click={() => openTile(prop)}>
            <PropertyTile property={prop} />
        </button>
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