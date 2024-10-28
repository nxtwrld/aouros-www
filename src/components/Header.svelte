<script lang="ts">
    import { patient } from "$slib/med/patients";
    import { page } from "$app/stores";
    import { emit } from "$slib/shortcuts";

    function isActive(path: string, currentPath: string) {
        return currentPath.startsWith(path);
    }
    import Search from "./Search.svelte";
</script>

<header>
    <nav class="toolbar">
        <a href="/med/p/" class="icon logo">
            <svg>
                <use href="/logo.svg#icon"></use>
            </svg>
        </a>
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
</style>
