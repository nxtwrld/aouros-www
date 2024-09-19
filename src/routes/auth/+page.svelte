<script lang="ts">
    import { onMount } from "svelte";


		/** @type {import('./$types').PageData} */
		export let data;

		/** @type {import('./$types').ActionData} */
		export let form;

		let redirect = '/';
		//console.log(data);
		//console.log(form);
		let action =  form?.action || 'login';

		onMount(() => {
			redirect = data?.redirect || new URLSearchParams(location?.search).get('redirect') || '/';
		});
</script>

<h1>Authentication {action}</h1>

{#if form && form.error}
	<p>{form.error}</p>
{/if}

{#if action == 'login'}
<form method="POST" action="?/login&redirect={redirect}">
	<label>
		Email
		<input name="email" type="email" autocomplete="email" />
	</label>
	<label>
		Password
		<input name="password" type="password" autocomplete="current-password" />
	</label>
	<button>Login</button>
	<button on:click={() => action = 'signup'}>Sign up</button>
</form>

{:else if action == 'signup'}


<form method="POST" action="?/signup&redirect={redirect}">
	<label>
		Email
		<input name="email" type="email" autocomplete="email" />
	</label>
	<label>
		Password
		<input name="password" type="password" autocomplete="new-password" />
	</label>
	<label>
		Repeat Password
		<input name="password2" type="password" autocomplete="new-password" />
	</label>
	<button>Sign Up</button>

	<button on:click={() => action = 'login'}>Login</button>
</form>
{/if}