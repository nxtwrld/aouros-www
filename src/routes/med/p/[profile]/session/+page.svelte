<script lang="ts">
    import { type Profile } from '$slib/med/types.d';
    import { AudioState, getAudio, getAudioVAD, convertBlobToMp3, convertFloat32ToMp3, type AudioControlsVad} from '$slib/audio/microphone';
    import { connectTranscript } from '$slib/transcript';
    import { onMount, onDestroy } from 'svelte';
    import ProfileView from '$scomponents/patient/Profile.svelte';
    import SessionView from '$scomponents/patient/Session.svelte';
    import { getSortForEnum, sortbyProperty } from '$slib/array';
    import { throttle } from 'throttle-debounce'

    export let data: {
        profile
    }

    const CHUNK_COUNT = 200;
    const profile: Profile = data.profile;

    // UI Session States
    const severityEnum = {
        mild: 0,
        moderate: 1,
        severe: 2
    }

    let texts: string[] = [];
    let state: AudioState = AudioState.ready;

    let lastAnalyzedTextLength: number = 0;
    let analysis: any = undefined;

    let audio: AudioControlsVad | Error;

 
    let speechChunks: Float32Array[] =[];
    let micAnimationContainer: HTMLDivElement;

    $: isRunning = state === AudioState.listening || state === AudioState.speaking;
    $: hasResults = analysis;// || texts.length > 0;

    const micTick = throttle(200, (energy: number) => {
        const tickElement = document.createElement('div');
        tickElement.addEventListener("animationend", () => {
            tickElement.remove();
        });
        tickElement.style.opacity = `${Math.min(Math.max(energy, .1),.8)}`;
        tickElement.classList.add(state);
        micAnimationContainer.appendChild(tickElement);
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
        }
        audio.onSpeechStart = () => {
            state = audio.state;
        }   
        audio.onSpeechEnd = (data: Float32Array) => {
           // console.log(data);
           state = audio.state;
            speechChunks.push(data);
         //   console.log(convertFloat32ToMp3(data));
            processData();
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

        processData();

    }

    function toggleSession() {
        if (state === AudioState.stopping) {
            return;
        } else if (state === AudioState.listening || state === AudioState.speaking) {  
            stopSession();
        } else {
            startSession();            
        }
    }

    let results: Promise<{
        text: string;
        confidence: number;
    }>[] = [];



    let processingStatus = 'idle';
    async function processData() {
        if (processingStatus === 'processing') {
            return;
        }
        processingStatus = 'processing';
        //return;
        while (speechChunks.length > 0) {
            const chunk: Float32Array = speechChunks.shift();
            const index = results.length;
            texts[index] = '...';
            results = [...results, new Promise(async (resolve, reject) =>{

                const mp3Blob = await convertFloat32ToMp3(chunk, 16000);
                //const mp3Blob = await convertBlobToMp3(new Blob(audioChunks));
                
                const formData = new FormData();
                formData.append('file', mp3Blob, 'audio.mp3')
                formData.append('instructions', JSON.stringify({
                    lang: 'cs'
                }));

                try {
                    const results = await fetch('/v1/transcribe', {
                        method: 'POST',
                        /*headers: {
                            'Content-Type': 'application/json'
                        },*/
                        body: formData
                    });
                    const transcript = await results.json();
                    console.log('Transcript', transcript);
                    resolve(transcript);
                    texts[index] = transcript.text;
                } catch (e) {
                    reject(e);
                }
            })];
        }
        processingStatus = 'idle';
    }


    async function analyzeTranscription() {
        let text = texts.join('\r\n');
        if (text.length === lastAnalyzedTextLength + 100) {
            return;
        }

        lastAnalyzedTextLength = text.length;
        const result = await fetch('/v1/med/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: 'czech',
                text
            })
        });
        analysis = await result.json();
        console.log(analysis);
    }

    function testAnalyze() {
        texts = [
            'Dobrý den, pane doktore.', 
            'Mám bolesti v krku a horečku.', 
            'Co mi můžete doporučit?',
            'Od kdy pociťujete bolesti?',
            'Jak dlouho trvá horečka?',
            'Máte nějaké další příznaky?',
            'Nemohu polykat a mám bolesti hlavy už několik dní. Měřil jsem se předevčírem, když mi bylo už hodnš blbě a měl jsem třicet sedm devět.',
            'To už trochu polevilo, ale stále se necítím dobře.',
            'Teplota je stále vysoká a mám pocit, že se mi zhoršuje zrak.',
            'Tak se změříme teď hned. Vyrdžte mi.',
            'Třicet sedm šest. To je dost.',
            'Ukažte mi jazyk.',
            'Máte na něm bílý povlak.',
            
        ];
        analyzeTranscription();
    }


    enum DaysOfWeek  {
        Monday = 'Monday',
        Tuesday = 'Tuesday',
        Wednesday = 'Wednesday',
        Thursday = 'Thursday',
        Friday = 'Friday',
        Saturday = 'Saturday',
        Sunday = 'Sunday'
    }
    enum Frequency {
        Daily = 'Dayily',
        Weekdays = 'Weekdays',
        EveryTwoDays = 'EveryTwoDays'
    }   
    function getFrequency(days: DaysOfWeek[]): Frequency[] | DaysOfWeek[] {
        if (days.length === 7) {
            return [Frequency.Daily];
        }
        if (days.length === 5) {
            // TODO check only workdays are present
            return [Frequency.Weekdays]
        }
        return days;
    }

