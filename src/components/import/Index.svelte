
<script lang="ts">
    import { files, createTasks, processTask } from '$lib/files';
    import { processDocument, DocumentState, type Task, TaskState  } from '$lib/import';
    import { DocumentType, type DocumentNew  } from '$lib/med/documents/types.d';
    import { addDocument } from '$lib/med/documents';
    import  user, { type User } from '$lib/user';
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import DocumentView from '$components/documents/DocumentView.svelte';
    import SelectProfile from './SelectProfile.svelte';
    import { play } from '$components/ui/Sounds.svelte';
    import { state } from '$lib/ui';
    import { createVirtualProfile } from '$lib/med/profiles';
    import type { Profile } from '$lib/med/types.d';
    import { mergeNamesOnReports, excludePossibleDuplicatesInPatients } from '$lib/med/profiles/tools';
    import ImportDocument from './ImportDocument.svelte';
    import ImportProfile from './ImportProfile.svelte';
    import ScreenOverlay from '$components/ui/ScreenOverlay.svelte';
    import LoaderThinking from '$components/ui/LoaderThinking.svelte';
    import Loading from '$components/ui/Loading.svelte';
    import { updateSignals } from '$lib/health/signals';

    
    let documents: DocumentNew[] = [];
    let results: DocumentNew[] = [];//empResults;
    let byProfileDetected: {
        profile: Profile,
        reports: DocumentNew[]
    }[] = [];
    let invalids: DocumentNew[]= [];
    let tasks: Task[] = [];

    let currentFiles: File[] = [];
    let processingFiles: File[] = [];
    let processedCount: number = 0;
    $: analyzingInProgress = assessingState === AssessingState.ASSESSING || processingState === ProcessingState.PROCESSING;

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

    onMount(() => {
        const unsubscribe = files.subscribe(value => {
                prepareFiles(value);
            });
        return () => {
            console.log('unmounted....');
            unsubscribe();
            clearAll();

        }
    });

    
    $: {
        console.log(byProfileDetected);
    }


    function clearAll() {
        files.set([]);
        documents = [];
        results = [];
        byProfileDetected = [];
        invalids = [];
        tasks = [];
        currentFiles = [];
        processingFiles = [];
        processedCount = 0;
        processingState = ProcessingState.IDLE;
        assessingState = AssessingState.IDLE;
    }

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
        const invalid = doc.filter(d => !d.isMedical).map(d => {
            d.state = DocumentState.ERROR;
            return d;
        });
        tasks = tasks.slice(1);
        documents = [...documents, ...valid];
        invalids = [...invalids, ...invalid];
        removeFiles(task.files);
        //console.log('documents', documents);
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
            const report = await processDocument(doc, ($user as User)?.language);
            documents = documents.slice(1);
            delete report.isMedical;

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
                    profile: undefined,
                    task: doc.task
                }
            ]
            play('focus');
            
            byProfileDetected = mergeNamesOnReports(results);
            console.log('byProfileDetected', byProfileDetected);
        }
        processingState = ProcessingState.IDLE;
        //console.log('result', results);
        // lets do another task....
        assess();
        
    }

    function removeItem(type: 'tasks' | 'results' | 'documents' | 'invalids', item: any) {
        switch(type) {
            case 'tasks':
                removeFiles(item.files);
                tasks = tasks.filter(task => task !== item);
                break;
            case 'results':
                results = results.filter(doc => doc !== item);
                byProfileDetected = [
                    ...byProfileDetected.map(profileDetected => {
                        profileDetected.reports = profileDetected.reports.filter(doc => doc !== item);
                        return profileDetected;
                    })
                ]
                break;
            case 'documents':
                documents = documents.filter(doc => doc !== item);
                break;
            case 'invalids':
                invalids = invalids.filter(doc => doc !== item);
               break;
        }
    }

    function removeFiles(files: File[]) {
        currentFiles = currentFiles.filter(file => !files.includes(file));
        processingFiles = processingFiles.filter(file => !files.includes(file));
    }


    let savingDocumentsInProgress: boolean = false;

    async function add() {
        savingDocumentsInProgress = true;
        console.log('Saving files');

        while (byProfileDetected.length > 0) {
            const profileDetected = byProfileDetected[0];
            const signals = [];
  
            // 1. check if profile exists            
            if (!profileDetected.profile.id) {
                // 1.1 create a new profile
                profileDetected.profile = await createVirtualProfile({
                    fullName: profileDetected.profile.fullName
                });
            }

            // 2. add the documents to the database for each new profile
            while (profileDetected.reports.length > 0) {
                const document = profileDetected.reports[0];
                // 2.0 add user id to the document
                document.user_id = profileDetected.profile.id;
                document.type = DocumentType.document;
                // 2.1 prepare metadata

                document.metadata = {
                    title: document.content.title,
                    tags: document.content.tags,
                    date: document.content.date,
                    category: document.content.category,
                    language: document.language
                }

                if (document.content.summary) {
                    document.metadata.summary = document.content.summary;
                }
                if (document.content.diagnosis) {
                    document.metadata.diagnosis = document.content.diagnosis;
                }

                // 2.2 create a signals listing
                if (document.content.signals) {
                    signals.push(...document.content.signals);
                    // add signals names to the metadata
                    document.metadata.signals = document.content.signals.map(signal => signal.test);
                }

                // 3. add documents to the database
                const newSavedDocument = await addDocument(document);

                // 4. update the signalas as well
                if (signals.length > 0) await updateSignals(signals, profileDetected.profile.id);

                // remove the document from the list
                profileDetected.reports = profileDetected.reports.slice(1);

            }
            byProfileDetected = byProfileDetected.slice(1);
            savingDocumentsInProgress = false;
        }
/*

        await Promise.all(byProfileDetected.map(async profileDetected => {

            // 1. check if profile exists

            
            if (!profileDetected.profile.id) {
                // 1.1 create a new profile

                profileDetected.profile = await createVirtualProfile({
                    fullName: profileDetected.profile.fullName
                });
            }



            // 2. add the documents to the database for each new profile

            await Promise.all(profileDetected.reports.map(async (document) => {        
                // 2.0 add user id to the document
                document.user_id = profileDetected.profile.id;
                document.type = DocumentType.document;

                // 2.1 prepare metadata

                document.metadata = {
                    title: document.content.title,
                    tags: document.content.tags,
                    date: document.content.date,
                    category: document.content.category,
                    language: document.language
                }

                if (document.content.summary) {
                    document.metadata.summary = document.content.summary;
                }
                if (document.content.diagnosis) {
                    document.metadata.diagnosis = document.content.diagnosis;
                }

                // 2.2 add documents to the database
                const newSavedDocument = await addDocument(document);

                // 3. update health profile document with signal histories...
                //return await addDocument(document);
            }));
            profileDetected.reports = [];

        }));
        // clear all detected profiles
        byProfileDetected = [];
        */
    }

    let previewReport: DocumentNew | null = null;

