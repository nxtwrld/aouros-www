<script lang="ts">
    import { type Profile } from '$lib/med/types.d';
    import ScreenOverlay from '$components/ui/ScreenOverlay.svelte';
    import ProfileImage from '$components/profile/ProfileImage.svelte';
    import ProfileEdit from '$components/profile/ProfileEdit.svelte';
    import { scale } from 'svelte/transition';
    
    export let profile: Profile;

    export let initialProfile: Profile = structuredClone(profile);

    $: isNewProfile = !('id' in profile);
    let showProfile: boolean = false;


    function reset() {
        profile = structuredClone(initialProfile);
        showProfile = false;
    }
    function done() {
        showProfile = false;
    }
</script>


<button class="profile" class:-new={isNewProfile} on:click={() => showProfile = true}  transition:scale>
    <div class="avatar">
        <ProfileImage profile={('id' in profile) ? profile: null} />
    </div>

    <div class="name">{profile.fullName}</div>
    
    {#if profile.insurance?.number}<div class="insurance">({profile.insurance.number})</div>{/if}

    {#if isNewProfile}
        <div class="status">New</div>
    {/if}
</button>


{#if showProfile}
    <ScreenOverlay  on:close={done}>
        
        <div slot="heading" class="heading">
            <h3 class="h3 heading">{isNewProfile ? 'New Profile' : 'Profile'} - {profile.fullName}</h3>
            <div class="actions">
                <button class="-danger" on:click={reset}>
                    Reset
                </button>
                <button class="-primary" on:click={done}>
                    Done
                </button>
            </div>
        </div>
        <div class="page -empty">
            <ProfileEdit bind:profile={profile} />
        </div>
    </ScreenOverlay>
{/if}


<style>
    .profile {
        position: relative;
        display: flex;
        align-items: center;
        flex-direction: column;
        padding: 1rem;
        background-color: var(--color-background);
        border: var(--border-width) solid var(--color-background);
        border-radius: var(--radius);
        height: var(--tile-height);
    }

    .profile.-new {
        border-color: var(--color-green);
    }


    .profile .name {
        font-size: 0.9rem;
        font-weight: bold;
        margin-top: 1rem;
    }

    .profile .insurance {
        font-size: 0.8rem;
    }

    .profile .status {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 1rem;
        right: -.8rem;
        padding: .3rem .5rem;
        text-align: center;
        font-size: 1rem;
        font-weight: bold;
        border-radius: var(--radius);
    }

    .profile.-new .status {
        background-color: var(--color-positive);
        color: var(--color-positive-text);
    }





</style>