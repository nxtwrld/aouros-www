<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, SubmitFunction } from './$types.js'

	export let form: ActionData;

	let loading: boolean = false;

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			update()
			loading = false;
		}
	}

	function resetForm() {
		form = {};
	}
</script>

<svelte:head>
	<title>Authentication</title>
</svelte:head>

<form class="flex -column form modal" method="POST" use:enhance={handleSubmit}>
		<img src="/icon.svg" alt="Aouros app" class="logo" />

		<h1 class="h1">Authentication</h1>
		{#if form?.success}
		<div class="success">
			<p class="form-instructions -success">{form?.message}</p>
			<div class="form-actions">
				<button class="button -block" on:click={resetForm}>Send again</button>
			</div>
		</div>
		{:else}
			<p class="form-instructions">Sign in via magic link with your email below</p>

			{#if form?.message !== undefined}
			<div class="{form?.success ? '' : 'fail'}">
				<p class="form-instructions -error">{form?.message}</p>
			</div>
			{/if}


			<div class="input">
				<label for="email">Email address</label>
				<input
					id="email"
					name="email"
					class="inputField"
					type="email"
					placeholder="Your email"
					value={form?.email ?? ''}
				/>
			</div>
			{#if form?.errors?.email}
			<span class="flex items-center text-sm error">
				{form?.errors?.email}
			</span>
			{/if}
			<div class="form-actions">
				<button class="button -primary -block" disabled={loading}>
					{ loading ? 'Loading' : 'Send magic link' }
				</button>
			</div>
		{/if}
</form>


<style>

	.logo {
		width: 8rem;
		margin: 0 auto;
		display: block;
	}
	.form {
		
	}




</style>