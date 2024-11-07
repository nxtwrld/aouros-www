<script lang="ts">
    import { type Profile, SexEnum } from '$slib/med/types.d';
    import { profile } from '$slib/med/profiles';
    import profiles from '$slib/med/profiles/profiles';
    import Profiles  from '$scomponents/profile/Profiles.svelte';

    profile.set(null);
    export let data: {
        profiles: Profile[]
    }
    profiles.set(data.profiles);
    
</script>
<div class="p-page -scroll">
    <div class="p-title">
        <h3 class="h3">Profiles</h3>
    </div>

    <Profiles {profiles} />

</div>

<style>


</style>