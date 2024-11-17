<script lang="ts">
    import { type Profile } from '$lib/med/types.d';

    export let profile: Profile | null = null;
    
    export let size = 3;
</script>

<div class="avatar " style="height: {size}em; width: {size}em;">
{#if profile && profile.avatarUrl}
    <img src={`/v1/med/profiles/${profile.id}/avatar?path=${profile.avatarUrl}`} alt="Photo of {profile.fullName}" class="profile-image" />
{:else}
    <svg>
        <use href="/icons.svg#user" />
    </svg>

{/if}
</div>



<style>
    .avatar {
        border-radius: 50%;
        width: 100%;
        height: 100%;
        background-color: var(--color-gray-300);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .avatar img {
        border-radius: 50%;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .avatar svg {
        width: 100%;
        height: 100%;
        margin: 10%;
        fill: var(--color-gray-500);
    }
</style>