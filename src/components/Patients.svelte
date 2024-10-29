<script lang="ts">
    import { type Patient } from '$slib/med/types.d';
    import { patient } from '$slib/med/patients';
    import { getAge } from '$slib/med/datetime';
    import { goto } from '$app/navigation';
    export let patients: Patient[];

    const ROOT_PATH = '/med/p/';

</script>
<table class="table-list">
    <tr>
        <th>Name</th>
        <th>Age</th>
        <th>Brith date</th>
        <th>Phone</th>
    </tr>
{#each patients as patient}
    <tr class="table-row -click" on:click={() => goto(ROOT_PATH + patient.uid)}>
        <td class="title">{patient.name}</td>
        <td class="age">{getAge(patient.birthdate)}</td>
        <td class="dob">{patient.birthdate}</td>
        <td class="tel">
            {#if patient.tel?.[0]?.value}
            <a href="tel:{patient.tel?.[0]?.value}" on:click|stopPropagation>{patient.tel?.[0]?.value}</a>
            {/if}
        </td>
    </tr>
{/each}
</table>


<style> 

    .table-list {
        width: 100%;
        border-collapse: collapse;
        --color-border: var(--color-gray-500);  
    }
    .table-list tr.-click > * {
        cursor: pointer;
    }

    .table-list th,
    .table-list td {
        text-align: left;
        padding: 1rem;
        border-bottom: .1rem solid var(--color-border);
    }

    .table-list th {
        background-color: var(--color-highlight);
        color: var(--color-highlight-text);
        font-weight: 800;
    }
    .table-list tr:nth-child(even) td {
        background-color: var(--color-gray-400);
    }
    .table-list tr:hover {
        position: relative;
        box-shadow: 0 .1rem .2rem var(--color-border);
        z-index: 10;
    }
    .table-list tr:hover td {
        background-color: var(--color-white);
    }

    .table-list .title {
        width: 50%;
    }
    .table-list .age {
        width: 5rem;
    }
</style>