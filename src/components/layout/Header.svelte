<!-- @migration-task Error while migrating Svelte code: Cannot subscribe to stores that are not declared at the top level of the component
https://svelte.dev/e/store_invalid_scoped_subscription -->
<script lang="ts">
    import { profile, profiles } from "$lib/profiles";
    import { page } from "$app/stores";
    import { emit } from "$lib/shortcuts";
    import user from "$lib/user";
    import Search from "./Search.svelte";
    import { goto } from "$app/navigation";
    import MenuBurger from "$components/ui/MenuBurger.svelte";
    import ui from "$lib/ui";
    import { state as uiState, Overlay } from "$lib/ui";
    import { t } from "$lib/i18n";
    import ProfileImage from "$components/profile/ProfileImage.svelte";
    import type { Profile } from "$lib/types.d";
    import { isOpen as chatIsOpen } from '$lib/chat/store';
    import AudioButton from './AudioButton.svelte';
    import { audioState, sessionState, SessionState, AudioState } from '$lib/session/stores/unified-session-store';
    import { logger } from '$lib/logging/logger';

    function isActive(path: string, currentPath: string) {
        if ($uiState.overlay !== Overlay.none) return false;
        return currentPath.startsWith(path);
    }

    async function logout () {
        const r = await user.logout();
        goto('/auth?redirect=/med');
    }

    enum Menu {
        'user',
        'tools',
        'none'
    }


    let isSearchOpen = $state(false);
    let activeMenu = $state(Menu.none);
    let headerAudioContainer = $state<HTMLDivElement>();
    let centerAudioContainer = $state<HTMLDivElement>();
    
    // Animation state management
    let isAnimatingTransition = $state(false);
    let targetPosition = $state({ x: 0, y: 0, scale: 1 });
    let animationDirection = $state<'to-header' | 'to-center' | null>(null);

    $effect(() => {
        if (isSearchOpen) {
            activeMenu = Menu.none;
        }
    });
    function toggleMenu(menu: Menu) {
        if (activeMenu == menu) {
            activeMenu = Menu.none;
        } else {
            activeMenu = menu;
        }
    }

    // Session state reactive values
    let currentSessionState = $derived($sessionState);
    let audioStateValue = $derived($audioState.state);
    
    // Determine UI visibility based on session state
    let showAudioButton = $derived(
        currentSessionState === SessionState.Ready || 
        currentSessionState === SessionState.Running || 
        currentSessionState === SessionState.Paused
    );
    
    let showAudioButtonInHeader = $derived(
        currentSessionState === SessionState.Running || 
        currentSessionState === SessionState.Paused
    );
    
    let showNewSessionLink = $derived(
        currentSessionState === SessionState.Off || 
        currentSessionState === SessionState.Final
    );

    // Handle smooth transitions when audio state changes
    $effect(() => {
        if (typeof window === 'undefined') return;
        
        const shouldBeInHeader = showAudioButtonInHeader;
        const audioButtonElement = document.querySelector('.audio-button-container');
        
        if (audioButtonElement && headerAudioContainer && centerAudioContainer) {
            const currentlyInHeader = audioButtonElement.parentElement === headerAudioContainer;
            
            if (shouldBeInHeader && !currentlyInHeader && !isAnimatingTransition) {
                // Start animation to header
                animateToHeader();
            } else if (!shouldBeInHeader && currentlyInHeader && !isAnimatingTransition) {
                // Start animation to center
                animateToCenter();
            }
        }
    });

    // Calculate target header position and start animation
    function animateToHeader() {
        if (!headerAudioContainer || !centerAudioContainer) return;
        
        logger.audio.debug('Starting animation to header');
        isAnimatingTransition = true;
        animationDirection = 'to-header';
        
        // Calculate target position
        const headerRect = headerAudioContainer.getBoundingClientRect();
        const centerRect = centerAudioContainer.getBoundingClientRect();
        
        // Calculate transform needed to move center to header position
        const deltaX = headerRect.left + headerRect.width / 2 - (centerRect.left + centerRect.width / 2);
        const deltaY = headerRect.top + headerRect.height / 2 - (centerRect.top + centerRect.height / 2);
        const scale = Math.min(headerRect.width / centerRect.width, headerRect.height / centerRect.height);
        
        targetPosition = { x: deltaX, y: deltaY, scale };
        
        logger.audio.debug('Animation target calculated', { deltaX, deltaY, scale });
    }

    // Start animation back to center
    function animateToCenter() {
        logger.audio.debug('Starting animation to center');
        isAnimatingTransition = true;
        animationDirection = 'to-center';
        
        // Reset to center position
        targetPosition = { x: 0, y: 0, scale: 1 };
    }

    // Handle transition end to swap containers
    function handleTransitionEnd() {
        if (!isAnimatingTransition) return;
        
        logger.audio.debug('Transition ended, swapping containers', { direction: animationDirection });
        
        const audioButtonElement = document.querySelector('.audio-button-container');
        if (!audioButtonElement || !headerAudioContainer || !centerAudioContainer) return;
        
        if (animationDirection === 'to-header') {
            // Move to header container and reset transform
            headerAudioContainer.appendChild(audioButtonElement);
            targetPosition = { x: 0, y: 0, scale: 1 };
        } else if (animationDirection === 'to-center') {
            // Move to center container
            centerAudioContainer.appendChild(audioButtonElement);
        }
        
        // Reset animation state
        isAnimatingTransition = false;
        animationDirection = null;
        
        logger.audio.debug('Container swap completed');
    }

