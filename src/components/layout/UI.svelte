<script lang="ts">
    import Header from '$components/layout/Header.svelte';
    import DropFiles from '$components/import/DropFiles.svelte';   
    import Modal from '$components/ui/Modal.svelte';
    import HealthForm from '../profile/HealthForm.svelte';
    import HealthProperty from '../healthProperty/Overview.svelte';
    import Import from '$components/import/Index.svelte';
    import ui from '$lib/ui';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { beforeNavigate, afterNavigate } from '$app/navigation';
    import { Overlay, state as uiState } from '$lib/ui';
    import shortcuts from '$lib/shortcuts';
    import Sounds from '$components/ui/Sounds.svelte';
    import Viewer from './Viewer.svelte';
    import { logger } from '$lib/logging/logger';
    import AIChatSidebar from '$components/chat/AIChatSidebar.svelte';
    import { profile } from '$lib/profiles';
    import { page } from '$app/stores';
    import { chatManager } from '$lib/chat/chat-manager';
    import { isOpen as chatIsOpen } from '$lib/chat/store';

    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    // Fixed: Convert to proper Svelte 5 reactive state
    let dialogs = $state({
        healthForm: false,
        healthProperty: false
    });

    // Chat state
    let currentProfile = $state(null);
    let isOwnProfile = $state(false);
    let userLanguage = $state('en');
    
    // Viewer state
    let viewerWidth = $state(33); // percentage
    let isResizingViewer = $state(false);
    let minViewerWidth = 20; // minimum percentage
    let maxViewerWidth = 50; // maximum percentage
    
    // Mobile bottom sheet state
    let mobileViewerHeight = $state(60); // percentage of viewport height
    let isMobileResizing = $state(false);
    let touchStartY = 0;
    let startHeight = 0;
    let isMobile = $state(false);
    
    // Check if mobile
    function checkMobile() {
        isMobile = window.innerWidth <= 768;
    }
    
    // Update CSS variables
    $effect(() => {
        if ($uiState.viewer) {
            document.documentElement.style.setProperty('--viewer-width', `${viewerWidth}vw`);
            if (isMobile) {
                document.documentElement.style.setProperty('--mobile-viewer-height', `${mobileViewerHeight}vh`);
            }
        }
    });
    
    // Handle viewer resize
    function startViewerResize(event: MouseEvent) {
        isResizingViewer = true;
        document.addEventListener('mousemove', handleViewerResize);
        document.addEventListener('mouseup', stopViewerResize);
        event.preventDefault();
    }

    function handleViewerResize(event: MouseEvent) {
        if (!isResizingViewer) return;
        
        const vwWidth = (event.clientX / window.innerWidth) * 100;
        viewerWidth = Math.max(minViewerWidth, Math.min(maxViewerWidth, vwWidth));
    }

    function stopViewerResize() {
        isResizingViewer = false;
        document.removeEventListener('mousemove', handleViewerResize);
        document.removeEventListener('mouseup', stopViewerResize);
    }
    
    // Mobile touch resize handlers
    function handleMobileResizeStart(event: TouchEvent) {
        if (!isMobile) return;
        event.preventDefault();
        isMobileResizing = true;
        touchStartY = event.touches[0].clientY;
        startHeight = mobileViewerHeight;
    }
    
    function handleMobileResizeMove(event: TouchEvent) {
        if (!isMobileResizing || !isMobile) return;
        event.preventDefault();
        
        const currentY = event.touches[0].clientY;
        const deltaY = touchStartY - currentY;
        const deltaPercent = (deltaY / window.innerHeight) * 100;
        
        mobileViewerHeight = Math.max(25, Math.min(90, startHeight + deltaPercent));
    }
    
    function handleMobileResizeEnd(event: TouchEvent) {
        isMobileResizing = false;
    }


    // close all dialogs on navigation
    afterNavigate(() => {
        manageOverlay();
    });

    function manageOverlay() {
        if (location.hash.indexOf('#overlay-') == 0) {
            const overlay = location.hash.replace('#overlay-', '');
            if (Object.values(Overlay).includes(overlay as Overlay)) $uiState.overlay = overlay as Overlay;
        } else {
            $uiState.overlay = Overlay.none;
        }
    }

    // Subscribe to profile changes for chat
    $effect(() => {
        const unsubscribe = profile.subscribe((p) => {
            currentProfile = p;
            
            // Determine if this is the user's own profile
            // For now, assume all profiles are "own" profiles in patient mode
            if (p) {
                isOwnProfile = true; // Default to patient mode
                userLanguage = p.language || 'en';
                
                // Emit navigation if we're in the medical section
                if ($page.url.pathname.startsWith('/med')) {
                    ui.emit('chat:navigation', {
                        route: $page.route.id || '/',
                        profileId: p.id,
                        profileName: p.fullName || 'Unknown'
                    });
                }
            }
        });
        
        return unsubscribe;
    });

    onMount(() => {
        logger.ui.info('UI mounted');
        checkMobile();
        window.addEventListener('resize', checkMobile);
        document.addEventListener('touchmove', handleMobileResizeMove, { passive: false });
        document.addEventListener('touchend', handleMobileResizeEnd);
        
        const offs = [
            ui.listen('modal.healthProperty', (config: any) => {
                logger.ui.debug('modal.healthProperty event received with config:', config);
                logger.ui.debug('Setting dialogs.healthProperty to:', config === false ? false : (config || true));
                dialogs.healthProperty = config === false ? false : (config || true);
            }),
            ui.listen('modal.healthForm', (config: any) => {
                logger.ui.debug('modal.healthForm event received with config:', config);
                logger.ui.debug('Setting dialogs.healthForm to:', config === false ? false : (config || true));
                dialogs.healthForm = config === false ? false : (config || true);
            }),
            ui.listen('overlay.import', (state: boolean = true) => {
                logger.ui.debug('import');
                if (state == true) location.hash = '#overlay-import';
                else  {
                    if (location.hash.indexOf('#overlay-') == 0) {
                    history.back();
                }
                }
            }),
            ui.listen('viewer', (config: any) => {
                $uiState.viewer = true;
            }),
            shortcuts.listen('Escape', () => {
                if (location.hash.indexOf('#overlay-') == 0) {
                    history.back();
                }
            })
        ]

        // Save chat history before page unload
        const handleBeforeUnload = () => {
            chatManager.saveCurrentConversation();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        manageOverlay();
        return () => {
            offs.forEach(off => off());
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('resize', checkMobile);
            document.removeEventListener('touchmove', handleMobileResizeMove);
            document.removeEventListener('touchend', handleMobileResizeEnd);
        }

    });

</script>
<svelte:window on:hashchange={manageOverlay} />

<DropFiles>
    <Header></Header>
    <main class="layout" class:-viewer={$uiState.viewer} class:chat-open={$chatIsOpen && $page.url.pathname.startsWith('/med')}>
        {#if $uiState.viewer}
            <section 
                class="layout-viewer" 
                style="width: {viewerWidth}vw; {isMobile ? `height: ${mobileViewerHeight}vh` : ''}"
                transition:fade
            >
                <Viewer />
                <!-- Desktop Resize Handle -->
                {#if !isMobile}
                    <button
                        class="viewer-resize-handle"
                        onmousedown={startViewerResize}
                        aria-label="Resize viewer sidebar"
                    ></button>
                {/if}
                <!-- Mobile Pull Handle -->
                {#if isMobile}
                    <div 
                        class="mobile-pull-handle"
                        ontouchstart={handleMobileResizeStart}
                        role="button"
                        aria-label="Drag to resize viewer height"
                    >
                        <div class="pull-handle-bar"></div>
                    </div>
                {/if}
            </section>
        {/if}
        <section class="layout-content">{@render children?.()}</section>
    </main>


    {#if $uiState.overlay == Overlay.import}
        <div class="virtual-page" transition:fade>
            <Import />
            </div>
    {/if}

    {#if dialogs.healthForm}
        <Modal on:close={() => {
            logger.ui.debug('Health form modal close event fired');
            dialogs.healthForm = false;
        }}>
            <HealthForm config={dialogs.healthForm}  on:abort={() => {
                logger.ui.debug('Health form abort event fired');
                dialogs.healthForm = false;
            }}/>
        </Modal>
    {/if}
    {#if dialogs.healthProperty}
        <Modal on:close={() => {
            logger.ui.debug('Health property modal close event fired');
            dialogs.healthProperty = false;
        }}>
            <HealthProperty property={dialogs.healthProperty as any}  on:abort={() => {
                logger.ui.debug('Health property abort event fired');
                dialogs.healthProperty = false;
            }}/>
        </Modal>
    {/if}

    <!-- AI Chat Sidebar - show throughout the medical section -->
    {#if $page.url.pathname.startsWith('/med')}
        <AIChatSidebar 
            {currentProfile}
            {isOwnProfile}
            {userLanguage}
        />
    {/if}

</DropFiles>
<Sounds />
<style>
    .virtual-page {
        position: fixed;
        top: calc(var(--toolbar-height) + var(--gap));
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100000;
        background: var(--background);
    }
</style>
