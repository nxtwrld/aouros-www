<script lang="ts">
    import { type Profile } from '$slib/med/types.d';
    import { getAge } from '$slib/med/datetime';
    import { goto } from '$app/navigation';
    import { profiles, removeLinkedProfile } from '$slib/med/profiles/';
    import user from '$slib/user';
    
    const ROOT_PATH = '/med/p/';

    function openProfile(profile: Profile) {
        
        if(profile.status == 'approved') goto(ROOT_PATH + profile.id);
    }

    async function deleteUser(id: string) {
        try {
            await removeLinkedProfile(id);
            await profiles.update();
        } catch (e) {
            console.error(e);
        }
    }

</script>
<table class="table-list">
    <tr>
        <th>Name</th>
        <th>Age</th>
        <th>Brith date</th>
        <th>Phone</th>
        <th>Status</th>
        <th></th>
    </tr>
{#each $profiles as profile}
    <tr class="table-row -click -{profile.status}" on:click={() => openProfile(profile)}>
        <td class="title">{profile.fullName}</td>
        <td class="age">{getAge(profile.birthDate)}</td>
        <td class="dob">{profile.birthDate}</td>
        <td class="tel">
            {#if profile.tel?.[0]?.value}
            <a href="tel:{profile.tel?.[0]?.value}" on:click|stopPropagation>{profile.tel?.[0]?.value}</a>
            {/if}
        </td>
        <td>{profile.status}</td>
        <td>
            {#if profile.status == 'approved'}
            <a href={ROOT_PATH + profile.id} class="button">Open</a>
            {/if}
            {#if profile.id != $user.id}
            <button on:click={() => deleteUser(profile.id)} class="button -danger">Delete</button>
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
    .-request td {
        background-color: var(--color-gray-500) !important;
        cursor: not-allowed !important;
    }
    .-denied {
        color: var(--color-negative);
    }
</style>