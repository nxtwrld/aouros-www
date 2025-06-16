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
    //import doctor, { getDoctorSignature } from '$lib/med/doctor';
    import { profile } from '$lib/profiles';
    import { float32Flatten } from '$lib/array';
    import { ANALYZE_STEPS } from '$lib/types.d';
    import { state as uiState } from '$lib/ui';
  
    
    const MIN_AUDIO_SIZE: number = 10000 * 8;
    const MIN_TEXT_LENGTH: number = 100;
    const DEFAULT_WAIT_TIME: number = 10000;
    // UI Session States
    enum Views {
        "start",
        "analysis",
        "report"
    }

    let view: Views = $state(Views.start);

    let models = $state([
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
        ]);

    let texts: string[] = [];
    let audioState: AudioState = $state(AudioState.ready);

    // Real-time session management
    let sessionId: string | null = $state(null);
    let useRealtime: boolean = $state(true); // Enable real-time by default
    let realtimeTranscripts: any[] = $state([]);

    let analysis: any = $state({});

    let silenceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    let speechChunks: Float32Array[] =$state([]);

    let hasResults = $derived(view !== Views.start);

    let newSpeech: boolean = $state(false);

    // Initialize real-time session
    async function initializeSession() {
        console.log('🚀 Initializing real-time session...', { 
            useRealtime, 
            sessionId, 
            currentSessionId: sessionId,
            willInitialize: useRealtime && !sessionId 
        });
        
        if (useRealtime && !sessionId) {
            try {
                console.log('📡 Making request to /v1/session/start...');
                const requestBody = {
                    language: 'cs',
                    models: models.filter(m => m.active).map(m => m.name)
                };
                console.log('📡 Request body:', requestBody);
                
                const response = await fetch('/v1/session/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                console.log('📡 Session start response status:', response.status);
                
                if (!response.ok) {
                    console.error('❌ Session start failed with status:', response.status);
                    const errorText = await response.text();
                    console.error('❌ Error response:', errorText);
                    throw new Error(`Session start failed: ${response.status}`);
                }
                
                const result = await response.json();
                console.log('📡 Session start response data:', result);
                
                if (result.sessionId) {
                    sessionId = result.sessionId;
                    console.log('✅ Real-time session initialized successfully:', sessionId);
                    console.log('✅ Session features:', result.features);
                    console.log('✅ SSE URL:', result.sseUrl);
                    console.log('✅ Audio URL:', result.audioUrl);
                    
                    // Verify sessionId is actually set
                    console.log('🔍 Verification - sessionId after assignment:', sessionId);
                    
                    return true;
                } else {
                    console.error('❌ Failed to initialize session - no sessionId in response:', result);
                    useRealtime = false; // Fall back to traditional processing
                    return false;
                }
            } catch (error) {
                console.error('❌ Session initialization error:', error);
                useRealtime = false; // Fall back to traditional processing
                return false;
            }
        } else {
            console.log('⏭️ Skipping session initialization:', { 
                useRealtime, 
                hasSessionId: !!sessionId,
                reason: !useRealtime ? 'realtime disabled' : 'session already exists'
            });
            return !!sessionId;
        }
    }

    // Handle real-time transcripts
    function handleRealtimeTranscript(transcript: any) {
        console.log('📝 Real-time transcript received in session page:', transcript);
        realtimeTranscripts = [...realtimeTranscripts, transcript];
        
        // Update texts array for display
        if (transcript.is_final) {
            console.log('✅ Final transcript, adding to texts:', transcript.text);
            texts = [...texts, transcript.text];
            
            // Switch to analysis view as soon as we have meaningful content
            const totalTextLength = texts.join(' ').length;
            const shouldSwitchToAnalysis = totalTextLength > 20 && view === Views.start;
            
            console.log('📊 Transcript view switch decision:', {
                totalTextLength,
                currentView: view,
                shouldSwitch: shouldSwitchToAnalysis,
                transcriptText: transcript.text
            });
            
            if (shouldSwitchToAnalysis) {
                console.log('🔄 Switching to analysis view based on transcript content');
                view = Views.analysis;
            }
        }
    }

    // Handle real-time analysis updates
    function handleRealtimeAnalysis(analysisUpdate: any) {
        console.log('🔬 Real-time analysis received in session page:', analysisUpdate);
        console.log('🔬 Analysis update structure:', {
            hasDiagnosis: !!analysisUpdate.diagnosis,
            diagnosisLength: analysisUpdate.diagnosis?.length || 0,
            diagnosisType: typeof analysisUpdate.diagnosis,
            hasTreatment: !!analysisUpdate.treatment,
            treatmentLength: analysisUpdate.treatment?.length || 0,
            treatmentType: typeof analysisUpdate.treatment,
            hasIncremental: !!analysisUpdate.incremental,
            fullKeys: Object.keys(analysisUpdate)
        });
        
        // Merge with existing analysis
        const oldAnalysis = { ...analysis };
        analysis = { ...analysis, ...analysisUpdate };
        
        console.log('🔬 Analysis state after merge:', {
            oldDiagnosisLength: oldAnalysis.diagnosis?.length || 0,
            newDiagnosisLength: analysis.diagnosis?.length || 0,
            oldTreatmentLength: oldAnalysis.treatment?.length || 0,
            newTreatmentLength: analysis.treatment?.length || 0,
            currentView: view,
            Views: Views
        });
        
        // Switch to analysis view if we have meaningful results
        const shouldSwitchView = (analysisUpdate.diagnosis?.length > 0 || 
                                 analysisUpdate.treatment?.length > 0 ||
                                 analysis.diagnosis?.length > 0 ||
                                 analysis.treatment?.length > 0);
        
        console.log('🔬 View switch decision:', {
            shouldSwitchView,
            currentView: view,
            targetView: Views.analysis,
            conditions: {
                updateHasDiagnosis: analysisUpdate.diagnosis?.length > 0,
                updateHasTreatment: analysisUpdate.treatment?.length > 0,
                analysisHasDiagnosis: analysis.diagnosis?.length > 0,
                analysisHasTreatment: analysis.treatment?.length > 0
            }
        });
        
        if (shouldSwitchView) {
            console.log('🔄 Switching to analysis view due to real-time results');
            view = Views.analysis;
        } else {
            console.log('⏸️ Not switching view - no meaningful analysis results yet');
        }
    }

    function speechStart() {
        newSpeech = true;
        console.log('🗣️ Speech started in session page');
        
        if (silenceTimer) {
            clearTimeout(silenceTimer);
        }
        if (analysisTimer) {
            clearTimeout(analysisTimer);
        }
    }

    // Initialize session on page load instead of waiting for speech
    async function ensureSessionReady() {
        if (useRealtime && !sessionId) {
            console.log('🚀 Ensuring session is ready...');
            await initializeSession();
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
    let activeModels: string[] = $state([]);
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


    let finalizeReportState = $state('idle');
    let report: any = $state(undefined);
    let finalReport: any = $state(undefined);
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
            doctor: {}
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
        report.doctor = 'doctor signature'

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
        console.log('🏁 Session page mounted', { useRealtime, sessionId });
        
        // Initialize session immediately if real-time is enabled
        if (useRealtime) {
            console.log('🚀 Auto-initializing session on mount...');
            ensureSessionReady();
        }
        
        // Add test function to verify backend is working
        window.testSessionAPI = async () => {
            console.log('🧪 Testing session API...');
            try {
                const response = await fetch('/v1/session/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        language: 'cs',
                        models: ['GP']
                    })
                });
                console.log('🧪 Test response status:', response.status);
                const result = await response.json();
                console.log('🧪 Test response data:', result);
                return result;
            } catch (error) {
                console.error('🧪 Test failed:', error);
                return error;
            }
        };
        
        console.log('🧪 Added window.testSessionAPI() - call this in console to test backend');
        
        // Log initial state
        console.log('📊 Initial session state:', {
            view,
            useRealtime,
            sessionId,
            models: models.filter(m => m.active).map(m => m.name),
            audioState
        });
    })


