<script lang="ts">
    
    import { type Patient, SexEnum } from "$slib/med/types.d";
    import { profile } from "$slib/med/profiles";
    let newProfile: Patient = {
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

Create new patient


<input type="text" bind:value={newProfile.fullName} on:click={createNewProfile} />
<button>Create</button>