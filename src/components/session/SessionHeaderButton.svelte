<script lang="ts">
    import { onMount } from 'svelte';
    import { audioState, sessionState, SessionState, AudioState, unifiedSessionActions } from '$lib/session/stores/unified-session-store';
    import { t } from '$lib/i18n';
    import { logger } from '$lib/logging/logger';
    import AudioButton from '$components/layout/AudioButton.svelte';
    import EndSessionModal from './EndSessionModal.svelte';
    
    interface Props {
        profileId: string;
        patientId?: string;
        performerId?: string;
        performerName?: string;
    }
    
    let { profileId, patientId, performerId, performerName }: Props = $props();
    
    // Container references for animation
    let headerAudioContainer = $state<HTMLDivElement>();
    let centerAudioContainer = $state<HTMLDivElement>();
    
    // Animation state management
    let isAnimatingTransition = $state(false);
    let targetPosition = $state({ x: 0, y: 0, scale: 1 });
    let animationDirection = $state<'to-header' | 'to-center' | null>(null);
    
    // Session state reactive values
    let currentSessionState = $derived($sessionState);
    let audioStateValue = $derived($audioState.state);
    let showEndSessionModal = $state(false);
    
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
    
    let showEndSessionButton = $derived(
        currentSessionState === SessionState.Running || 
        currentSessionState === SessionState.Paused
    );

    onMount(() => {
        // Mount center container to document body for global positioning
        if (centerAudioContainer) {
            document.body.appendChild(centerAudioContainer);
        }
        
        // Cleanup function to remove center container when component unmounts
        return () => {
            if (centerAudioContainer && centerAudioContainer.parentNode) {
                centerAudioContainer.parentNode.removeChild(centerAudioContainer);
            }
        };
    });

    // Handle smooth transitions when session state changes
    $effect(() => {
        if (typeof window === 'undefined') return;
        
        const audioButtonElement = document.querySelector('.audio-button-container');
        
        if (audioButtonElement && headerAudioContainer && centerAudioContainer) {
            const currentlyInHeader = audioButtonElement.parentElement === headerAudioContainer;
            const shouldBeInHeader = showAudioButtonInHeader;
            
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
    
    function handleEndSession() {
        logger.session.info('End session button clicked');
        showEndSessionModal = true;
    }
    
    function closeEndSessionModal() {
        showEndSessionModal = false;
    }
</script>

<!-- Show session buttons when recording/paused -->
{#if showAudioButtonInHeader}
    <!-- Session status button -->
    <a href="/med/p/{profileId}/session-moe" class="sub-item session-status-btn"
         class:listening={audioStateValue === AudioState.Listening}
         class:speaking={audioStateValue === AudioState.Speaking}
         class:paused={currentSessionState === SessionState.Paused}>
        <!-- Container for audio button - bind to Svelte property -->
        <div bind:this={headerAudioContainer} class="audio-button-header-container"></div>
        <span class="recording-text">
            {currentSessionState === SessionState.Paused ? $t('session.status.continue') : $t('session.status.recording')}
        </span>
    </a>
    
    <!-- End Session button when there's active session data -->
    {#if showEndSessionButton}
        <button 
            type="button" 
            class="sub-item end-session-btn"
            onclick={handleEndSession}
            title={$t('session.actions.end')}
        >
            {$t('session.actions.end')}
        </button>
    {/if}
{:else if showNewSessionLink}
    <a href="/med/p/{profileId}/session-moe" class="sub-item">
        {$t('app.nav.new-session')}
    </a>
{/if}

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

{#if showEndSessionModal}
    <EndSessionModal 
        onclose={closeEndSessionModal}
        {patientId}
        {performerId}
        {performerName}
    />
{/if}

<style>
    .session-status-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-white);
        color: var(--color-black);
        border-radius: var(--radius);
        font-weight: var(--text-bold);
        z-index: 1001;
        text-decoration: none;
        cursor: pointer;
        position: relative;
    }

    .session-status-btn:hover {
        background-color: var(--color-gray-200);
        transform: translateY(-1px);
        transition: all 0.2s ease;
    }

    .session-status-btn.listening .recording-text {
        color: var(--color-interactivity);
        transition: color 0.3s ease;
    }

    .session-status-btn.speaking .recording-text {
        color: var(--color-positive);
        transition: color 0.3s ease;
    }
    
    .session-status-btn.paused .recording-text {
        color: var(--color-gray-700);
        transition: color 0.3s ease;
    }

    .recording-text {
        font-size: 0.9rem;
        white-space: nowrap;
    }

    .audio-button-header-container {
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .end-session-btn {
        background: var(--color-error, #dc2626);
        color: var(--color-error-text, #fff);
        border: none;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        border-radius: var(--radius);
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
    }

    .end-session-btn:hover {
        background: var(--color-error-hover, #b91c1c);
        transform: translateY(-1px);
    }

    .end-session-btn:active {
        transform: translateY(0);
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
    .session-status-btn :global(.audio-button-container) {
        --button-size: 2.5rem;
        --animation-duration: 0.8s; /* Faster animation for smaller header button */
    }

    .audio-button-center-container :global(.audio-button-container) {
        --button-size: 12rem;
        --animation-duration: 2s; /* Standard animation for larger center button */
    }
</style>