</script>

<div class="page -empty">
{#if $user?.subscriptionStats?.scans <= 0}
    <div class="alert -warning">
        { $t('app.import.maxium-scans-reached', { values: {
            limit: $user?.subscriptionStats?.default_scans
        }}) } { $t('app.upgrade.please-upgrade-your-subscription-to-continue') }
    </div>
{:else}

    <h3 class="h3 heading">{ $t('app.import.import-reports-scan-or-images') }</h3>

    <input type="file" id="upload-file" class="-none" accept=".pdf" on:change={fileInput} />
    
    <div class="import-canvas">
        <div class="imports">


            {#each byProfileDetected as profileDetected}
                <ImportProfile bind:profile={profileDetected.profile} />
                {#each profileDetected.reports as doc}
                    <div class="report-import">    
                        <ImportDocument {doc} on:click={() => previewReport = doc}  on:remove={() => removeItem('results', doc)} />
                        {#key JSON.stringify(profileDetected.profile)}
                        <SelectProfile contact={profileDetected.profile} bind:selected={profileDetected.profile}  />
                        {/key}
                    </div>
                {/each}
            {/each}

            {#each [...documents] as doc}
            <div class="report-import">
                <ImportDocument {doc}  removable={false}  />
            </div>
            {/each}
            {#each invalids as doc}
            <div class="report-import">
                <ImportDocument {doc} on:remove={() => removeItem('invalids', doc)}  />
            </div>
            {/each}
            {#each tasks as task}
            <div class="report-import">
                <ImportDocument doc={task} on:remove={() => removeItem('tasks', task)} />
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
            
            {#if tasks.length > 0 || analyzingInProgress}
            <button on:click={assess} class="button -primary -large" disabled={tasks.length == 0 || analyzingInProgress}>
                {#if analyzingInProgress}
                    <div class="button-loading">
                        <LoaderThinking />
                    </div>
                {:else}
                    { $t('app.import.analyze-reports') }
                {/if}
            </button>
            {/if}
            {#if results.length > 0 && !analyzingInProgress}
            <button class="button -large" on:click={add} disabled={results.length == 0 || savingDocumentsInProgress}>
                {#if savingDocumentsInProgress}
                    <div class="button-loading">
                        <LoaderThinking />
                    </div>
                {:else}    
                    { $t('app.import.save') }
                {/if}
            </button>
            {/if}

        </div>
    </div>

{/if}

</div>
{#if previewReport}
    <ScreenOverlay title={previewReport.content.title} preventer={true} on:close={() => previewReport = null}>
        <DocumentView document={previewReport} />
    </ScreenOverlay>
{/if}

<style>

    .import-canvas {
        display: flex;
        align-items: center;
        justify-content: center;
        height: calc(100vh - var(--heading-height) - var(--toolbar-height) - 10rem);
    }

    .button-loading {
        --color: var(--color-white);
        width: 100%;
        height: 1.2em;
    }

    .imports {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: center;
        gap: 1rem;

        overflow-y: auto;
        --border-width: .2rem;
        --radius: var(--radius-8);
        --tile-height: 13rem;
    }
    .report-import {
        width: 8rem;
        min-height: 20rem;



    }
    .report {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0;
        height: var(--tile-height);
        background-color: var(--color-background);
        border: var(--border-width) solid var(--color-background);
        border-radius: var(--radius);
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




</style>
