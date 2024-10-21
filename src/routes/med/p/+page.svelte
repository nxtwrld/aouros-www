<script lang="ts">
    import { type Profile, SexEnum } from '$slib/med/types.d';
    import { patient } from '$slib/med/patients';
    
    patient.set(null);
    export let data: {
        profiles: Profile[];
    }
    const profiles = data.profiles;
</script>

Profiles
<ul>
{#each profiles as profile}
    <li><a href="{profile.uid}">{profile.name}</a></li>
{/each}
</ul>