</script>


{#if view !== Views.report}
    <div class="audio-recorder" class:-running={view != Views.start} class:-active={audioState === AudioState.listening || audioState === AudioState.speaking}>
        <AudioButton 
            bind:state={audioState} 
            {hasResults} 
            bind:speechChunks={speechChunks} 
            sessionId={sessionId || undefined}
            {useRealtime}
            on:speech-end={() => processData()} 
            on:speech-start={speechStart}
            ontranscript={handleRealtimeTranscript}
            onanalysis={handleRealtimeAnalysis}
        />
    </div>
{/if}
<div class="models">
<Models bind:models={models} {activeModels} />
</div>

{#if view === Views.start}
    <div class="canvas canvas-start">
        <div>
            <button class="uhint" onclick={testAnalyze} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); testAnalyze(); } }} aria-label="Test analysis with sample data">
                {#if audioState === AudioState.listening || audioState === AudioState.speaking}
                    Listening...
                {:else}
                    Start recording your session by clicking the microphone button.
                {/if}
            </button>

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
                            <button class="button -primary" onclick={finalizeReport}>Finalize Report</button>
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
                <button class="button" onclick={backToAnalysis}>Back</button>
                <button class="button" onclick={copyReportText}>Copy</button>
                <button class="button" onclick={printReport}>Print</button>
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
        transition: bottom .3s, left .3s, z-index .1s;
        transition-timing-function: ease-in;
    }
    .audio-recorder.-active {
        z-index: 200000;
    }
    .audio-recorder.-running {
        left: calc(100% / 6 * 5);
        bottom: 1.5rem;
    }

    /* Adjust position when viewer is open */
    :global(main.layout.-viewer) .audio-recorder {
        left: calc(33vw + 67vw / 2); /* Viewer width + half of remaining content width */
    }
    :global(main.layout.-viewer) .audio-recorder.-running {
        left: calc(33vw + 67vw / 6 * 5); /* Adjust running position for viewer */
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