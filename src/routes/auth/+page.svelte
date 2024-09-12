<script lang="ts">
		/** @type {import('./$types').PageData} */
		export let data;

		/** @type {import('./$types').ActionData} */
		export let form;

		console.log(data);
		console.log(form);
		let action =  form?.action || 'login';
</script>

<h1>Authentication {action}</h1>

{#if form && form.error}
	<p>{form.error}</p>
{/if}

{#if action == 'login'}
<form method="POST" action="?/login">
	<label>
		Email
		<input name="email" type="email" />
	</label>
	<label>
		Password
		<input name="password" type="password" />
	</label>
	<button>Login</button>
	<button on:click={() => action = 'signup'}>Sign up</button>
</form>

{:else if action == 'signup'}


<form method="POST" action="?/signup">
	<label>
		Email
		<input name="email" type="email" />
	</label>
	<label>
		Password
		<input name="password" type="password" />
	</label>
	<label>
		Repeat Password
		<input name="password2" type="password" />
	</label>
	<button>Sign Up</button>

	<button on:click={() => action = 'login'}>Login</button>
</form>
{/if}