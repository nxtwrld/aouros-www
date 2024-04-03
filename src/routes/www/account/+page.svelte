<script lang="ts">
    import { enhance } from '$app/forms';

    /** @type {import('./$types.d').PageData} */
	export let data;

    /** @type {import('./$types.d').ActionData} */
    export let form;


    let role: string;
</script>


<div class="theme1">
</div>
<!-- sign up form with email  field and a dropdown -->
<div class="page">

    <h1>Sign Up</h1>

    {#if form?.success}
	    <!-- this message is ephemeral; it exists because the page was rendered in
		   response to a form submission. it will vanish if the user reloads -->
	    <p>We have recorded your request, {form.email}. We will get back to you as soon as we are ready to extend our beta program.</p>
    {:else if form?.error}
             <p>{form?.error}</p>
    {:else}


    <form  method="POST" action="?/signup" use:enhance>
        <div class="field">
            <label for="email">Email</label>
            <input type="email" name="email" id="email" placeholder="Enter your email address" required>
        </div>

        <div class="field">
            <label for="role">Role</label>
            <select name="role" id="role" bind:value={role}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="researcher">Researcher</option>
                <option value="partner">Integration Partner</option>
            </select>
        </div>


        {#if ['researcher', 'partner'].includes(role)}
        <div class="field">
            <textarea name="usecase" id="usecase" placeholder="Tell us more about your use case"></textarea>
        </div>
        {/if}

        <button class="button" type="submit">Sign Up</button>
    </form>
    {/if}
</div>


<style>

    .page {
        max-width: 500px;
    }

    .field {
        margin-bottom: 1rem;
    }

    .field label {
        display: block;
        font-size: 1.25rem;
        margin-bottom: .5rem;

    }
    .field input,
    .field textarea,
    .field select {
        border: 0;
        border-bottom: 1px solid var(--color-primary-dark);;
        background-color: transparent;
        color: var(--color-primary-dark);
        font-size: 1.25rem;
        padding: .5rem 0;
        width: 100%;

    }


    .theme1 {
        height: 30vh;
        background-image: url('/theme1.jpg');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        text-align: center;
        position: relative;
    }





</style>