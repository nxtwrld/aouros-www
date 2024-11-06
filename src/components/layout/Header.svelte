<script lang="ts">
    import { profile } from "$slib/med/profiles";
    import { page } from "$app/stores";
    import { emit } from "$slib/shortcuts";
    import user from "$slib/user";
    import Search from "./Search.svelte";
    import { goto } from "$app/navigation";



    function isActive(path: string, currentPath: string) {
        return currentPath.startsWith(path);
    }

    async function logout () {
        const r = await user.logout();
        goto('/auth?redirect=/med');
    }
</script>

<header>
    <nav class="toolbar">
        <a href="/med" class="icon logo">
            <svg>
                <use href="/logo.svg#icon"></use>
            </svg>
        </a>
        {#if $user}
        <div class="menu icon">
            <button><svg>
                <use href="/icons.svg#doctor"></use>
                </svg>
            </button>
            <ul class="menu">
                <li>
                    <div class="user">
                        <h3 class="h3">{$user.fullName}</h3>

                    </div>
                </li>
                <li><button class="user-menu" on:click={logout}>Logout</button></li>
            </ul>
        </div>
        {/if}
        {#if $user.subscription != 'individual'}
            <a href="/med/p/" class:-active={$page.url.pathname == '/med/p/'}>Profiles</a>
        {/if}
        {#if $profile}



                {#if $profile.id}
                    <a class="profile" href="/med/p/{$profile.id}" class:-active={isActive('/med/p/' +$profile.id , $page.url.pathname)}>{$profile.fullName}</a>
                    <!--div class="spacer"></div-->
                    <a href="/med/p/{$profile.id}/documents" class:-active={isActive('/med/p/' +$profile.id + '/documents/', $page.url.pathname)}>Documents</a>
                    <a href="/med/p/{$profile.id}/history" class:-active={isActive('/med/p/' +$profile.id + '/history/', $page.url.pathname)}>History</a>
                    {#if $user.isMedical}
                    <a href="/med/p/{$profile.id}/session" class:-active={isActive('/med/p/' +$profile.id + '/session/', $page.url.pathname)}>New Session</a>
                    {/if}
                {:else}
                    <div class="profile" class:-active={$page.url.pathname == '/med/p/newpatient/'}>{$profile.name}</div>
                    <div class="spacer"></div>
                {/if}
        {:else}
            <div class="spacer"></div>
            {#if $user.subscription != 'individual'}
            <a href="/med/p/newpatient/">Add profile</a>
            {/if}
        {/if}
        <button on:click={() => emit('find')} class="icon"><svg >
            <use href="/icons.svg#search"></use>
        </svg></button>
</nav>
</header>
<Search />
<style>
    header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: var(--toolbar-height);
        background-color: var(--background);
        z-index: 1000;
    }

    .icon {
        width: var(--toolbar-height);
        padding: .5rem;
    }
    .icon.logo {
        padding: 0;
    }

    .icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
        color: var(--color-black);
    }


    .profile.-active {
        color: var(--color-black);
        font-weight: bold;
        flex-grow: 1;
        border-color: var(--button-color);
        border-bottom-width: 2px;
    }
/*
    .toolbar *:first-child {

        border-top-left-radius: var(--radius);
        border-bottom-left-radius: var(--radius);
        padding-left: calc(var(--radius) / 1.5);
    }
    .toolbar *:last-child {
        border-top-right-radius: var(--radius);
        border-bottom-right-radius: var(--radius);
        padding-right: calc(var(--radius) / 1.5);
    }
*/

    .menu {
        position: relative;
    }
    .menu button {
        background-color: transparent;
        border: none;
        padding: 0;
        margin: 0;
    }
    .menu > ul.menu {
        position: absolute;
        top: calc(100% + var(--gap));
        left: 0;
        max-height: 0;
        min-width: 10rem;
        background-color: var(--color-gray-500);
        border-radius: var(--radius);
        box-shadow: 0 1rem 1rem -.5rem var(--color-gray-800);
        transition: max-height .5s;
        overflow: hidden;
    }
    .menu:hover {
        background-color: var(--color-white);
    }
    .menu:hover > ul.menu {
        max-height: 100vh;
    }
    .menu > ul.menu li {
    
        margin-top: var(--gap);
    }

    .menu > ul.menu li button {
        background-color: var(--color-gray-300);
        border: none;
        padding: .5rem;
        width: 100%;
        margin: 0;
        text-align: left;
    }
    .menu > ul.menu li button:hover {
        background-color: var(--color-white);
    }


    .user {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        padding: .5rem;
    }
    .user .h3 {
        white-space: nowrap;
    }
</style>
