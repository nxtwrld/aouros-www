<script lang="ts">
    //import { type Profile } from '$slib/med/types.d';
    import { AudioState, convertFloat32ToMp3} from '$slib/audio/microphone';
    import { onMount} from 'svelte';
    import Diagnosis from '$scomponents/patient/Session/Diagnosis.svelte';
    import Models from '$scomponents/patient/Session/Models.svelte';
    import Transcript from '$scomponents/patient/Session/Transcript.svelte';
    import AudioButton from '$scomponents/patient/Session/AudioButton.svelte';
    import LoaderThinking from '$scomponents/LoaderThinking.svelte';
    import Report from '$scomponents/patient/Session/FinalizeReport.svelte';
    import doctor, { getDoctorSignature } from '$slib/med/doctor';
    import { patient } from '$slib/med/patients';
 

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

    let lastAnalyzedTextLength: number = 0;
    let analysis: any = undefined;

 
    let speechChunks: Float32Array[] =[];


    $: hasResults = analysis;// || texts.length > 0;


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

    let activeModels: string[] = [];
    async function analyzeTranscription() {
        let text = texts.join('\r\n');
        if (text.length === lastAnalyzedTextLength + 100) {
            return;
        }
        activeModels = models.filter(m => m.active).map(m => m.name);
        lastAnalyzedTextLength = text.length;
        const result = await fetch('/v1/med/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: 'czech',
                models: activeModels,
                text
            })
        });
        analysis = await result.json();
        view = Views.analysis;
        activeModels = [];
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
            patient: $patient,
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
        testAnalyze();
    })


</script>


{#if view !== Views.report}
<AudioButton bind:state={audioState} {hasResults} bind:speechChunks={speechChunks} on:speech-end={processData} />
{/if}
<div class="models">
<Models bind:models={models} {activeModels} />
</div>

{#if view === Views.start}
    <div class="canvas canvas-start">
        Start
    </div>
{:else if view === Views.analysis}
    <div class="canvas canvas-analysis">
        {#if hasResults}
            <div class="session">
                <div class="title">
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

            <div>
                <div class="title">
                    <svg>
                        <use href="/icons-o.svg#transcript"></use>
                    </svg>
                    <h3 class="h3">Transcript</h3>
                </div>

                {#if analysis && analysis.conversation}
                    <Transcript conversation={analysis.conversation} />
                {/if}


            </div>
        
        {/if}
    </div>
{:else if view == Views.report}
    <div class="canvas canvas-report">
        <div>
            <div class="title">
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

    .title {
        position: sticky;
        top: 0;
        padding: 0 1rem;
        background-color: inherit;
        display: flex;
        align-items: center;
        gap: .5rem;
        border-bottom: .1rem solid var(--color-gray-500);
        height: var(--toolbar-height);
        z-index: 2;
    }
    .title h3 {
        flex-grow: 1;
        margin: 0;
    }

    .title svg {
        width: 1.5rem;
        height: 1.5rem;
        fill: currentColor;
    }

    .title .loader {
        --color: var(--color-neutral);
        height: 1.5rem;
        
        display: flex;
        align-items: center;
        gap: .5rem;
        flex-wrap: nowrap;

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

    @media print {
        @page  {
            size: auto;   /* auto is the initial value */
            margin: 0mm;  /* this affects the margin in the printer settings */
        }
        :global(body) {
            background-color: #FFF;
            margin: 1.6cm; 
        }
        :global(header),
        :global(footer),
        .models,
        .canvas .title{ 
            display: none;
        }
        :global(main),
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