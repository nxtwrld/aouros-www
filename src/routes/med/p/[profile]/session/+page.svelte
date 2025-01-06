<script lang="ts">
    //import { type Profile } from '$lib/types.d';
    import { AudioState, convertFloat32ToMp3} from '$lib/audio/microphone';
    import { onMount} from 'svelte';
    import Diagnosis from '$components/profile/Session/Diagnosis.svelte';
    import Models from '$components/profile/Session/Models.svelte';
    import Transcript from '$components/profile/Session/Transcript.svelte';
    import AudioButton from '$components/profile/Session/AudioButton.svelte';
    import LoaderThinking from '$components/ui/LoaderThinking.svelte';
    import Report from '$components/profile/Session/FinalizeReport.svelte';
    import doctor, { getDoctorSignature } from '$lib/med/doctor';
    import { profile } from '$lib/profiles';
    import { float32Flatten } from '$lib/array';
    import { ANALYZE_STEPS } from '$lib/types.d';
  
    
    const MIN_AUDIO_SIZE: number = 100000 * 2;
    const MIN_TEXT_LENGTH: number = 100;
    const DEFAULT_WAIT_TIME: number = 15000;
    // UI Session States
    enum Views {
        "start",
        "analysis",
        "report"
    }

    let view: Views = Views.start;

    let models = [
            {
                name: 'GP',
                active: true,
                available: true,
                disabled: false
            },
            {
                name : 'PT',
                active: false,
                available: false,
                disabled: true
            },
            {
                name: 'VOICE',
                active: false,
                available: false,
                disabled: true
            }
        ];

    let texts: string[] = [];
    let audioState: AudioState = AudioState.ready;


    let analysis: any = {};

    let silenceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    let speechChunks: Float32Array[] =[];


    $: hasResults = view !== Views.start;


    let newSpeech: boolean = false;

    function speechStart() {
        newSpeech = true;
        console.log('Speech started');
        if (silenceTimer) {
            // cancel waiting for silence
            clearTimeout(silenceTimer);
        }
        if (analysisTimer) {
            // cancel waiting for silence
            clearTimeout(analysisTimer);
        }
    }



    let processingStatus = 'idle';
    let waitingRequest: boolean = false;
    async function processData(forceTranscription: boolean = false) {

        if (silenceTimer) {
            clearTimeout(silenceTimer);
        }

        // we are already processing a batch
        if (processingStatus === 'processing') {
            waitingRequest = true;
            console.log('Already processing previous batch');
            return;
        }

        // no data to process
        if (speechChunks.length === 0) {
            console.log('No data to process');
            return;
        }

        // we are not ready to transcribe - we want to wait for more data
        if (!shouldWeTranscript() && !forceTranscription) {
            console.log('Not enough data to process');
            silenceTimer = setTimeout(() => {
                // force the transcription after 10 seconds of silence
                console.log('Forcing transcription');
                processData(true);
            }, DEFAULT_WAIT_TIME);
            return;
        }
        waitingRequest = false;
        processingStatus = 'processing';
        console.log('Processing audio data');

        const chunk: Float32Array = float32Flatten(speechChunks);
        speechChunks = [];

    
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
            console.log('Transcript result', transcript);
            
            texts = [...texts, transcript.text];
            processingStatus = 'idle';
            analyzeTranscription(ANALYZE_STEPS.transcript, forceTranscription);

        } catch (e) {
            console.error(e);
            processingStatus = 'idle';
        }
       

    }

    function shouldWeTranscript(): boolean {
        const size = speechChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        console.log('Audio size: ', size, size > MIN_AUDIO_SIZE);

        if (size > MIN_AUDIO_SIZE) {
            return true;
        }
        return false;
    }

    let lastAnalyzedTextLength: number = 0;
    let activeModels: string[] = [];
    let analysisTimer: ReturnType<typeof setTimeout> | undefined = undefined;  


    //console.log(Object.keys(ANALYZE_STEPS).filter(key => isNaN(Number(key))))

    async function analyzeTranscription(type: ANALYZE_STEPS = ANALYZE_STEPS.transcript, forceAnalysis: boolean = false) {
        

        if (processingStatus === 'processing') {
            console.log('Already processing next batch - wait for it to finish');
            return;
        }

        if (analysisTimer) {
            clearTimeout(analysisTimer);
        }

        let text = texts.join('\r\n');

        if (type == ANALYZE_STEPS.transcript && text.length === lastAnalyzedTextLength) {
            console.log('No new data to analyze');
            return;
        }

        if (type == ANALYZE_STEPS.transcript && text.length === lastAnalyzedTextLength + MIN_TEXT_LENGTH && !forceAnalysis) {
            console.log('Not enough data to analyze');
            analysisTimer = setTimeout(() => {
                console.log('Forcing analysis');
                analyzeTranscription(type, true);
            }, DEFAULT_WAIT_TIME);
            return;
        }

        console.log('Analyzing', type);

        // currently running models
        activeModels = models.filter(m => m.active).map(m => m.name);
        lastAnalyzedTextLength = text.length;

        const response = await fetch('/v1/med/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: 'czech',
                type,
                models: activeModels,
                text : (type === ANALYZE_STEPS.transcript) ? text : JSON.stringify(analysis)
            })
        });
        const result = await response.json();

        newSpeech = false;
        activeModels = [];

        // check if the conversation is medical - if not, end the analysis
        if (result.hasOwnProperty('isMedicalConversation') && result.isMedicalConversation === false) {
            console.log('Not a medical conversation. Ending analysis.');
            return;
        }
        
        analysis = Object.assign(analysis || {}, result);
        view = Views.analysis;

        console.log('Analysis complete', analysis);
        
        // if the analysis is complete, start the next step, if we are not already processing a new batch, wait for it to finish
        if (type == ANALYZE_STEPS.transcript && processingStatus === 'idle' && !waitingRequest) {
            // analysis second step (only when no newer batch is being processed)
            analyzeTranscription(ANALYZE_STEPS.diagnosis);
        }

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
            'Máte na něm bílý povlak. To vypadá na angínu',
            'Počkejte chvíli, ještě vám vezmu tlak. Máme se svélknout? Ne to je zbytečný, stačí, když si vyhrnete rukáv Jasně.',
            'sto dvacet sedm na osmdesát. To je v pořádku. Máte zánět hltanu a angínu. Dostanete antibiotika a budete muset zůstat doma.',
            'Dobře, děkuji. A co s tím zrakem?',
            'To je zřejmě způsobeno horečkou. Po vyléčení by to mělo ustoupit. Pokud ne, tak se vraťte.',
            'Doporučuji vám také hodně pít a odpočívat a předepíšu vám aspirin. Máte nějaké otázky? asi teď ne',
            'Kdyby se to zhoršilo, tak se hned vraťte. Případně mě můžete kontaktovat telefonicky. Když se to nezlepší do týdbe, tak se vraťte.',
            'Tak. jo. Děkuji. Na shledanou.',
            'Na shledanou.'
            
        ];
        analyzeTranscription();
    }


    let finalizeReportState = 'idle';
    let report: any = undefined;
    let finalReport: any = undefined;
    let finalizationData: string = '';
    async function finalizeReport() {
        if (finalizeReportState === 'processing') {
            return;
        }
        const currentState = JSON.stringify(analysis);
        if (finalizationData == currentState) {
            console.log('current state...no need to finalize');
            view = Views.report;
            return;
        }
        finalizationData = currentState;

        finalizeReportState = 'processing';
        const toFinalize = {
            date: (new Date()).toISOString(),
            complaint: analysis.complaint,
            symptoms: analysis.symptoms,
            diagnosis: selectFinals(analysis.diagnosis),
            treatment: selectFinals(analysis.treatment),
            results: selectFinals(analysis.results, 0),
            followUp: selectFinals(analysis.followUp),
            medication: selectFinals(analysis.medication),
            patient: $profile,
            doctor: $doctor
        };

        console.log('Finalized', toFinalize);
        const result = await fetch('/v1/med/session/finalize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: 'czech',
                text: JSON.stringify(toFinalize)
            })
        });
        report = await result.json();
        finalReport = report;
        report.doctor = getDoctorSignature();

        console.log(report);
        view = Views.report;
        finalizeReportState = 'idle';
    }


    function copyReportText () {
        let text = '';
        for (const key in finalReport) {
            text += `${finalReport[key]}\r\n\n`;
        }
        navigator.clipboard.writeText(text);
    }

    function printReport() {
        window.print();
    }


    function selectFinals(objectArray: {
        pinned: boolean;
        [key: string]: any;
    }[], defaultCount: number = 1): {
        pinned: boolean;
        [key: string]: any;
    }[] {
        let final = objectArray.filter(o => o.pinned);
        if (final.length > 0) return final;
        if (defaultCount > 0) return objectArray.slice(0, defaultCount);
        return objectArray;
    }

    function backToAnalysis() {
        view = Views.analysis;
    }

    onMount(() => {
        //socket.emit('eventFromClient', 'Hello from client')
        //testAnalyze();
    })


