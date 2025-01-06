<script lang="ts">
    
    import { type Profile, SexEnum } from "$lib/types.d";
    import user from "$lib/user";

    //console.log("user", $user);

    let newProfile: Profile = {
        id: "NEW",
        fullName: "",
        sex: SexEnum.male,
        birthdate: new Date(),
        location: "",
        phone: "",
        email: ""
    }

    async function createNewProfile() {
        /*
        const res = await fetch("/api/med/p/newpatient", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newPatient),
        });
        if (res.ok) {
            const patient = await res.json();
            patient.set(patient);
        }*/
    }

</script>

<div class="page">
    <h1 class="h1">Add new profile</h1>
    {#if $user.subscriptionStats.profiles == 0}
        <p class="p">You have reached the maximum number of profiles.</p>
        <a href="/med/upgrade" class="button -primary -large">Upgrade</a>
    {:else}
        <p class="p">You can add {$user?.subscriptionStats?.profiles} more profiles.</p>


        <input type="text" bind:value={newProfile.fullName} on:click={createNewProfile} />
        <button>Create</button>
    {/if}
</div>