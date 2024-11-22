<script lang="ts">
    import { profiles,  } from '$lib/med/profiles';
    import {  findInProfiles, normalizePatientData } from '$lib/med/profiles/tools';
    import { capitalizeFirstLetters } from '$lib/strings';
    import { t } from '$lib/i18n';
    import Modal from '$components/ui/Modal.svelte';
    import type { Profile } from '$lib/med/types.d';
    import ProfileImage from '$components/profile/ProfileImage.svelte';
    import { onMount } from 'svelte';
    import { normalizeName } from '$lib/med/profiles/tools';
    import type { DetectedProfileData } from '$lib/import'
    import { scale } from 'svelte/transition';

    export let contact: DetectedProfileData;

    export let linkFrom: 'top' | 'bottom' = 'top';

    let profilesFound = (contact) ? findInProfiles(contact) : []; 

    export let selected: Profile = profilesFound.length > 0 ? profilesFound[0] :  normalizePatientData(contact); 

    let showSelectProfileModal: boolean = false;

    function selectProfile(profile: Profile) {
        selected = profile;
        showSelectProfileModal = false;
    }   
    onMount(() => {
        selected = profilesFound.length > 0 ? profilesFound[0] : normalizePatientData(contact);
    });
</script>

<button 
class="button selected-profile link-{linkFrom}" 
    class:-new={selected.id == 'NEW'}
    on:click={() => showSelectProfileModal = true}
    transition:scale={{delay: 1000}}
    >
    {selected.fullName} {#if selected.insurance?.number}({selected.insurance.number}){/if}
</button>

{#if showSelectProfileModal}
<Modal on:close={() => showSelectProfileModal = false}>
    <ul class="list">
        {#if profilesFound.length == 0}
        
            <li><button value="NEW" class:-selected={selected.id == 'NEW'}>
                {capitalizeFirstLetters(contact.name)} - {$t('app.profiles.add')}
            </button></li>
        {/if}
        {#each $profiles as profile}
            <li><button 
                on:click={() => selectProfile(profile)}  
                class:-selected={(selected.id == profile.id)}>
                    <ProfileImage {profile} />
                
                    {profile.fullName} {#if profile.insurance?.number}({profile.insurance.number}){/if}
            
                </button></li>
        {/each}
    </ul>
    
</Modal>
{/if}


<style>
    .selected-profile {
        position: relative;
        width: calc(100% - .4rem);
        margin: .2rem;
        --color-border:  var(--button-border-color);
        border-color: var(--color-border);
    }
    .selected-profile:hover {
        --color-border: var(--button-border-color-hover);
    }
    .selected-profile.-new {
        --color-border: var(--color-green);
    }
    .selected-profile:before {
        position: absolute;
        content: '';
        left: 50%;
        top: -1rem;
        transform: translate(-50%, 0);
        width: 1px;
        height: 1rem;

        background-color: var(--color-border);
        z-index: -1;
    }

    .selected-profile:hover:before {
    }

    .link-top {
        margin-top: 1rem;
    }
    .link-top:after {
        top: -1rem;
    }

    .list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .list li {
        margin: 0 0 var(--gap) 0;
        padding: 0;
    }
    .list button {
        width: 100%;
        text-align: left;
        padding: 0.5rem;
        border: none;
        background-color: var(--background);
    }
    .list button.-selected {
        background-color: var(--color-white);
    }
</style>