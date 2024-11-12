<script lang="ts">
    import { AudioState, getAudio, getAudioVAD, convertBlobToMp3, convertFloat32ToMp3, type AudioControlsVad} from '$slib/audio/microphone';
    import { throttle } from 'throttle-debounce';
    import { onDestroy, createEventDispatcher, onMount } from 'svelte';
    import shortcuts from '$slib/shortcuts';

    const dispatch = createEventDispatcher();

    export let hasResults = false;
    export let speechChunks: Float32Array[] =[];
    export let state: AudioState = AudioState.ready;

    let audio: AudioControlsVad | Error;

    let micAnimationContainer: HTMLDivElement;

    $: isRunning = state === AudioState.listening || state === AudioState.speaking;

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


    async function startSession() {
        audio = await getAudioVAD({
            analyzer: true
        });
        state = AudioState.listening;
        //return;

        if (audio instanceof Error) {
            console.error(audio);
            return;
        }
        audio.onFeatures = (d) => {
            //console.log(d.energy)
            if (d.energy > 0.001) micTick(d.energy);
            dispatch('features', d);
        }
        audio.onSpeechStart = () => {
            state = audio.state;
            dispatch('speech-start');
        }   
        audio.onSpeechEnd = (data: Float32Array) => {
           // console.log(data);
           state = audio.state;
            speechChunks.push(data);
         //   console.log(convertFloat32ToMp3(data));
            dispatch('speech-end', {
                speechChunks
            });
            
        }
        audio.start();
        //transcript.on('data', console.log);
        state = audio.state;
    }

    async function stopSession() {
        if (audio) {
            audio.stop();
            state = audio.state;
        }

        dispatch('speech-end', {
            speechChunks
        });
    }

    function toggleSession() {
        if (state === AudioState.stopping) {
            return;
        } else if (state === AudioState.listening || state === AudioState.speaking) {  
            console.log('stopping audio session');
            stopSession();
        } else {
            console.log('starting audio session');
            startSession();            
        }
    }

    onMount(() => {
        return shortcuts.listen('Space', () => {
            toggleSession();
        });
    });

    onDestroy(() => {
        stopSession();
    })

</script>



<div class="record-audio {state}" class:-has-results={hasResults} bind:this={micAnimationContainer}>
    <button class="control {state}" class:-running={isRunning} on:click|stopPropagation={toggleSession}>
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
    .record-audio .control.-running:active
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