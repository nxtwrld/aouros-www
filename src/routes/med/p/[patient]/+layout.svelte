<script lang="ts">
    import { type Patient } from '$slib/med/types.d';
    import { patient } from '$slib/med/patients';
    export let data: {
        patient: Patient;
    }

    $: patient.set(data.patient);


</script>


<slot />
