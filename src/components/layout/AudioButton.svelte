<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { 
        unifiedSessionStore,
        audioState, 
        sessionState,
        AudioState,
        SessionState
    } from '$lib/session/stores/unified-session-store';
    import { audioActions } from '$lib/session/stores/audio-actions';
    import shortcuts from '$lib/shortcuts';
    import { logger } from '$lib/logging/logger';
    import ui from '$lib/ui';

    // Props for customization
    interface Props {
        language?: string;
        models?: string[];
        useRealtime?: boolean;
    }

    let { 
        language = 'en',
        models = ['GP'],
        useRealtime = true 
    }: Props = $props();

    // Component state
    let animationContainer = $state<HTMLDivElement>();
    let buttonContainer = $state<HTMLDivElement>();

    // Direct reactive states from stores
    let currentAudioState = $derived($audioState);
    let currentSessionState = $derived($sessionState);
    let audioState_value = $derived(currentAudioState.state);




    // Visual feedback for microphone activity
    function createMicTick(energy: number) {
        if (!animationContainer) return;
        
        const tickElement = document.createElement('div');
        tickElement.addEventListener('animationend', () => {
            tickElement.remove();
        });
        
        tickElement.style.opacity = `${Math.min(Math.max(energy, 0.1), 0.8)}`;
        tickElement.classList.add(audioState_value, 'animate');
        animationContainer.appendChild(tickElement);
    }

    // Handle audio features for visual feedback
    function handleAudioFeatures(features: any) {
        // Handle both event format and direct data format
        const data = features.detail || features;
        const { energy } = data;
        if (energy && energy > 0.001) {
            createMicTick(energy);
        }
    }

    // Local audio instance to ensure microphone is accessed in user interaction
    let localAudioProcessor: any = null;

    // Toggle recording state
    async function toggleRecording(event: Event) {
        event.stopPropagation();
        
        logger.audio.info('AudioButton: Toggle recording clicked', {
            currentState: audioState_value,
            sessionState: currentSessionState
        });

        if (audioState_value === AudioState.Stopping) {
            logger.audio.debug('Recording is stopping, ignoring click');
            return;
        }

        // Handle stopping (if currently running)
        if (currentSessionState === SessionState.Running) {
            // Stop local audio processor first
            if (localAudioProcessor) {
                logger.audio.debug('Stopping local audio processor', {
                    hasStream: !!localAudioProcessor.stream,
                    streamId: localAudioProcessor.stream?.id,
                    trackCount: localAudioProcessor.stream?.getTracks().length || 0,
                    audioState: localAudioProcessor.state
                });
                localAudioProcessor.stop();
                
                // Defensive cleanup: Force stop any remaining MediaStreams
                setTimeout(() => {
                    navigator.mediaDevices.enumerateDevices().then(() => {
                        // Check if Chrome tab indicator is still visible after a brief delay
                        logger.audio.debug('Defensive MediaStream check completed after stop');
                    }).catch(err => {
                        logger.audio.warn('Could not enumerate devices for defensive cleanup', err);
                    });
                }, 100);
                
                localAudioProcessor = null;
                logger.audio.info('Local audio processor stopped and cleaned up');
            }
            
            await audioActions.stopRecording();
            return;
        }

        // CRITICAL: Request microphone access immediately in the click handler
        // This must happen synchronously to satisfy browser security requirements
        try {
            logger.audio.debug('Requesting microphone in click handler...');
            
            // Import and initialize microphone synchronously in user interaction
            const { getAudioVAD } = await import('$lib/audio/microphone');
            const audio = await getAudioVAD({ analyzer: true });
            
            if (audio instanceof Error) {
                throw audio;
            }
            
            localAudioProcessor = audio;
            logger.audio.info('Microphone access granted in click handler', {
                hasStream: !!audio.stream,
                streamId: audio.stream?.id,
                trackCount: audio.stream?.getTracks().length || 0
            });
            
            // NOW do the optimistic UI update after we have microphone access
            unifiedSessionStore.update(state => ({
                ...state,
                audio: {
                    ...state.audio,
                    state: AudioState.Listening,
                    recordingStartTime: Date.now()
                },
                ui: {
                    ...state.ui,
                    audioButtonPosition: state.ui.isOnNewSessionPage ? 'header' : state.ui.audioButtonPosition,
                    isAnimating: true
                }
            }));

            // Continue with session setup and recording start
            const success = await audioActions.startRecordingWithAudio(localAudioProcessor, {
                language,
                models,
                useRealtime
            });

            if (!success) {
                // Rollback on failure
                if (localAudioProcessor) {
                    localAudioProcessor.stop();
                    localAudioProcessor = null;
                }
                
                unifiedSessionStore.update(state => ({
                    ...state,
                    audio: {
                        ...state.audio,
                        isRecording: false,
                        state: AudioState.Ready
                    },
                    ui: {
                        ...state.ui,
                        audioButtonPosition: state.ui.isOnNewSessionPage ? 'center' : 'hidden'
                    }
                }));
                logger.audio.warn('Failed to start recording - rolled back');
            }
        } catch (error) {
            logger.audio.error('Error accessing microphone or starting recording:', error);
            
            // Rollback optimistic update on error - properly stop audio processor
            if (localAudioProcessor) {
                logger.audio.debug('Stopping local audio processor due to error');
                localAudioProcessor.stop();
                localAudioProcessor = null;
                logger.audio.info('Local audio processor stopped due to error');
            }
            
            unifiedSessionStore.update(state => ({
                ...state,
                audio: {
                    ...state.audio,
                    isRecording: false,
                    state: AudioState.Error
                },
                ui: {
                    ...state.ui,
                    audioButtonPosition: state.ui.isOnNewSessionPage ? 'center' : 'hidden'
                },
                error: `Microphone access failed: ${error instanceof Error ? error.message : String(error)}`
            }));
        }
    }

    // Route changes are handled by unified-session-store automatically

    // Component lifecycle
    onMount(() => {
        logger.audio.debug('AudioButton mounted');
        
        // Listen for UI events
        ui.on('audio:features', handleAudioFeatures);
        
        // Listen for keyboard shortcut (Space)
        const unsubscribeShortcut = shortcuts.listen('Space', () => {
            // Always available for keyboard shortcut
            toggleRecording(new Event('click'));
        });

        return () => {
            unsubscribeShortcut();
        };
    });

    onDestroy(() => {
        logger.audio.debug('AudioButton destroying...');
        
        // Clean up event listeners
        ui.off('audio:features', handleAudioFeatures);
        
        // Defensive cleanup - stop local audio processor if exists
        if (localAudioProcessor) {
            logger.audio.warn('AudioButton destroying with active localAudioProcessor - cleaning up');
            localAudioProcessor.stop();
            localAudioProcessor = null;
        }
        
        // Stop recording if active
        if (currentSessionState === SessionState.Running) {
            logger.audio.debug('AudioButton destroying while recording - stopping...');
            audioActions.stopRecording();
        }
    });