</script>


{#if view !== Views.report}
    <div class="audio-recorder" class:-running={view != Views.start}>
        <AudioButton bind:state={audioState} {hasResults} bind:speechChunks={speechChunks} on:speech-end={() => processData()} on:speech-start={speechStart} />
    </div>
{/if}
<div class="models">
<Models bind:models={models} {activeModels} />
</div>

{#if view === Views.start}
    <div class="canvas canvas-start">
        <div>
            <div class="uhint" on:click={testAnalyze}>
                {#if audioState === AudioState.listening || audioState === AudioState.speaking}
                    Listening...
                {:else}
                    Start recording your session by clicking the microphone button.
                {/if}
            </div>

        </div>
    </div>
{:else if view === Views.analysis}
    <div class="canvas canvas-analysis">
        {#if hasResults}
            <div class="session">
                <div class="p-title">
                        <svg>
                            <use href="/icons-o.svg#diagnosis"></use>
                        </svg>
                        <h3 class="h3">Assisted Analysis</h3>
                        {#if finalizeReportState === 'processing'}
                            <div class="loader">
                                <div>Finalizing</div> <LoaderThinking />
                            </div>
                        {:else}
                            <button class="button -primary" on:click={finalizeReport}>Finalize Report</button>
                        {/if}

                </div>
                <div class="dashboard">
                    {#if analysis}
                        <Diagnosis bind:analysis={analysis} />
                    {/if}
                </div>
            </div>

            <div class="transcript">
                <div class="p-title">
                    <svg>
                        <use href="/icons-o.svg#transcript"></use>
                    </svg>
                    <h3 class="h3">Transcript</h3>
                </div>

                {#if analysis && analysis.conversation}
                    <Transcript conversation={analysis.conversation} {newSpeech}/>
                {/if}


            </div>
        
        {/if}
    </div>
{:else if view == Views.report}
    <div class="canvas canvas-report">
        <div>
            <div class="p-title">
                <svg>
                    <use href="/icons-o.svg#report"></use>
                </svg>
                <h3 class="h3">Report</h3>
                <button class="button" on:click={backToAnalysis}>Back</button>
                <button class="button" on:click={copyReportText}>Copy</button>
                <button class="button" on:click={printReport}>Print</button>
                <button class="button -primary">Save</button>
            </div>
            <div class="report-background">
                <div class="report-page">
                    <Report report={report} bind:finalReport={finalReport}/>
                </div>
            </div>

        </div>
    </div>
{/if}
<style>

    .audio-recorder {
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
        transition: bottom .3s, left .3s;
        transition-timing-function: ease-in;
    }
    .audio-recorder.-running {
        left: calc(100% / 6 * 5);
        bottom: 1.5rem;
    }

    .canvas-analysis {
        display: grid;
        grid-template-columns: 4fr 2fr;
        gap: var(--gap);
    }
    .canvas > * {
        margin: var(--gap) 0;
        background-color: var(--color-gray-300);
        height: calc(100vh - 2 * var(--gap) -  var(--toolbar-height) - 4rem); /* TODO: 4rem for models */
        container-type: inline-size;
        padding-bottom: 2rem;
        overflow: auto;
    }
    .transcript {
        overflow: hidden;
    }


    .report-background {
        padding: 1rem;
        min-height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .report-page {
        background-color: var(--color-white);
        margin: 0 auto;
        width: 100%;
        max-width: 800px;
        aspect-ratio: 1/1.414;
        box-shadow: 0 .5rem 1rem 0 var(--color-gray-800);
    }

    .session {
        container-type: inline-size;
        container-name: session;
    }

    .dashboard {
        margin-top: 1rem;
        column-gap: 0;
    }
    
    @container session (min-width: 800px) {
        .dashboard {
            /*display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: var(--gap);*/
            columns: 2;
        }
    }
    @container session (min-width: 1200px) {
        .dashboard {
            columns: 3;
        }
    }


    .canvas-start > * {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 2rem;
    }
    .canvas-start .uhint {
        padding-top: 12rem;
        color: var(--color-blue);
    }

    @media print {
        @page  {
            size: auto;   /* auto is the initial value */
            margin: 0mm;  /* this affects the margin in the printer settings */
        }
        :global(body) {
            background-color: #FFF !important;
            margin: 1.6cm !important; 
        }
        :global(header),
        :global(footer),
        .models,
        .canvas .p-title { 
            display: none !important;
        }
        :global(main),
        .report-background,
        .canvas > * {
            padding: 0 !important;
            margin: 0 !important;
            height: auto;
            background-color: none;
        }
        .canvas {
            margin: 0;
            padding: 0;
            height: auto;
            overflow: visible;
            background-color: none;
        }
        .report-page {
            width: 100%;
            box-shadow: none;
        }

    }
</style>