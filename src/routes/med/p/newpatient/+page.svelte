<script lang="ts">
    import { setProfile } from "$slib/med/headerState";
    import { type Profile, SexEnum } from "$slib/med/types.d";

    let profile: Profile = {
        name: "",


    }

    $: {
        setProfile(profile);
    }

</script>

Create new patient


<input type="text" bind:value={profile.name} />