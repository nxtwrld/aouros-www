<script lang="ts">
    import { AudioState, getAudio, getAudioVAD, convertBlobToMp3, convertFloat32ToMp3, type AudioControlsVad} from '$lib/audio/microphone';
    // @ts-ignore - throttle-debounce has type issues but works fine
    import { throttle } from 'throttle-debounce';
    import { onDestroy, onMount } from 'svelte';
    import shortcuts from '$lib/shortcuts';
    import { SessionWebSocketClient } from '$lib/session/websocket-client';
    import { HttpSessionClient } from '$lib/session/http-client';
    import { SSEClient } from '$lib/session/sse-client';
    import type { PartialTranscript } from '$lib/session/manager';

    interface Props {
        hasResults?: boolean;
        speechChunks?: Float32Array[];
        state?: AudioState;
        sessionId?: string;
        useRealtime?: boolean;
        language?: string;
        models?: string[];
        onspeechstart?: () => void;
        onspeechend?: (event: { speechChunks: Float32Array[] }) => void;
        onfeatures?: (features: any) => void;
        ontranscript?: (transcript: PartialTranscript) => void;
        onanalysis?: (analysis: any) => void;
        onsessioncreated?: (sessionId: string) => void;
    }

    let { 
        hasResults = false,
        speechChunks = $bindable([]),
        state = $bindable(AudioState.ready),
        sessionId = $bindable(),
        useRealtime = false,
        language = 'en',
        models = ['GP'],
        onspeechstart,
        onspeechend,
        onfeatures,
        ontranscript,
        onanalysis,
        onsessioncreated
    }: Props = $props();

    let audio: AudioControlsVad | Error;
    let sseClient: SSEClient | null = null;

    let micAnimationContainer: HTMLDivElement;

    let isRunning = $derived(state === AudioState.listening || state === AudioState.speaking);
    let isRealtimeReady = $derived(useRealtime && sessionId && sseClient && (sseClient as SSEClient).isConnected);

    // Add comprehensive logging
    $effect(() => {
        console.log('🎯 AudioButton State Update:', {
            state,
            useRealtime,
            sessionId,
            hasSSEClient: sseClient !== null,
            sseConnected: sseClient ? sseClient.isConnected : false,
            isRealtimeReady
        });
    });

    const micTick = throttle(200, (energy: number) => {
        const tickElement = document.createElement('div');
        tickElement.addEventListener("animationend", () => {
            tickElement.remove();
        });
        tickElement.style.opacity = `${Math.min(Math.max(energy, .1),.8)}`;
        tickElement.classList.add(state);
        if (micAnimationContainer) micAnimationContainer.appendChild(tickElement);
        tickElement.classList.add('animate');
        
    });

    async function createSession(): Promise<string | null> {
        console.log('🚀 Creating new session...', { language, models });
        
        try {
            const response = await fetch('/v1/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language,
                    models: models.filter(model => model && model.trim())
                })
            });
            
            console.log('📡 Session creation response status:', response.status);
            
            if (!response.ok) {
                console.error('❌ Session creation failed with status:', response.status);
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`Session creation failed: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📡 Session creation response data:', result);
            
            if (result.sessionId) {
                console.log('✅ Session created successfully:', result.sessionId);
                return result.sessionId;
            } else {
                console.error('❌ No sessionId in response:', result);
                return null;
            }
        } catch (error) {
            console.error('❌ Session creation error:', error);
            return null;
        }
    }

    async function initializeSSEClient(): Promise<boolean> {
        console.log('📡 Initializing SSE client...', { useRealtime, sessionId, sseClient });
        
        if (useRealtime && sessionId && !sseClient) {
            console.log('📡 Creating new SSEClient...');
            sseClient = new SSEClient({
                sessionId,
                onTranscript: (transcript) => {
                    console.log('📝 SSE transcript received:', transcript);
                    ontranscript?.(transcript);
                },
                onAnalysis: (analysis) => {
                    console.log('🔬 SSE analysis received:', analysis);
                    onanalysis?.(analysis);
                },
                onError: (error) => {
                    console.error('❌ SSE client error:', error);
                },
                onStatus: (status) => {
                    console.log('📊 SSE session status:', status);
                }
            });

            try {
                console.log('📡 Starting SSE connection...');
                const connected = await sseClient.connect();
                console.log('📡 SSE connection result:', connected);
                if (connected) {
                    console.log('✅ SSE connected successfully');
                    return true;
                } else {
                    console.error('❌ Failed to connect SSE');
                    sseClient = null;
                    return false;
                }
            } catch (error) {
                console.error('❌ SSE connection failed:', error);
                sseClient = null;
                return false;
            }
        } else {
            console.log('⏭️ Skipping SSE initialization:', {
                useRealtime,
                sessionId,
                alreadyHasClient: sseClient !== null
            });
            return false;
        }
    }

    async function startSession() {
        console.log('🎙️ Starting audio session...', { useRealtime, sessionId });
        
        // Create session if we don't have one and real-time is enabled
        if (useRealtime && !sessionId) {
            console.log('🆕 Creating session before starting recording...');
            const newSessionId = await createSession();
            if (newSessionId) {
                sessionId = newSessionId;
                onsessioncreated?.(sessionId);
                console.log('✅ Session created and stored:', sessionId);
            } else {
                console.error('❌ Failed to create session, falling back to traditional processing');
                useRealtime = false;
            }
        }
        
        // Initialize SSE client for real-time processing if enabled
        if (useRealtime && sessionId) {
            const sseInitialized = await initializeSSEClient();
            if (!sseInitialized) {
                console.error('❌ Failed to initialize SSE client, falling back to traditional processing');
                useRealtime = false;
            }
        }

        audio = await getAudioVAD({
            analyzer: true
        });
        state = AudioState.listening;

        if (audio instanceof Error) {
            console.error('❌ Audio initialization failed:', audio);
            return;
        }

        console.log('✅ Audio initialized successfully');

        audio.onFeatures = (d) => {
            if (d.energy > 0.001) micTick(d.energy);
            onfeatures?.(d);
        }

        audio.onSpeechStart = () => {
            console.log('🗣️ Speech started');
            if (!(audio instanceof Error)) {
                state = audio.state;
            }
            onspeechstart?.();
        }   

        audio.onSpeechEnd = (data: Float32Array) => {
            console.log('🔇 Speech ended, processing audio chunk...', {
                chunkSize: data.length,
                useRealtime,
                sseConnected: sseClient ? sseClient.isConnected : false
            });

           if (!(audio instanceof Error)) {
                state = audio.state;
           }

           // Handle real-time processing vs traditional batch
           if (useRealtime && sseClient && sseClient.isConnected) {
               console.log('📡 Sending audio chunk to SSE client...', data.length);
               sseClient.sendAudioChunk(data);
           } else {
               console.log('📦 Using traditional batch processing...', {
                   useRealtime,
                   hasSSEClient: sseClient !== null,
                   sseConnected: sseClient ? sseClient.isConnected : false
               });
               // Use traditional batch processing
               speechChunks.push(data);
               onspeechend?.({
                   speechChunks
               });
           }
        }

        audio.start();
        state = audio.state;
        console.log('🎙️ Audio recording started');
    }

    async function stopSession() {
        console.log('🛑 Stopping audio session...');
        
        if (audio && !(audio instanceof Error)) {
            audio.stop();
            state = audio.state;
        }

        // Clean up SSE client
        if (sseClient) {
            console.log('📡 Disconnecting SSE client...');
            sseClient.disconnect();
            sseClient = null;
        }

        // Send final speech chunks for traditional processing
        if (!useRealtime) {
            onspeechend?.({
                speechChunks
            });
        }
        
        console.log('✅ Audio session stopped');
    }

    function toggleSession() {
        console.log('🔄 Toggling session...', { currentState: state });
        
        if (state === AudioState.stopping) {
            console.log('⏳ Session is stopping, ignoring toggle');
            return;
        } else if (state === AudioState.listening || state === AudioState.speaking) {  
            console.log('🛑 Stopping audio session');
            stopSession();
        } else {
            console.log('▶️ Starting audio session');
            startSession();            
        }
    }

    onMount(() => {
        console.log('🏁 AudioButton mounted');
        return shortcuts.listen('Space', () => {
            toggleSession();
        });
    });

    onDestroy(() => {
        console.log('💀 AudioButton destroying...');
        stopSession();
    })

</script>



<div class="record-audio {state}" class:-has-results={hasResults} bind:this={micAnimationContainer}>
    <button class="control {state}" class:-running={isRunning} onclick={(e: Event) => { e.stopPropagation(); toggleSession(); }}>
        {#if state == AudioState.stopping}
        ....
        {:else if state === AudioState.listening ||  state === AudioState.speaking}
            <svg>
                <use href="/icons.svg#mic-off"></use>
            </svg>
        {:else}
            <svg>
                <use href="/icons.svg#mic"></use>
            </svg>
        {/if}
    </button>
    {#if true || (!isRunning && hasResults)}
        <!--button class="finalize" >
            Finalize Report
        </button-->
    {/if}
</div>

<style>

.record-audio {
        --idle-color: var(--color-interactivity);
        --idle-color-text: var(--color-interactivity-text);
        --speech-color: var(--color-positive);
        --listen-color: var(--color-purple);
        --sound-color: var(--idle-color);
        --sound-color-text: var(--idle-color-text);
        width: 100%;
        height: 100%;
    }

    .record-audio.speaking {
        --sound-color: var(--speech-color);
    }
    .record-audio.stopping {
        --sound-color: var(--color-negative);
    }
    .record-audio.listening {
        --sound-color: var(--listen-color);
    }

    .record-audio :global(> *) {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 12rem;
        height: 12rem;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width .5s, height .5s;
        transition-timing-function: ease-in;
    }
    .record-audio.-has-results :global(> *) {
        width: 6rem;
        height: 6rem;
    }
    .record-audio .control {
        background-color: var(--sound-color);
        border: .2rem solid var(--sound-color);
        color: var(--sound-color-text);
        font-weight: var(--text-bold);
        font-size: 1.5rem;
        z-index: 1001;
        pointer-events: all;
        padding: 1rem;
        box-shadow: 0 .6rem .6rem -.2rem rgba(0,0,0,.5);
        transition: all .5s;
    }   
    .record-audio .control:hover,
    .record-audio .control:active {
        transform: translate(-50%, calc(-50% + .2rem)) scale(1.05);
        box-shadow: 0 1rem .8rem -.5rem rgba(0,0,0,.4)
    }
    .record-audio .control.-running {
        background-color: var(--color-white);
        color: var(--sound-color);
    }


    .record-audio.speaking .control.-running {
        color: var(--sound-color);
        border-color: var(--sound-color);
    }
    
    .record-audio .control.-running:hover,
    .record-audio .control.-running:active,
    .record-audio .control.-running.speaking:hover,
    .record-audio .control.-running.speaking:active {
        color: var(--color-negative);
        border-color: var(--color-negative);
    }

    .record-audio .control svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
    }


    .record-audio :global(.animate) {
        background-color: var(--sound-color);
        transition: scale 1s cubic-bezier(.1,.8,.57,.98), opacity 1s cubic-bezier(.1,.8,.57,.98);
        /*box-shadow: inner 0 0 6rem var(--color-white);*/
        animation: pulse 2s;
        animation-iteration-count: 1;
    }
    .record-audio :global(.animate.speaking) {
        background-color: var(--speech-color);
    }
    .record-audio :global(.animate.stopping),
    .record-audio :global(.animate.stopped) {
        background-color: var(--color-white);
    }
    @keyframes pulse {
        0% {
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
        }
    }


</style>