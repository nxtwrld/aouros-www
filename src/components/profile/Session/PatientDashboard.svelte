<script lang="ts">
    import { profile} from '$slib/med/profiles';
    import { getAge } from '$slib/med/datetime';
    import ValueTile from '../ValueTile.svelte';


    $: values = ($profile) ?[
        {
            title: 'Age',
            value: getAge($profile.birthDate)
        },
        {
            title: 'Blood Type',
            value: $profile?.health?.bloodType
        },
        {
            title: 'Sex',
            value: $profile?.health?.sex
        }
    ] : []

    console.log($profile)
</script>

{#if $profile}
<div class="page">
<div class="patient-header">
<h1 class="h1">{$profile.fullName}</h1>
<address>{$profile.location}</address>
<div>{$profile.birthDate}</div>
<div>{$profile.vcard?.email?.[0].value}</div>
<div>{$profile.vcard?.tel?.[0].value}</div>
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
{/if}
<style>

    div.tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
    }
</style>