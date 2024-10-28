<script lang="ts">
    
    import { type Patient, SexEnum } from "$slib/med/types.d";
    import { patient } from "$slib/med/patients";
    let newPatient: Patient = {
        uid: "NEW",
        name: "",
        sex: SexEnum.male,
        birthdate: new Date(),
        location: "",
        phone: "",
        email: ""
    }

    async function createNewPatient() {
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
        }
    }

</script>

Create new patient


<input type="text" bind:value={newPatient.name} on:click={createNewPatient} />
<button>Create</button>