</script>

<svelte:window on:click={() => {
    activeMenu = Menu.none;
}} />

<header>
    <nav class="toolbar">
        <a href="/med" class="icon logo">
            <svg>
                <use href="/logo.svg#icon"></use>
            </svg>
            <h1>{$t('app.name')}</h1>
        </a>
        <div class="navigation-mobile toolbar">
            <div class="spacer"></div>
            <button class="mobile-menu" onclick={(e) => { e.stopPropagation(); toggleMenu(Menu.tools); }}><MenuBurger open={activeMenu == Menu.tools} /></button>
        </div>
        
        <div class="navigation toolbar" class:-open={activeMenu == Menu.tools}>

            
            {#if $user && 'subscription' in $user && $user.subscription != 'individual'}
                <a href="/med/p/" class:-active={$page.url.pathname == '/med/p/'}>{ $t('app.nav.profiles') }</a>
            {/if}

            {#if $profile}
                {#if $profile.id}
                    <a class="profile" href="/med/p/{$profile.id}" class:-active={isActive('/med/p/' +$profile.id , $page.url.pathname)}>
                        {#if $profile.avatarUrl}
                        <div class="icon profile-image">
                            <img src="/v1/med/profiles/{$profile.id}/avatar?path={$profile.avatarUrl}" alt="avatar" />
                        </div>
                        {/if}
                        {$profile.fullName}
                    </a>
                    <!--div class="spacer"></div-->
                    <a href="/med/p/{$profile.id}/documents" class="sub-item" class:-active={isActive('/med/p/' +$profile.id + '/documents/', $page.url.pathname)}>{ $t('app.nav.documents') }</a>
                    <!--a href="/med/p/{$profile.id}/history" class="sub-item" class:-active={isActive('/med/p/' +$profile.id + '/history/', $page.url.pathname)}>{ $t('app.nav.history') }</a-->
                    {#if $user && 'isMedical' in $user && $user.isMedical}
                        {#if showAudioButtonInHeader}
                            <div class="sub-item recording-indicator"
                                 class:listening={audioStateValue === AudioState.Listening}
                                 class:speaking={audioStateValue === AudioState.Speaking}
                                 class:paused={currentSessionState === SessionState.Paused}>
                                <!-- Container for audio button - bind to Svelte property -->
                                <div bind:this={headerAudioContainer} class="audio-button-header-container"></div>
                                <span class="recording-text">
                                    {currentSessionState === SessionState.Paused ? 'Continue' : 'Recording...'}
                                </span>
                            </div>
                        {:else if showNewSessionLink}
                            <a href="/med/p/{$profile.id}/session-moe" class="sub-item" class:-active={isActive('/med/p/' +$profile.id + '/session/', $page.url.pathname)}>{ $t('app.nav.new-session') }</a>
                        {/if}
                    {/if}
                {:else}
                    <div class="profile" class:-active={$page.url.pathname == '/med/p/addprofile/'}>{'fullName' in $profile ? $profile.fullName : 'New Profile'}</div>
                    <div class="spacer"></div>
                {/if}
            {:else}
                <div class="spacer"></div>
                {#if $user && 'subscription' in $user && $user.subscription != 'individual'}
                <a href="/med/p/addprofile/">{ $t('app.nav.add-profile') }</a>
                {/if}
            {/if}
            <!--a href="/med/import" class:-active={$page.url.pathname == '/med/import/'}>Import</a-->
            <button onclick={() => ui.emit('overlay.import')} class:-active={$uiState.overlay == Overlay.import}>{ $t('app.nav.import') }</button>
        </div>
        {#if $user}
        <div class="menu icon user-menu" class:-open={activeMenu == Menu.user}>
            <button onclick={(e) => { e.stopPropagation(); toggleMenu(Menu.user); }}>
              <ProfileImage profile={$user.id ? (() => {
                try {
                  return profiles.get($user.id) as Profile;
                } catch {
                  return null;
                }
              })() : null} size={2} />
            </button>
            <ul class="menu">
                <li>
                    <div class="user">
                        <h3 class="h3">{'fullName' in $user ? $user.fullName : $user.email}</h3>

                    </div>
                </li>
                <li><button onclick={logout}>{ $t('app.nav.logout') }</button></li>
            </ul>
        </div>
        {/if}
        {#if $profile?.id}
        <button onclick={() => ui.emit('chat:toggle')} class="icon" class:-active={$chatIsOpen} aria-label={$chatIsOpen ? $t('app.chat.actions.close') : $t('app.chat.actions.open')} title={$chatIsOpen ? $t('app.chat.actions.close') : $t('app.chat.actions.open')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <use href="/icons.svg#doctor"/>
            </svg>
        </button>
        {/if}
        <button onclick={() => emit('find')} class="icon" aria-label="Search"><svg >
            <use href="/icons.svg#search"></use>
        </svg></button>

</nav>
</header>

<!-- Global center container for AudioButton when on new session page -->
{#if showAudioButton}
    <div bind:this={centerAudioContainer} 
         class="audio-button-center-container" 
         class:visible={!showAudioButtonInHeader}
         class:animating={isAnimatingTransition}
         style="transform: translate({targetPosition.x}px, {targetPosition.y}px) scale({targetPosition.scale})"
         ontransitionend={handleTransitionEnd}>
        <AudioButton language="en" models={['GP']} useRealtime={true} />
    </div>
{/if}

<Search bind:isSearchOpen={isSearchOpen} />
<style>
    header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: var(--toolbar-height);
        background-color: var(--background);
        z-index: 1000;
        --menu-shadow: 0 1rem 1rem -.5rem var(--color-gray-800);
    }

    .icon {
        width: var(--toolbar-height);
        padding: .5rem;
    }
    .icon.logo {
        padding: 0;
    }
    .logo h1 {
        display: none;
    }

    .icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
        color: var(--color-black);
    }
    
    .icon.-active {
        background-color: var(--color-interactivity);
        color: var(--color-white);
        fill: currentColor;
    }
    .icon img {
        position: relative;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
        border: 1px solid var(--color-gray-800);
    }


    .profile {
        flex-grow: 1;
    }
    .profile.-active {
        color: var(--color-black);
        font-weight: bold;
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
        right: 0;
        max-height: 0;
        min-width: 10rem;
        background-color: var(--color-gray-500);
        border-radius: var(--radius);
        box-shadow: var(--menu-shadow);
        transition: max-height .5s;
        overflow: hidden;
    }
    .menu.-open {
        background-color: var(--color-white);
    }
    .menu.-open > ul.menu {
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

    /* Recording indicator styling */
    .recording-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-white);
        color: var(--color-black);
        border-radius: var(--radius);
        font-weight: var(--text-bold);
        z-index: 1001;
    }

    /* Dynamic text colors based on audio state - light haze colors */
    .recording-indicator.listening .recording-text {
        color: var(--color-interactivity); /* Light blue listening color */
        transition: color 0.3s ease;
    }

    .recording-indicator.speaking .recording-text {
        color: var(--color-positive); /* Green speaking color */
        transition: color 0.3s ease;
    }
    
    .recording-indicator.paused .recording-text {
        color: var(--color-gray-700); /* Gray for paused state */
        transition: color 0.3s ease;
    }

    .recording-text {
        font-size: 0.9rem;
        white-space: nowrap;
    }


    /* Container for AudioButton in header */
    .audio-button-header-container {
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* Container for AudioButton in center (new session page) */
    .audio-button-center-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12rem;
        height: 12rem;
        z-index: 1001;
        opacity: 0;
        pointer-events: none;
        /* Only transition opacity and visibility by default */
        transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .audio-button-center-container.visible {
        opacity: 1;
        pointer-events: all;
    }

    /* When animating, transition transform and size */
    .audio-button-center-container.animating {
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Ensure AudioButton inherits container size and animation timing */
    .recording-indicator :global(.audio-button-container) {
        --button-size: 2.5rem;
        --animation-duration: 0.8s; /* Faster animation for smaller header button */
    }

    .audio-button-center-container :global(.audio-button-container) {
        --button-size: 12rem;
        --animation-duration: 2s; /* Standard animation for larger center button */
    }


    .toolbar > .navigation-mobile {
            display: none;
    }

    .mobile-menu {
        padding: .6rem;
    }
    @media screen and (max-width: 768px) {
        .toolbar .navigation-mobile {
            display: flex;
        }
        .toolbar > .navigation {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: stretch;
            position: fixed;
            width: 100%;
            height: calc(100vh - var(--toolbar-height));
            top: var(--toolbar-height);
            background-color: var(--color-gray-500);
            padding-top: var(--gap);
            max-height: 0;
            overflow: hidden;
            transition: max-height .5s;
        }
        .toolbar > .navigation.-open {
            max-height: calc(100vh - var(--toolbar-height));
            box-shadow: var(--menu-shadow);

        }
        .toolbar > .navigation .spacer {
            display: none;
        }
        .toolbar > .navigation > a {
            display: block;
            padding: 1rem;
            margin-bottom: var(--gap);
            flex-grow: 0;
        }
        .toolbar > .navigation > a.sub-item {
            padding-left: 2rem;
        }
        .toolbar > .navigation > a.-active {
            background-color: var(--color-white);
            border-bottom-color: var(--color-interactivity);
        }

        .menu > ul.menu {
            position: fixed;
            top: var(--toolbar-height);
            left: 0;
            width: 100%;
            height: calc(100vh - var(--toolbar-height));

        }

    }
</style>
