
<script lang="ts">
    import user from '$lib/user';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import ui from '$lib/ui';

  /*  $: {
        if ($user && $user.subscription == 'individual') {
            goto('/med/p/'+$user.id);
        }
    }
*/
    onMount(() => {
        if ($user && $user.id && 'subscription' in $user && $user.subscription == 'individual') {
            goto('/med/p/'+$user.id);
        } else {
            goto('/med/p');
        }
    });

    </script>

<h1 class="h1">Mediqom - Electronic Health Records</h1>

<p>Mediqom helps you with your medical reports management. Just scan you medical report and Mediqom will help you understand it:</p>

<button class="a" onclick={()=> ui.emit('overlay.import')}>Import files</button>

