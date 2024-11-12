<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
	import Avatar from './Avatar.svelte';
    import { onMount } from 'svelte';
    import Languages, { type LanguageType } from '$slib/languages';
    import user from '$slib/user';


    export let supabase: SupabaseClient;
    export let ready: boolean = false;
    export let data: {
        bio: {
            email: string;
            fullName: string;
            avatarUrl: string;
            language: LanguageType;
        }
    }
    export let profileForm: HTMLFormElement;

    $: {

        if (data.bio.fullName && data.bio.fullName?.trim() != '') {
            ready = true;
        }
     }

     onMount(() => {
        // load browser language and set it as default if available
        if (Languages[navigator.language as LanguageType]) {
            data.bio.language = navigator.language as LanguageType;
        } else {
            const lang = navigator.language.split('-')[0];
            if (Languages[lang as LanguageType]) {
                data.bio.language = lang as LanguageType;
            }
        }
     })
</script>


<div class="flex -center">
    <Avatar
    bind:url={data.bio.avatarUrl}
    id={$user?.id}
    size={10}
    editable={true}
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
    <label for="avatar">Language</label>
    <select id="language" name="language" bind:value={data.bio.language}>
        <option value="en">English</option>
        <option value="cs">Čeština</option>
        <option value="de">Deutsch</option>
    </select>
</div>
