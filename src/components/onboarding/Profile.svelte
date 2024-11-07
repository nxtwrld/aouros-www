<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
	import Avatar from './Avatar.svelte';

    enum Languages {
        en = 'en',
        cs = 'cs',
        de = 'de'
    }

    export let supabase: SupabaseClient;
    export let ready: boolean = false;
    export let data: {
        bio: {
            email: string;
            fullName: string;
            birthDate: string;
            avatar: string;
            avatarUrl: string;
            language: Languages;
        }
    }
    export let profileForm: HTMLFormElement;

    $: {

        if (data.bio.fullName && data.bio.fullName?.trim() != '') {
            ready = true;
        }
     }
</script>


<div class="flex -center">
    <Avatar
    {supabase}
    bind:url={data.bio.avatarUrl}
    size={10}
    on:upload={() => {
        profileForm.requestSubmit();
    }}
/>
</div>

<h2 class="h2">Basic Profile (required)</h2>

<div class="input">
    <label for="email">Email</label>
    <input id="email" type="text" bind:value={data.bio.email} disabled />
</div>

<div class="input">
    <label for="fullName">Full Name</label>
    <input id="fullName" name="fullName" type="text" bind:value={data.bio.fullName} required />
</div>

<div class="input">
    <label for="birth_date">Birth date</label>
    <input id="birth_date" name="birth_date" type="date" bind:value={data.bio.birthDate} />
</div>

<div class="input">
    <label for="avatar">Language</label>
    <select id="language" name="language" bind:value={data.bio.language}>
        <option value="en">English</option>
        <option value="cs">Čeština</option>
        <option value="de">Deutsch</option>
    </select>
</div>
