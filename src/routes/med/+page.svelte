
<script lang="ts">
    import user from '$lib/user';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

  /*  $: {
        if ($user && $user.subscription == 'individual') {
            goto('/med/p/'+$user.id);
        }
    }
*/
    onMount(() => {
        if ($user && $user.subscription == 'individual') {
            goto('/med/p/'+$user.id);
        }
    });

    </script>

<h1 class="h1">Omphilos - Electronic Health Records</h1>

<p>Omphilos is an medical assistant app, that listens through your medical sessions, provides insights and potential treatment recommendation. It quickly recognizes possible treatment conflicts from historical medical records. Once the session is over Omphilos can be use to generate and customize final report, prescriptions and recommendations.</p>

