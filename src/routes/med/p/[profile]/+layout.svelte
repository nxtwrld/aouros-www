<script lang="ts">
    import { type Profile } from '$slib/med/types.d';
    import { setProfile} from '$slib/med/headerState';

    export let data: {
        profile
    }

    setProfile(data.profile);
    const profile: Profile = data.profile;
</script>


<slot />
