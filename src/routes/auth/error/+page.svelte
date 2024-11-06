<script lang="ts">
    import { onMount } from "svelte";

    let redirect: string = '/';

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        const r = params.get('redirect');
        if (r) {
            redirect = decodeURIComponent(r);
        }
    });

</script>

<div class="form modal">

    <div class="form-instructions -error">
        <p>Login error</p>
    </div>

    <div class="form-actions">
        <a href="/auth?redirect={redirect}" class="button">Try again</a>
    </div>

</div>