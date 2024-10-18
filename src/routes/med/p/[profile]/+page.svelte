<script lang="ts">
    import { type Profile } from '$slib/med/types.d';

    export let data: {
        profile
    }
    const profile: Profile = data.profile;
</script>
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