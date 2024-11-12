<!-- src/routes/account/Avatar.svelte -->
<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte'

	export let size = 10;
	export let url: string;
	export let id: string;
	export let editable: boolean = false;
	//export let supabase: SupabaseClient

	let avatarUrl: string | null = null
	let uploading = false
	let files: FileList
	let loaded: boolean = false;

	const dispatch = createEventDispatcher()

	const downloadImage = async (path: string) => {
		try {

			const data = await fetch(`/v1/med/profiles/${id}/avatar?path=${path}`).then((res) => res.blob())

			// blob data to base64
			const reader = new FileReader();
			reader.readAsDataURL(data);
			reader.onloadend = function() {
				const base64data = reader.result;
				avatarUrl = base64data as string;
			}
		} catch (error) {
			console.log('Error downloading image: ', error)
		}
	}

	const uploadAvatar = async () => {
		try {
			uploading = true

			if (!files || files.length === 0) {
				throw new Error('You must select an image to upload.')
			}

			const file = files[0]
			const fileExt = file.name.split('.').pop()
			const filenameNew = `${Math.random()}.${fileExt}`

			const base64 = await toBase64(file)

			const { filename } = await fetch(`/v1/med/profiles/${id}/avatar`, {
				method: 'POST',
				body: JSON.stringify({ file: base64, filename: filenameNew, type: file.type }),
			})
			.then((res) => res.json())
			.catch((error) => {
				console.log('error', error)
			})
			/*
			const { error } = await supabase.storage.from('avatars').upload(filePath, file)

			if (error) {
				throw error
			}*/
			url = filename;
			setTimeout(() => {
				dispatch('upload')
			}, 100)
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message)
			}
		} finally {
			uploading = false
		}
	}
	async function toBase64(file: File) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result);
			reader.onerror = reject;
		});
	}

	$: if (loaded && url) downloadImage(url)

	onMount(() => {
		loaded = true;
	})
</script>

<div class="container">
	{#if avatarUrl}
		<img
			src={avatarUrl}
			alt={avatarUrl ? 'Avatar' : 'No image'}
			class="avatar image"
			style="height: {size}em; width: {size}em;"
		/>
	{:else}
		<div class="avatar no-image" style="height: {size}em; width: {size}em;">
			<svg>
				<use href="/icons.svg#user" />
			</svg>
		</div>
	{/if}
	{#if editable}
	<input type="hidden" name="avatarUrl" value={url} />

	<div class="upload" style="width: {size}em;">
		<label class="button primary block" for="single">
			{uploading ? 'Uploading ...' : 'Upload'}
		</label>
		<input
			style="visibility: hidden; position:absolute;"
			type="file"
			id="single"
			accept="image/*"
            class="button"
			bind:files
			on:change={uploadAvatar}
			disabled={uploading}
		/>
	</div>
	{/if}
</div>


<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		width: 100%;
		height: 100%;
	}
	.avatar {
		border-radius: 50%;
		width: 100%;
		height: 100%;
	}

	.avatar svg {
		width: 100%;
		height: 100%;
		padding: 1rem;
		fill: var(--color-gray-300);
	}

	.no-image {
		background-color: var(--color-gray-500);
	}

	.upload {
		position: absolute;
		margin-top: 1em;
		bottom: .2rem;
		left: 50%;
		transform: translatex(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>