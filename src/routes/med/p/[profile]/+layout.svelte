<script lang="ts">
    import { profile } from '$slib/med/profiles';
    import { onDestroy } from 'svelte';

    onDestroy(() => {
        profile.set(null);
    });
</script>

<slot/>