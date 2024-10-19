<script lang="ts">
    import state from "$slib/med/headerState";
    import { page } from "$app/stores";


    function isActive(path: string, currentPath: string) {
        console.log(path, $page.url.pathname, $page.url.pathname.startsWith(path));
        return currentPath.startsWith(path);
    }
</script>

<header>
    <nav class="toolbar">
        <a href="/med/p/">Omphilos</a>
        <a href="/med/p/" class:-active={$page.url.pathname == '/med/p/'}>Patients</a>
        {#if $state.profile}



                {#if $state.profile.uid}
                    <a class="profile" href="/med/p/{$state.profile.uid}" class:-active={isActive('/med/p/' +$state.profile.uid , $page.url.pathname)}>{$state.profile.name}</a>
                    <!--div class="spacer"></div-->
                    <a href="/med/p/{$state.profile.uid}/history" class:-active={isActive('/med/p/' +$state.profile.uid + '/history/', $page.url.pathname)}>History</a>
                    <a href="/med/p/{$state.profile.uid}/session" class:-active={isActive('/med/p/' +$state.profile.uid + '/session/', $page.url.pathname)}>New Session</a>
                {:else}
                    <div class="profile" class:-active={$page.url.pathname == '/med/p/newpatient/'}>{$state.profile.name}</div>
                    <div class="spacer"></div>
                {/if}
        {:else}
            <div class="spacer"></div>
            <a href="/med/p/newpatient/">Create new patient</a>
        {/if}
</nav>
</header>

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
