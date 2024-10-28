<script lang="ts">
    import { type Patient, SexEnum } from '$slib/med/types.d';
    import { patient } from '$slib/med/patients';
    import Patients from '$scomponents/Patients.svelte';

    patient.set(null);
    export let data: {
        patients: Patient[];
    }
    const patients = data.patients;
</script>
<div class="p-page -scroll">
    <div class="p-title">
        <h3 class="h3">Patients</h3>
    </div>

    <Patients {patients} />

</div>

<style>


</style>