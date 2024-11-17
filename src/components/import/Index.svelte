
<script lang="ts">
    import { files, createTasks, processTask } from '$lib/files';
    import { processDocument } from '$lib/import';
    import { type Document, DocumentState, type Task, TaskState  } from '$lib/import';
    import { addDocument } from '$lib/med/documents';
    import  user from '$lib/user';
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import tempResults from './tempResults.json';
    import ScanningAnimation from './ScanningAnimation.svelte';
    import DocumentView from '$components/documents/DocumentView.svelte';
    import SelectProfile from './SelectProfile.svelte';
    import { play } from '$components/ui/Sounds.svelte';
    import { state } from '$lib/ui';
    import { excludePossibleDuplicatesInPatients } from '$lib/med/profiles';
    import Modal from '$components/ui/Modal.svelte';

    
    let documents: Document[] = [];
    let results: any = [];//empResults;
    let invalids: any = [];
    let tasks: Task[] = [];

    let currentFiles: File[] = [];
    let processingFiles: File[] = [];
    let processedCount: number = 0;

    $: remainingScans = ($user?.subscriptionStats?.scans || 0) - processedCount;

    enum AssessingState {
        IDLE = 'IDLE',
        ASSESSING = 'ASSESSING',
    }

    enum ProcessingState {
        IDLE = 'IDLE',
        PROCESSING = 'PROCESSING',
    }
    let processingState = ProcessingState.IDLE;
    let assessingState = AssessingState.IDLE;


    function fileInput(e: any) {     
        files.set([...$files, ...e.target.files]);
    }

    
    files.subscribe(value => {
        prepareFiles(value);
        /*
        if (value.length > 0) {
            console.log('subscribed', value);
            currentFiles = mergeFiles(value);
            const toBeProcessed = currentFiles.filter(file => !processingFiles.includes(file));

            if (toBeProcessed.length > 0) {
                processingFiles = [...processingFiles, ...toBeProcessed];
                analyze(toBeProcessed);
            }
            files.set([]);
        }*/
    });

    function prepareFiles(value: File[]) {
        if (value.length > 0) {
            //console.log('preparing....', value);
            currentFiles = mergeFiles(value);
            const toBeProcessed = currentFiles.filter(file => !processingFiles.includes(file));
            //console.log('toBeProcessed', toBeProcessed);
            if (toBeProcessed.length > 0) {
                play('focus');
                processingFiles = [...processingFiles, ...toBeProcessed];
                analyze(toBeProcessed);
            } else  {
                play('error');
            }
            //console.log('processingFiles', processingFiles);
            files.set([]);
        }
    }

    onMount(() => {
        //files.set([]);
        //prepareFiles($files);
    });


    function mergeFiles(files: File[]) {

        // filter out files that are already in the currentFiles based on name and size
        files = files.filter(file => {
            return !currentFiles.some(f => f.name === file.name && f.size === file.size);
        });


        return [...currentFiles, ...files];
    }

    async function analyze(files: File[]) {
        const newTasks  = await createTasks(files)
        tasks = [...tasks, ...newTasks];
        //assess();
    }

    async function assess() {
        // STEP 1: assess, split and preprocess files
        if (tasks.length === 0) {
            //console.log('no more tasks');
            return;
        }

        if (assessingState === AssessingState.ASSESSING) {
            // we are still processing the previous tasks no need to start again
            //console.log('still processing');
            return;
        }

        assessingState = AssessingState.ASSESSING;

        const task = tasks[0]
        task.state = TaskState.ASSESSING;
        tasks  = [...tasks];
        const doc = await processTask(task);
        const valid = doc.filter(d => d.isMedical);
        const invalid = doc.filter(d => !d.isMedical);
        tasks = tasks.slice(1);
        documents = [...documents, ...valid];
        invalids = [...invalids, ...invalid];
        console.log('documents', documents);
        process();
        processedCount++;
        assessingState = AssessingState.IDLE;
        //documents = await processFiles(files);

    }

    async function process() {
        if (processingState === ProcessingState.PROCESSING) {
            return;
        }        
        processingState = ProcessingState.PROCESSING;
        while(documents.length > 0) {
            const doc = documents[0];
            doc.state = DocumentState.PROCESSING;
            documents = [...documents];
            const report = await processDocument(doc, $user?.language);
            documents = documents.slice(1);
            results = [
                ...results,
                {

                    ...doc,
                    state: DocumentState.PROCESSED,
                    title: report.report.title,
                    content: {
                        tags: report.tags,
                        ...report.report
                    },
                    attachments : doc.attachments,
                    profile: undefined
                }
            ]
            play('focus');
        }
        processingState = ProcessingState.IDLE;
        console.log('result', results);
        // lets do another task....
        assess();
        
    }

    function add() {

        console.log('Saving.... TODO', results);
        console.log('1. checking for new profiles.... TODO');
        // 1. check if new profiles need to be created - create just
        // 1.1 filter out NEW profiles
        // 1.2 normalize patient inputs
        // 1.3 exclude possible duplicates
        const newProfiles = excludePossibleDuplicatesInPatients(results.filter(doc => doc.profile.id === 'NEW').map(doc => doc.profile));


        console.log('newProfiles', newProfiles);

        // 2. add the documents to the database for each new profile
        console.log('2. saving.... TODO')

        /*addDocument({
            title: 'Test',
            tags: ['test'],
            pages: [],
            isMedical: true,
        });*/
    }

    let previewReport: Document | null = null;
    let showPreviewDisabled: boolean = false;

