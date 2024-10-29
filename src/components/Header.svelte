<script lang="ts">
    import { patient } from "$slib/med/patients";
    import { page } from "$app/stores";
    import { emit } from "$slib/shortcuts";
    import user from "$slib/user";
    import doctor from "$slib/med/doctor";


    function isActive(path: string, currentPath: string) {
        return currentPath.startsWith(path);
    }
    import Search from "./Search.svelte";
    import { goto } from "$app/navigation";


    async function logout () {
        const r = await user.logout();
        goto('/auth?redirect=/med');
    }
</script>

<header>
    <nav class="toolbar">
        <a href="/med/p/" class="icon logo">
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
                        <h3 class="h3">{$doctor.fn}</h3>
                        <p>{$doctor.specialty?.join(',')}</p>
                        <p>{$user.email}</p>

                    </div>
                </li>
                <li><button class="user-menu" on:click={logout}>Logout</button></li>
            </ul>
        </div>
        {/if}
        <a href="/med/p/" class:-active={$page.url.pathname == '/med/p/'}>Patients</a>
        {#if $patient}



                {#if $patient.uid}
                    <a class="profile" href="/med/p/{$patient.uid}" class:-active={isActive('/med/p/' +$patient.uid , $page.url.pathname)}>{$patient.name}</a>
                    <!--div class="spacer"></div-->
                    <a href="/med/p/{$patient.uid}/history" class:-active={isActive('/med/p/' +$patient.uid + '/history/', $page.url.pathname)}>History</a>
                    <a href="/med/p/{$patient.uid}/session" class:-active={isActive('/med/p/' +$patient.uid + '/session/', $page.url.pathname)}>New Session</a>
                {:else}
                    <div class="profile" class:-active={$page.url.pathname == '/med/p/newpatient/'}>{$patient.name}</div>
                    <div class="spacer"></div>
                {/if}
        {:else}
            <div class="spacer"></div>
            <a href="/med/p/newpatient/">Create new patient</a>
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
</style>
