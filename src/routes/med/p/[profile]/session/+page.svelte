<script lang="ts">
    import { type Profile } from '$slib/med/types.d';
    import { AudioState, getAudio, getAudioVAD, convertBlobToMp3, convertFloat32ToMp3, type AudioControlsVad} from '$slib/audio/microphone';
    import { connectTranscript } from '$slib/transcript';
    import { onMount, onDestroy } from 'svelte';
    import ProfileView from '$scomponents/patient/Profile.svelte';
    import SessionView from '$scomponents/patient/Session.svelte';

    export let data: {
        profile
    }

    const CHUNK_COUNT = 100;
    const profile: Profile = data.profile;

    // UI Session States


    let state: AudioState = AudioState.ready;

    let conversation: string = '';

    let audio: AudioControlsVad | Error;

    let analyzer: {
        state: AudioState;
        rms: number;
        energy: number;
    }[] = emptyAnalyzer();

    function emptyAnalyzer() {
       return (new Array(50)).fill({
        state: AudioState.ready,
        rms: 0,
        energy: 0
    }); 
    }

    let speechChunks: Float32Array[] =[];

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

            analyzer = [...analyzer.slice(1), {
                state: audio.state,
                ...d
            }];
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
            analyzer = emptyAnalyzer();
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
    let texts: string[] = [];


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

    let lastAnalyzedTextLength: number = 0;
    let analysis: any;
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
    })


</script>



 <div class="session-controls">
    <nav class="toolbar">
        <div class="language">CZ</div>             
        <div class="state">
            <div class="visualizer {state}" class:-active={[AudioState.listening, AudioState.speaking, AudioState.stopping].includes(state)}>
                {#each analyzer as analyzer}
                    <div class="energy {analyzer.state}" style="height: {4 * analyzer.energy}%"></div>
                {/each}
            </div>
            <div class="state-text">{state}</div>
        </div>
        
        <button class="control" on:click={toggleSession}>
            {#if state == AudioState.stopping}
            ....
            {:else if state === AudioState.listening ||  state === AudioState.speaking}
                STP
            {:else}
                REC
            {/if}
        </button>
        <div class="spacer"></div>
        <button class="finalize">Finalize</button>
    </nav>
</div>
<div class="canvas">

    <div class="user-profile">

        <ProfileView />
        <ul>
            <li>Latest Lab results in charts</li>
            <li>Medical History
                <ul>
                    <li>Timeline of events</li>
                </ul>
            </li>
        </ul>
        
    </div>
    <div class="session">
        <SessionView />

        {#each texts as text}
            <p>{text}</p>
            
        {/each}

        <h3 class="h3">Analysis</h3>
        <button on:click={testAnalyze} class="button">Analyze Test</button>

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
                    {#each analysis.symptoms as symptom}
                    <div class="list-item severity {symptom.severity}">
                        <div>{symptom.name}</div>
                        <div>{symptom.severity}</div>
                        <div>{symptom.duration}</div>
                        <div>{symptom.bodyParts}</div>
                    </div>
                    {/each}
                </div>
        {/if}
        

        {#if analysis && analysis.diagnosis}
                <div class="block block-diagnosis">
                    <h4 class="h4">Diagnosis</h4>
                    {#each analysis.diagnosis as diagnosis}
                    <div>
                        <div>{diagnosis.name}</div>
                        <div>{diagnosis.origin}</div>
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
                    <div>
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
                    <div>
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
                    {#each analysis.medication as medication}
                    <div>
                        <div>{medication.name}</div>
                        <div>{medication.dosage}</div>
                        <div>{medication.days}</div>
                        <div>{medication.days_of_week}</div>
                        <div>{medication.time_of_day}</div>
                        <div>{medication.origin}</div>
                    </div>
                    {/each}
                </div>
        {/if}

    </div>


        <h3 class="h3">Transcript</h3>
        <div>
            

                {#each results as result}
                    {#await result}
                        <p>Processing...</p>
                    {:then result}
                        <p>{result.text}</p>
                    {:catch error}
                        <p>Processing error: {error}</p>
                    {/await}
                {:else}
                <p>Start recording to generate transcript</p>
                {/each}

                {#if analysis && analysis.conversation}
                    <div class="conversation">
                        <h4 class="h4">Conversation</h4>
                        {#each analysis.conversation as message}
                            <div class="message -{message.speaker}">
                                <div>{message.text}</div>
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

    

</div>
<style>
    .canvas {
        display: grid;
        grid-template-columns: 1fr 3fr;
        gap: 0;

    }
    .canvas > * {
        margin: 1rem 0;
    }

    .session-controls {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: stretch;
        align-items: stretch;
        gap: .5rem;
        height: var(--toolbar-height);
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
        border-radius: .5rem;
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
        background-color: #f0f0f0;
        justify-content: flex-end;
    }
    .message.-nurse:after,
    .message.-doctor:after {
        right: 10px;
        left: auto;
        border-top: 10px solid #f0f0f0;
    }


    .dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 1rem;
    }

    .block {
        padding: 1rem;
        background-color: #f0f0f0;
        border-radius: .5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .block-complaint {
        background-color: #ff8a8a;
        grid-column-start: 1;
        grid-column-end: 3;
    }
</style>