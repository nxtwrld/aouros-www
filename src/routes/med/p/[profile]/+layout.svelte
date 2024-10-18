<script lang="ts">
    import { type Profile } from '$slib/med/types.d';
    import { setProfile} from '$slib/med/headerState';

    export let data: {
        profile
    }

    setProfile(data.profile);
    const profile: Profile = data.profile;
</script>

<div class="page-patient">
    <slot />
</div>

<style>
    .page-patient {
        padding: var(--toolbar-height) .5rem;
        height: 100vh;
    }
</style>