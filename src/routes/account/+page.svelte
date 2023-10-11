<script lang="ts">
    import { enhance } from '$app/forms';

    /** @type {import('./$types').PageData} */
	export let data;

    /** @type {import('./$types').ActionData} */
    export let form;


    let role: string;
</script>


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
        <label for="email">Email</label>
        <input type="email" name="email" id="email" placeholder="Enter your email address" required>

        <label for="role">Role</label>
        <select name="role" id="role" bind:value={role}>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="researcher">Researcher</option>
            <option value="partner">Integration Partner</option>
        </select>

        {#if ['researcher', 'partner'].includes(role)}
        <textarea name="usecase" id="usecase" placeholder="Tell us more about your use case"></textarea>
        {/if}

        <button type="submit">Sign Up</button>
    </form>
    {/if}
</div>