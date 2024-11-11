
<script lang="ts">
    import { createTasks, processTask } from '$slib/files';
    import { processDocument } from '$slib/import';
    import { type Document, DocumentState } from '$slib/import';
    import { files, type Task, TaskState } from '$slib/files';
    import { addDocument } from '$slib/med/documents';
    import  user from '$slib/user';

    let documents: Document[] = [];
    let results: any = [];
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
        if (value.length > 0) {
            console.log('subscribed', value);
            currentFiles = mergeFiles(value);
            const toBeProcessed = currentFiles.filter(file => !processingFiles.includes(file));

            if (toBeProcessed.length > 0) {
                processingFiles = [...processingFiles, ...toBeProcessed];
                analyze(toBeProcessed);
            }
            files.set([]);
        }
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
            console.log('no more tasks');
            return;
        }

        if (assessingState === AssessingState.ASSESSING) {
            // we are still processing the previous tasks no need to start again
            console.log('still processing');
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
            const report = await processDocument(doc);
            documents = documents.slice(1);
            results = [
                ...results,
                {

                    ...doc,
                    state: DocumentState.PROCESSED,
                    title: report.report.title,
                    tags: report.tags,
                    report: report.report,
                }
            ]
        }
        processingState = ProcessingState.IDLE;
        console.log('result', results);
        // lets do another task....
        assess();
        
    }

    function add() {
        addDocument({
            title: 'Test',
            tags: ['test'],
            pages: [],
            isMedical: true,
        });
    }


</script>

{#if $user.subscriptionStats?.scans <= 0}
    <div class="alert -warning">
        You have reached your monthly limit of 10 scans. Please upgrade your subscription to continue.
    </div>
{:else}

    

    <input type="file" id="upload-file" class="-none" accept=".pdf" on:change={fileInput} />
    

    <div class="imports">
        {#each [...results, ...documents] as doc}
            <div class="report {doc.state}">
                <div class="preview">
                {#if doc.pages[0]?.thumbnail}
                    <img src={doc.pages[0].thumbnail} alt={doc.title} class="thumbmail" />
                {/if}
                </div>
                {doc.state}
                <h5 class="h5">{doc.title}</h5>
                {#if doc.report}
                    <div>{doc.tags.join(',')}</div>  
                {:else}\

                 - {doc.isMedical}
                {/if}

            </div>
        {/each}
        {#each invalids as doc}
            <div class="report ERROR">
                <div class="preview">
                {#if doc.pages[0]?.thumbnail}
                <img src={doc.pages[0].thumbnail} alt={doc.title} class="thumbmail" />
                {/if}
                </div>
                NONMEDICAL
                <h5 class="h5">{doc.title}</h5>
            </div>  
        {/each}
        {#each tasks as task}
            <div class="report {task.state}">
                <div class="preview">
                    {task?.name}
                </div>
                {task.state}
            </div>
        {/each}
        <label for="upload-file" class="button report">
            <div class="preview">
                <svg>
                    <use href="/icons.svg#add-file" />
                </svg>
            </div>
            Add files

        </label>
    </div>

    <div class="controls">
        <p>You still have {remainingScans} scans in your yearly subscription.</p>
        <button on:click={assess} class="button -primary" disabled={tasks.length == 0}>Analyze reports</button>
        <button class="button" on:click={add}>Save</button>
    </div>

{/if}
<style>
    .thumbmail {
        max-width: 6rem;
        max-height: 6rem;
        object-fit: contain;
        border: 1px solid var(--color-gray-500);
        box-shadow: 0 .4rem .5rem -.3rem rgba(0, 0, 0, 0.3);

    }

    .imports {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem;
        padding: 1rem;

    }
    .report {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 8rem;
        padding: 1rem;
        background-color: var(--color-gray-300);
        border: .2rem solid var(--color-gray-500);
        overflow: hidden;
        border-radius: var(--radius-8);
    }
    .report.NEW {
        /*border-color: var(--color-highlight);*/
    }
    .report.ASSESSING {
        border-color: var(--color-purple);
    }
    .report.PROCESSING {
        border-color: var(--color-blue);   
    }
    .report.PROCESSED {
        border-color: var(--color-positive);
    }
    .report.ERROR {
        border-color: var(--color-negative);
    }
    .report .preview {
        height: 7rem;
        overflow: hidden;
    }
    .report .preview svg {
        width: 100%;
        height: 100%;
        fill: var(--color-interactivity);
    }

    .controls {
        display: flex;
        justify-content: center;
        gap: 1rem;
        padding: 1rem;
    }


</style>