/*
    const socket = io()

    socket.on('eventFromServer', (message) => {
        console.log(message)
    })

*/
    onDestroy(() => {
        stopSession();
    })

    onMount(() => {
        //socket.emit('eventFromClient', 'Hello from client')
        //testAnalyze();
    })


</script>



<div class="record-audio" class:-has-results={hasResults} bind:this={micAnimationContainer}>
    <button class="control {state}" class:-running={isRunning} on:click={toggleSession}>
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

<div class="canvas">
    {#if hasResults}
    <div class="session">
        <SessionView />

        <h3 class="h3">Analysis</h3>

        <div class="dashboard">
        {#if analysis && analysis.complaint}
                <div class="block block-complaint">
                    <h4 class="h4">Complaint</h4>
                    <p>{analysis.complaint}</p>
                </div>
        {/if}
        {#if analysis && analysis.symptoms}
                <div class="block block-symptoms">
                    <h4 class="h4">Symptoms</h4>
                    {#each analysis.symptoms.sort(getSortForEnum(severityEnum, 'severity')) as symptom}
                    <div class="list-item severity {symptom.severity}">
                        <div class="list-title">{symptom.name}</div>
                        <div>{symptom.duration}</div>
                        <div>{symptom.bodyParts}</div>
                    </div>
                    {/each}
                </div>
        {/if}
        

        {#if analysis && analysis.diagnosis}
                <div class="block block-diagnosis">
                    <h4 class="h4">Diagnosis</h4>
                    {#each analysis.diagnosis.sort(sortbyProperty('probability')).reverse() as diagnosis}
                    <div class="list-item">
                        <div>{diagnosis.origin}</div>
                        <div class="list-title">{diagnosis.name}</div>
                        <div>{diagnosis.basis}</div>
                        <div>{diagnosis.probability}</div>
                    </div>
                    {/each}
                </div>
        {/if}

        {#if analysis && analysis.counterMeasures}
                <div class="block block-recommendations">
                    <h4 class="h4">Treatment</h4>
                    {#each analysis.counterMeasures as counterMeasure}
                    <div class="list-item">
                        <div>{counterMeasure.description}</div>
                        <div>{counterMeasure.origin}</div>
                    </div>
                    {/each}
                </div>
        {/if}
        
        {#if analysis && analysis.followUp}
                <div class="block block-follow-up">
                    <h4 class="h4">Follow up</h4>
                    {#each analysis.followUp as followUp}
                    <div class="list-item">
                        <div>{followUp.type}</div>
                        <div>{followUp.name}</div>
                        <div>{followUp.reason}</div>
                        <div>{followUp.origin}</div>
                    </div>
                    {/each}
                </div>
        {/if}

        {#if analysis && analysis.medication}
                <div class="block block-prescriptions">
                    <h4 class="h4">Suggested Medication</h4>
                    {#each analysis.medication as medication}
                    <div class="list-item">
                        <div>{medication.name}</div>
                        <div>{medication.dosage}</div>
                        <div>{medication.days}</div>
                        <div>
                            
                            {getFrequency(medication.days_of_week)}
                            
                        </div>
                        <div>{medication.time_of_day}</div>
                        <div>{medication.origin}</div>
                    </div>
                    {/each}
                </div>
        {/if}

    </div>


        <!--ul>
        
            <li>Doctor suggested diagnosis</li>
            <li>Analysis - suggested diagnosis</li>
            <li>Doctor suggested treatment</li>
            <li>Analysis - suggested treatment</li>
            <li>Doctor suggested follow-up</li>
            <li>Analysis - suggested follow-up</li>
            <li>Doctor suggested prescriptions</li>
            <li>Analysis - suggested prescriptions</li>
        </ul-->

    </div>

    <div>

        <h3 class="h3">Transcript</h3>


    {#if analysis && analysis.conversation}
        <div class="conversation">
            {#each analysis.conversation as message}
                <div class="message -{message.speaker}">
                    <p class="p">{message.text}</p>
                </div>
            {/each}
        </div>
    {/if}

    </div>
    
    {/if}
</div>
<style>
    .canvas {
        display: grid;
        grid-template-columns: 4fr 2fr;
        gap: var(--gap);
        padding-bottom: var(--toolbar-height);
    }
    .canvas > * {
        margin: var(--gap) 0;
        background-color: var(--color-gray-300);
        height: calc(100vh - 2 * var(--gap) -  var(--toolbar-height));
        container-type: inline-size;
        overflow: auto;
    }

    .canvas > * > .h3 {
        position: sticky;
        top: 0;
        padding: 1rem;
        background-color: inherit;
        border-bottom: .1rem solid var(--color-gray-500);
        z-index: 2;
    }

    .record-audio {
        --sound-color: var(--color-interactivity);
        --sound-color-text: var(--color-interactivity-text);
        --speech-color: var(--color-purple);
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        bottom: calc(40% + 3rem);
        width: 60vw;
        height: 60vw;
        left: 50%;
        transform: translate(-50%, calc(50% - 3rem));
        z-index: 1001;
        pointer-events: none;
        transition: bottom .5s;
    }
    .record-audio.-has-results {
        bottom: 1.5rem;
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
        box-shadow: 0 .1rem .2rem -.1rem rgba(0,0,0,.5)
    }
    .record-audio .control.-running {
        background-color: var(--color-white);
        color: var(--sound-color);
    }
    .record-audio .control.-running.speaking {
        color: var(--speech-color);
        border-color: var(--speech-color);
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



    .toolbar > * {
        border-bottom-width: 0;
        border-top-width: 2px;
    }

    .state,
    .spacer {
        max-width: 45vw;
        flex-grow: 1;
    } 
    
    .state {
        position: relative;
        padding: 0;

    }
    .state-text {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .visualizer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: stretch;
        gap: .1rem;
        height: 100%;
        width: 100%;
        overflow: hidden;
        font-weight: var(--text-bold);
    }
    .visualizer.speaking {
        background-color: var(--color-positive);
        color: var(--color-positive-text);
        text-shadow: 0 0 1px var(--color-positive);
    }
    .visualizer.listening {
        background-color: var(--color-info);
        color: var(--color-info-text);
        text-shadow: 0 0 1px var(--color-info);
    }
    /*
    .visualizer.-active {
        background-color: var(--color-info);
        color: var(--color-white);
        text-shadow: 0 0 1px var(--color-info);
    }
        */
    .visualizer > * {
        transition: height .1s;
        opacity: .8;
        background-color: var(--color-white);
        width: calc(100% / 50 - .1rem);
    }
    /*
    .visualizer > .speaking {
        opacity: 1;
    }*/

    .conversation {
        display: flex;
        flex-direction: column;
        margin: 1rem;
        gap: 1rem;
    }

    .message {
        position: relative;
        display: flex;
        gap: .5rem;
        width: 100%;
        background-color: var(--color-info);
        color: var(--color-info-text);
        padding: .5rem;
        border-radius: var(--radius-8);
        font-weight: 600;
    }
    /* message bubble arrow at bottom left */
    .message:after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;

        border-top: 10px solid var(--color-info);
        border-right: 10px solid transparent;
        border-left: 10px solid transparent;
        bottom: -10px;
        left: 10px;
    }
    .message.-nurse,
    .message.-doctor {
        background-color: var(--color-gray-500);
        color: var(--text);
        justify-content: flex-end;
        font-weight: 300;
    }
    .message.-nurse:after,
    .message.-doctor:after {
        right: 10px;
        left: auto;
        border-top: 10px solid var(--color-gray-500);
    }

    .session {
        container-type: inline-size;
        container-name: session;
    }

    .dashboard {

    }
    
    @container session (min-width: 800px) {
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: var(--gap);
        }
    }
    .block {
        display: flex;
        flex-direction: column;
        margin: 1rem;
    }
    .block-complaint {
        background-color: var(--color-negative);
        color: var(--color-negative-text);
        grid-column-start: 1;
        grid-column-end: 3;
        border-radius: var(--radius-8);
        padding: 1rem;
        font-weight: 700;
    }
    .block-complaint p {
        font-size: 1.4rem;
    }

    .block-symptoms {
    }

    .list-item {
        display: flex;
        gap: .5rem;
        padding: .5rem;
        border-radius: var(--radius-8);
        margin-bottom: var(--gap);
        background-color: var(--color-white);
    }

    .list-title {
        flex-grow: 1;
    }

    .mild {
        background-color: var(--color-white);
        color: var(--text);
    }
    .moderate {
        background-color: var(--color-warning);
        color: var(--color-warning-text);
        font-weight: 500;
    }
    .severe {
        background-color: var(--color-negative);
        color: var(--color-negative-text);
        font-weight: 500;
    }
</style>