</script>

<!-- Simple AudioButton that inherits parent positioning -->
<div class="audio-button-container" bind:this={buttonContainer}>
        <div bind:this={animationContainer} class="animation-container">
            <button
                class="audio-button {audioState_value}"
                class:is-recording={currentSessionState === SessionState.Running}
                class:is-running={currentSessionState === SessionState.Running}
                class:is-paused={currentSessionState === SessionState.Paused}
                onclick={toggleRecording}
                aria-label={currentSessionState === SessionState.Running ? 'Stop recording' : 'Start recording'}
                title={currentSessionState === SessionState.Running ? 'Stop recording' : 'Start recording'}
            >
            {#if audioState_value === AudioState.Stopping}
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            {:else if audioState_value === AudioState.Listening || audioState_value === AudioState.Speaking}
                <svg class="microphone-icon">
                    <use href="/icons.svg#mic-off"></use>
                </svg>
            {:else}
                <svg class="microphone-icon">
                    <use href="/icons.svg#mic"></use>
                </svg>
            {/if}
            </button>
        </div>
</div>

<style>
    .audio-button-container {
        --idle-color: var(--color-interactivity);
        --idle-color-text: var(--color-interactivity-text);
        --speech-color: var(--color-positive);
        --listen-color: var(--color-interactivity);
        --sound-color: var(--idle-color);
        --sound-color-text: var(--idle-color-text);
        --button-size: 3rem;
        --animation-duration: 2s; /* Default animation duration */
        
        /* Simple container that inherits parent positioning */
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .animation-container {
        position: relative;
        width: 100%;
        height: 100%;
        /* Create stacking context for proper layering */
        z-index: 1000;
    }

    /* Button styling */
    .audio-button {
        position: relative;
        width: var(--button-size);
        height: var(--button-size);
        border-radius: 50%;
        border: 0.2rem solid var(--sound-color);
        background-color: var(--sound-color);
        color: var(--sound-color-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: var(--text-bold);
        box-shadow: 0 0.6rem 0.6rem -0.2rem rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease;
        overflow: hidden;
        /* Ensure button is above animations */
        z-index: 1002;
    }

    .audio-button:hover {
        transform: scale(1.05);
        box-shadow: 0 1rem 0.8rem -0.5rem rgba(0, 0, 0, 0.4);
        /* Ensure base hover state maintains button colors */
        background-color: var(--sound-color);
        border-color: var(--sound-color);
        color: var(--sound-color-text);
    }

    .audio-button:active {
        transform: scale(0.95);
    }

    /* State-specific colors */
    .audio-button.speaking {
        --sound-color: var(--speech-color);
    }

    .audio-button.stopping {
        --sound-color: var(--color-negative);
    }

    .audio-button.listening {
        --sound-color: var(--listen-color);
    }

    .audio-button.error {
        --sound-color: var(--color-negative);
    }
    
    /* Paused state - maintain default colors */
    .audio-button.is-paused {
        --sound-color: var(--idle-color);
        --sound-color-text: var(--idle-color-text);
    }
    
    /* Paused state hover - maintain colors, don't inherit toolbar styles */
    .audio-button.is-paused:hover {
        background-color: var(--idle-color);
        border-color: var(--idle-color);
        color: var(--idle-color-text);
        transform: scale(1.05);
        box-shadow: 0 1rem 0.8rem -0.5rem rgba(0, 0, 0, 0.4);
    }


    /* Running state (when recording) */
    .audio-button.is-running {
        background-color: var(--color-white);
        color: var(--sound-color);
    }

    .audio-button.is-running:hover {
        color: var(--color-negative);
        border-color: var(--color-negative);
    }

    /* Icon styling */
    .microphone-icon {
        width: 60%;
        height: 60%;
        fill: currentColor;
    }

    /* Loading animation */
    .loading-dots {
        display: flex;
        gap: 0.3rem;
    }

    .loading-dots span {
        width: 0.4rem;
        height: 0.4rem;
        background-color: currentColor;
        border-radius: 50%;
        animation: loading-bounce 1.4s infinite ease-in-out;
    }

    .loading-dots span:nth-child(1) {
        animation-delay: -0.32s;
    }

    .loading-dots span:nth-child(2) {
        animation-delay: -0.16s;
    }

    @keyframes loading-bounce {
        0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }

    /* Microphone activity animation */
    .audio-button-container :global(.animate) {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: var(--sound-color);
        transform: translate(-50%, -50%) scale(1);
        animation: mic-pulse var(--animation-duration) cubic-bezier(0.1, 0.8, 0.57, 0.98);
        pointer-events: none;
        z-index: 1001; /* Behind button but visible above everything else */
    }

    .audio-button-container :global(.animate.speaking) {
        background-color: var(--speech-color);
    }

    .audio-button-container :global(.animate.stopping),
    .audio-button-container :global(.animate.stopped) {
        background-color: var(--color-white);
    }

    @keyframes mic-pulse {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
        }
        100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
        }
    }

    /* Responsive adjustments */
    @media screen and (max-width: 768px) {
        .audio-button-container.position-center {
            --button-size: 10rem;
        }
    }

    @media screen and (max-width: 480px) {
        .audio-button-container.position-center {
            --button-size: 8rem;
        }
    }
</style>