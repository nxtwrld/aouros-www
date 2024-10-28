<script lang="ts">
    import { patient } from '$slib/med/patients';
    import { getAge } from '$slib/med/datetime';
    import ValueTile from '../ValueTile.svelte';


    $: values = [
        {
            title: 'Age',
            value: getAge($patient.birthdate)
        },
        {
            title: 'Blood Type',
            value: $patient.bloodType
        },
        {
            title: 'Sex',
            value: $patient.sex
        }
    ]

    console.log($patient)
</script>

<div class="page">
<div class="patient-header">
<h1 class="h1">{$patient.name}</h1>
<address>{$patient.location}</address>
<div>{$patient.birthdate}</div>
<div>{$patient.email?.[0].value}</div>
<div>{$patient.tel?.[0].value}</div>
</div>

<div class="tiles">

    {#each values as result}
    {#if result.value}
    <div class="tile">
        <ValueTile {result} />
    </div>
    {/if}
    {/each}
</div>

<h1>Dashboard</h1>
<ul>
    <li>Latest Lab results in charts</li>
    <li>Medical History
        <ul>
            <li>Latest prescriptions</li>
            <li>Latest appointments</li>
            <li>Latest messages</li>
            <li>Latest reports</li>  
        </ul>
    </li>
</ul>
</div>

<style>

    div.tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
    }
</style>