<script lang="ts">

    import InsuranceForm from "./InsuranceForm.svelte";
    import VCardFrom from "./VCardFrom.svelte";
    import HealthForm from "./HealthForm.svelte";

    export let profile;


</script>


<div class="profile-edit">

<InsuranceForm bind:data={profile.insurance} />
<VCardFrom bind:data={profile.vCard} />
<HealthForm bind:data={profile.health} />

</div>

<style>


    .profile-edit :global(.tab-body) {
        padding: 1rem;
        background-color: var(--color-background);
    }

</style>