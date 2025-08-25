<script lang="ts">
    import InsuranceForm from "./InsuranceForm.svelte";
    import VCardFrom from "./VCardFrom.svelte";
    import HealthForm from "./HealthForm.svelte";
    import Avatar from "$components/onboarding/Avatar.svelte";

    let { profile = $bindable() } = $props();

    // Don't pre-initialize profile data - let forms handle undefined gracefully
    // Forms should only populate the profile when user actually enters data
</script>


<div class="profile-edit">

    <div class="profile-image-section">
        <h3 class="h3 heading">Profile Image</h3>
        <Avatar id={profile.id} bind:url={profile.avatarUrl} editable={true} />
    </div>

    <InsuranceForm bind:data={profile.insurance} />
    <VCardFrom bind:data={profile.vcard} />
    <HealthForm bind:data={profile.health} />

</div>

<style>
    .profile-image-section {
        margin-bottom: 2rem;
        text-align: center;
    }

    .profile-edit :global(.tab-body) {
        padding: 1rem;
        background-color: var(--color-background);
    }
</style>