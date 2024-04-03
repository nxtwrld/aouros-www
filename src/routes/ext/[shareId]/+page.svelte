<script lang="ts">
    import type { ActionData } from "./$types.d";
    import { sha256 } from "$lib/vault/sha";

    export let data: {
        shareId: string;
    };

    export let form: ActionData;
    
    let password: string;
    let hash: string;

    $: {
        if (password) {
            sha256(password)
            .then((h) => {
                hash = h;
            })
        }

    }



</script>

Share: {data.shareId}.

<!--div>
<h3 class="h3">Do you have an Aouros account?</h3>
<button class="button">Login</button>
</div-->

{#if form?.success}
    <div class="success">
        <h3 class="h3">Success!</h3>
        <p class="p">You can now view the share.</p>
    </div>
{/if}

{#if form?.error}
    <div class="error">
        <h3 class="h3">Error</h3>
        <p class="p">{form.error}</p>
    </div>
{/if}

<div>
    <h3 class="h3">Enter you sharing password:</h3>
    <input type="password" bind:value={password} class="input" />
    <form method="POST">

        <input type="hidden" name="password" value={hash}>
        <button class="button">View Share</button>
    </form>
</div>