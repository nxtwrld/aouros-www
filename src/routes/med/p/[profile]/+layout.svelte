<script lang="ts">
    import { profile } from '$lib/profiles';
    import { onDestroy } from 'svelte';

    onDestroy(() => {
        profile.set(null);
    });
</script>

<slot/>