</script>

<div class="page -empty">
{#if $user.subscriptionStats?.scans <= 0}
    <div class="alert -warning">
        { $t('app.import.maxium-scans-reached', { values: {
            limit: $user.subscriptionStats?.default_scans
        }}) } { $t('app.upgrade.please-upgrade-your-subscription-to-continue') }
    </div>
{:else}

    <h3 class="h3 heading">{ $t('app.import.import-reports-scan-or-images') }</h3>

    <input type="file" id="upload-file" class="-none" accept=".pdf" on:change={fileInput} />
    
    <div class="import-canvas">
        <div class="imports">
            {#each [...results] as doc}
            <div class="report-import">
                <button class="report {doc.state}" on:click={() => previewReport = doc}>
                    <div class="preview">
                    {#if doc.pages[0]?.thumbnail}
                        <img src={doc.pages[0].thumbnail} alt={doc.title} class="thumbmail" />
                    {/if}
                    </div>
                    <div class="title">{doc.content.title}</div>

                </button>

        

                <SelectProfile contact={doc.content.patient} bind:selected={doc.profile}  />

            </div>
            {/each}
            {#each [...documents] as doc}
            <div class="report-import">
                <div class="report {doc.state}">
                    <div class="preview">
                    {#if doc.pages[0]?.thumbnail}
                        <img src={doc.pages[0].thumbnail} alt={doc.title} class="thumbmail" />
                    {/if}
                    <ScanningAnimation running={doc.state === DocumentState.PROCESSING} />
                    </div>
                    <div class="title">{doc.title}</div>
                    <div class="status">
                        {doc.state}
                    </div>
                </div>
            </div>
            {/each}
            {#each invalids as doc}
            <div class="report-import">
                <div class="report ERROR">
                    <div class="preview">
                    {#if doc.pages[0]?.thumbnail}
                        <img src={doc.pages[0].thumbnail} alt={doc.title} class="thumbmail" />
                    {/if}
                    </div>
                    
                    <div class="title">{doc.title}</div>
                    <div class="status">
                        ERROR
                    </div>
                </div>  
            </div>
            {/each}
            {#each tasks as task}
            <div class="report-import">
                <div class="report {task.state}">
                    <div class="preview">
                        <svg class="icon">
                            <use href="/files.svg#{task.icon}" />
                        </svg>
                        <ScanningAnimation running={task.state === TaskState.ASSESSING} />
                    </div>
                    <div class="title">
                        {task?.name}
                    </div>
                    <div class="status">
                        {task.state}
                    </div>
                </div>
            </div>
            {/each}
            <div class="report-import">
            <label for="upload-file" class="button report">
                <div class="preview">
                    <svg>
                        <use href="/icons.svg#add-file" />
                    </svg>
                </div>

                <div class="title">
                    { $t('app.import.add-files') }
                </div>
            </label>
            </div>
        </div>
    </div>
    <div class="controls">
        <p>{ $t('app.import.you-still-have-scans-in-your-yearly-subscription', { values: { scans: remainingScans} }) }</p>
        <div class="actions">
            <button on:click={assess} class="button -primary -large" disabled={tasks.length == 0}>{ $t('app.import.analyze-reports') }</button>
            <button class="button -large" on:click={add} disabled={results.lenght == 0}>{ $t('app.import.save') }</button>
        </div>
    </div>

{/if}

</div>
{#if previewReport}
    <div class="overlay">
        <div class="preview-report">
            <div class="heading">
                <h3 class="h3 heading">{previewReport.content.title}</h3>
                <div class="actions">
                    <button class="-close" on:click={() => previewReport = null}>
                        <svg>
                            <use href="/icons.svg#close" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="page -empty">
                <div class="preview-container">
                    <DocumentView document={previewReport} />
                    <button on:click={() => showPreviewDisabled = true} class="preview-preventer">
                    </button>
                </div>
            </div>
        </div>
    </div>
    {#if showPreviewDisabled}
        <Modal on:close={() => showPreviewDisabled = false}>
            <p class="p preview-disabled-message">{ $t('app.import.preview-disabled') }</p>
        </Modal>
    {/if}
{/if}

<style>
    .thumbmail {
        max-width: 6rem;
        max-height: 6rem;
        object-fit: contain;
        border: 1px solid var(--color-gray-500);
        box-shadow: 0 .4rem .5rem -.3rem rgba(0, 0, 0, 0.3);

    }
    .import-canvas {
        display: flex;
        align-items: center;
        justify-content: center;
        height: calc(100vh - var(--heading-height) - var(--toolbar-height) - 10rem);
    }

    .imports {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: center;
        gap: 1rem;

        overflow-y: auto;

    }
    .report-import {
        width: 8rem;
        min-height: 15rem;
    }
    .report {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0;
        background-color: var(--color-background);
        border: .2rem solid var(--color-background);
        border-radius: var(--radius-8);
    }
    .report.NEW {
        --color: var(--color-gray-300);
        --color-text: var(--color-text);
    }
    .report.ASSESSING {
        --color: var(--color-purple);
        --color-text: var(--color-white);
        border-color: var(--color);
    }
    .report.PROCESSING {
        --color: var(--color-blue);
        --color-text: var(--color-white);
        border-color: var(--color);   
    }
    .report.PROCESSED {
        --color: var(--color-positive);
        --color-text: var(--color-white);
        border-color: var(--color);
    }
    .report.ERROR {
        --color: var(--color-negative);
        --color-text: var(--color-white);
        border-color: var(--color);
    }
    .report.ERROR::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--color-negative);
        opacity: .3;
    }
    .report .status {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        bottom: -2.5rem;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        font-size: 1rem;
        font-weight: bold;
        z-index: 10;
        border-radius: var(--radius-8);
        background-color: var(--color);
        color: var(--color-text);
        padding: .5rem;
    }

    .report.ERROR .status {

    }

    .report .preview {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        widtH: 100%;
        height: 8rem;
        padding: 1rem;
        overflow: hidden;
     
    }
    .report .preview svg {
        width: 100%;
        height: 100%;
        fill: var(--color-interactivity);
    }

    .report .title {
        display: flex;
        justify-content: center;
        text-wrap: wrap;
        align-items: center;
        padding: .5rem;
        text-align: center;
        font-size: .8rem;
        height: 4rem;
        font-weight: bold;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .controls {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        height: 10rem;
        background-color: var(--color-background);
    }
    .controls .actions {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
    }

    .preview-report {
        margin-left: 20vw;
    }

    .preview-report > .page {
        height: calc(100vh - var(--heading-height));
    }
    .preview-container {
        position: relative;
        width: 100%;
        min-height: 100%;
        overflow: hidden;
    }
    .preview-preventer {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: 11;
        cursor: not-allowed;
        pointer-events: none;
    }
    .preview-disabled-message {
        padding: 3rem;
    }


</style>
