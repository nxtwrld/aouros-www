
<script lang="ts">
    import { files, createTasks, processTask } from '$lib/files';
    import { processDocument, DocumentState, type Task, TaskState, type Document  } from '$lib/import';
    import { DocumentType, type DocumentNew, type Document as SavedDocument } from '$lib/documents/types.d';
    import { addDocument } from '$lib/documents';
    import  user, { type User } from '$lib/user';
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import DocumentView from '$components/documents/DocumentView.svelte';
    import SelectProfile from './SelectProfile.svelte';
    import { play } from '$components/ui/Sounds.svelte';
    import { createVirtualProfile } from '$lib/profiles';
    import type { Profile } from '$lib/types.d';
    import { mergeNamesOnReports, PROFILE_NEW_ID, excludePossibleDuplicatesInPatients } from '$lib/profiles/tools';
    import ImportDocument from './ImportDocument.svelte';
    import ImportProfile from './ImportProfile.svelte';
    import ScreenOverlay from '$components/ui/ScreenOverlay.svelte';
    import LoaderThinking from '$components/ui/LoaderThinking.svelte';
    import { processHealthData } from '$lib/health/signals';
    import DocumentTile from '$components/documents/DocumentTile.svelte';
    
    // Attachment processing imports
    import { selectPagesFromPdf, createPdfFromImageBuffers } from '$lib/files/pdf';
    import { toBase64, base64ToArrayBuffer } from '$lib/arrays';
    import { resizeImage } from '$lib/images';
    import { THUMBNAIL_SIZE } from '$lib/files/CONFIG';
    
    // SSE Import support
    import { IMPORT_FEATURE_FLAGS, selectImportMode } from '$lib/config/import-flags';
    import { SSEImportClient } from '$lib/import/sse-client';
    import DualStageProgress from './DualStageProgress.svelte';
    
    let documents: Document[] = $state([]);
    let results: Document[] = $state([]);//empResults;
    let byProfileDetected: {
        profile: Profile,
        reports: Document[]
    }[] = $state([]);
    let invalids: Document[]= $state([]);
    let tasks: Task[] = $state([]);
    let savedDocuments: SavedDocument[] = $state([]);

    let currentFiles: File[] = $state([]);
    let processingFiles: File[] = $state([]);
    let processedCount: number = $state(0);
    
    // SSE Import state
    let importMode = selectImportMode();
    let useSSE = IMPORT_FEATURE_FLAGS.ENABLE_SSE_IMPORT && importMode !== 'traditional';
    let sseClient = useSSE ? new SSEImportClient() : null;
    
    let currentStage: 'extract' | 'analyze' | null = $state(null);
    let stageProgress = $state(0);


    enum AssessingState {
        IDLE = 'IDLE',
        ASSESSING = 'ASSESSING',
    }

    enum ProcessingState {
        IDLE = 'IDLE',
        PROCESSING = 'PROCESSING',
    }
    let processingState = $state(ProcessingState.IDLE);
    let assessingState = $state(AssessingState.IDLE);


    function fileInput(e: any) {     
        files.set([...$files, ...e.target.files]);
    }

    onMount(() => {
        const unsubscribe = files.subscribe(value => {
                prepareFiles(value);
            });
        return () => {
            unsubscribe();
            clearAll();

        }
    });
/*
    
    $: {
        console.log(byProfileDetected);
    }
*/

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
        // Always create tasks first for consistent file detection and logging
        const newTasks = await createTasks(files);
        tasks = [...tasks, ...newTasks];
        
        if (useSSE && sseClient) {
            // Use SSE import for real-time progress, but with pre-analyzed tasks
            await analyzeWithSSE(files);
        } else {
            // Use traditional import flow
            //assess();
        }
    }
    
    async function analyzeWithSSE(files: File[]) {
        try {
            // Note: tasks parameter contains pre-analyzed file information from createTasks()
            // This ensures consistent file detection logging for both SSE and traditional flows
            assessingState = AssessingState.ASSESSING;
            processingState = ProcessingState.PROCESSING;
            
            // Set up progress callback to update UI
            sseClient!.onProgress((event) => {
                // Update stage and progress from actual SSE events
                if (event.stage.includes('extract') || event.stage === 'initialization' || event.stage === 'image_processing' || event.stage === 'ocr_extraction') {
                    currentStage = 'extract';
                } else if (event.stage.includes('analyz') || event.stage === 'feature_detection' || event.stage === 'medical_analysis') {
                    currentStage = 'analyze';
                }
                
                // Use actual progress from SSE events
                stageProgress = event.progress;
            });
            
            // Set up error callback for detailed error logging
            sseClient!.onError((error, fileId) => {
                console.error('SSE Import Error:', error);
            });
            
            const result = await sseClient!.processTasksSSE(tasks, {
                language: ($user as User)?.language || 'English',
                onStageChange: (stage) => {
                    currentStage = stage;
                    // Don't override progress here - let SSE events handle it
                }
            });
            
            // Convert SSE results to the expected format and create attachments
            // Each analysis corresponds to a single document (one-by-one processing)
            let analysisIndex = 0;
            
            const documentsPromises = result.assessments.map(async (assessment, assessmentIndex) => {
                const originalFile = files[assessmentIndex];
                
                return await Promise.all(assessment.documents.map(async (document, docIndex) => {
                    // Get the corresponding analysis for this specific document
                    const analysis = result.analyses[analysisIndex];
                    analysisIndex++; // Move to next analysis for next document
                    
                    
                    // Extract the report content from the analysis
                    const reportData = analysis?.report || {};
                    
                    // Debug logging for unified structure
                    console.log('🔍 SSE Analysis data (UNIFIED STRUCTURE):', {
                        hasAnalysis: !!analysis,
                        analysisKeys: analysis ? Object.keys(analysis) : [],
                        analysisType: analysis?.type,
                        hasReport: !!analysis?.report,
                        reportKeys: analysis?.report ? Object.keys(analysis.report) : [],
                        // Check specific properties we need
                        reportBodyParts: analysis?.report?.bodyParts,
                        reportSummary: analysis?.report?.summary,
                        reportDiagnosis: analysis?.report?.diagnosis,
                        reportRecommendations: analysis?.report?.recommendations,
                        reportData: reportData,
                        // Unified structure verification
                        isUnifiedStructure: !!(analysis?.type && analysis?.report)
                    });
                    
                    // Create attachment from original file
                    let attachment: {
                        thumbnail: string;
                        type: string;
                        file: string;
                    } | null = null;
                    
                    if (originalFile) {
                        // Get pages for this document
                        const docPages = assessment.pages.filter(p => document.pages.includes(p.page));
                        
                        try {
                            if (originalFile.type === 'application/pdf') {
                                // Extract specific pages from PDF
                                const pdfBuffer = await originalFile.arrayBuffer();
                                
                                // Generate thumbnail from first page if not available
                                let thumbnail = docPages[0]?.thumbnail || '';
                                if (!thumbnail) {
                                    try {
                                        // Use the PDF processing to generate a thumbnail
                                        const { processPDF } = await import('$lib/files/pdf');
                                        const processedPdf = await processPDF(pdfBuffer, originalFile.name);
                                        thumbnail = processedPdf.pages[0]?.thumbnail || '';
                                    } catch (e) {
                                        console.warn('Could not generate PDF thumbnail:', e);
                                    }
                                }
                                
                                const extractedPdf = await selectPagesFromPdf(
                                    pdfBuffer,
                                    document.pages.map(p => p + 1)
                                );
                                
                                attachment = {
                                    thumbnail,
                                    type: "application/pdf",
                                    file: await toBase64(extractedPdf)
                                };
                                
                            } else if (originalFile.type.startsWith('image/')) {
                                // For images, we need to process the original file directly
                                // since SSE response doesn't include image data
                                const reader = new FileReader();
                                const originalImageBase64 = await new Promise<string>((resolve, reject) => {
                                    reader.onload = () => resolve(reader.result as string);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(originalFile);
                                });
                                
                                // Convert single image to PDF
                                // Extract base64 part from data URL (remove "data:image/jpeg;base64," prefix)
                                const base64Data = originalImageBase64.split(',')[1];
                                
                                const imageBuffer = base64ToArrayBuffer(base64Data);
                                const thumbnail = await resizeImage(originalImageBase64, THUMBNAIL_SIZE);
                                
                                const pdfBuffer = await createPdfFromImageBuffers([imageBuffer]);
                                
                                attachment = {
                                    thumbnail,
                                    type: "application/pdf",
                                    file: await toBase64(pdfBuffer)
                                };
                                
                            }
                        } catch (error) {
                            console.error('Failed to create attachment:', error);
                        }
                    }
                    
                    // Create Document object (from import types), not DocumentNew
                    return {
                        title: reportData.title || document.title || `Document ${assessmentIndex + 1}-${docIndex + 1}`,
                        date: reportData.date || document.date || new Date().toISOString(),
                        isMedical: analysis?.isMedical !== undefined ? analysis.isMedical : document.isMedical,
                        state: DocumentState.PROCESSED,
                        pages: assessment.pages.filter(p => document.pages.includes(p.page)),
                        content: {
                            tags: analysis?.tags || [],
                            title: reportData.title || document.title,
                            date: reportData.date || document.date,
                            category: reportData.category || analysis?.cagegory || 'report',
                            summary: reportData.summary,
                            diagnosis: reportData.diagnosis,
                            bodyParts: reportData.bodyParts,
                            signals: reportData.signals || analysis?.signals,
                            recommendations: reportData.recommendations,
                            // Include all report fields
                            ...reportData
                        },
                        // Add the created attachment
                        attachments: attachment ? [attachment] : [],
                        profile: undefined,
                        language: assessment.documents[0]?.language || 'English',
                        // Add missing properties for Document type
                        type: originalFile?.type || 'application/pdf',
                        files: originalFile ? [originalFile] : [],
                        task: undefined
                    } as Document;
                }));
            });
            
            // Flatten the results
            const documents = (await Promise.all(documentsPromises)).flat();
            
            // Update results
            const validDocs = documents.filter(d => d.isMedical);
            const invalidDocs = documents.filter(d => !d.isMedical).map(d => {
                d.state = DocumentState.ERROR;
                return d;
            });
            
            
            results = [...results, ...validDocs];
            invalids = [...invalids, ...invalidDocs];
            byProfileDetected = mergeNamesOnReports(results);
            
            // Clean up tasks and files after successful SSE processing (matches traditional flow)
            console.log('🧹 SSE: Cleaning up processed tasks and files', {
                tasksBefore: tasks.length,
                currentFilesBefore: currentFiles.length,
                processingFilesBefore: processingFiles.length
            });
            
            // Remove successfully processed tasks from tasks array (ensure Svelte reactivity)
            const processedTaskFiles = new Set(files.map(f => f.name + f.size)); // Create unique identifier
            console.log('🔍 SSE Cleanup Debug:', {
                processedTaskFiles: Array.from(processedTaskFiles),
                tasksToCheck: $state.snapshot(tasks).map(task => ({
                    title: task.title,
                    fileIds: task.files.map((f: File) => f.name + f.size)
                }))
            });
            
            const remainingTasks = tasks.filter(task => {
                // Keep tasks whose files haven't been processed in this SSE batch
                const taskFileIds = task.files.map((f: File) => f.name + f.size);
                const shouldRemove = taskFileIds.some(id => processedTaskFiles.has(id));
                // Using basic properties to avoid logging $state proxies
                console.log(`🔍 Task "${task.title}": fileIds=${taskFileIds}, shouldRemove=${shouldRemove}`);
                return !shouldRemove;
            });
            
            // Direct state update to top-level tasks scope
            if (remainingTasks.length === 0) {
                tasks = [];  // Direct empty array assignment for clearer reactivity
            } else {
                tasks = [...remainingTasks];
            }
            
            // Remove processed files from currentFiles and processingFiles arrays
            removeFiles(files);
            
            console.log('🧹 SSE: Cleanup completed', {
                tasksAfter: tasks.length,
                remainingTaskTitles: tasks.length > 0 ? tasks.map(t => t.title) : [],
                currentFilesAfter: currentFiles.length,
                processingFilesAfter: processingFiles.length,
                validDocsAdded: validDocs.length,
                invalidDocsAdded: invalidDocs.length
            });
            
            // Use $state.snapshot to avoid Svelte proxy warning
            console.log('🔄 SSE: Forcing reactivity check - tasks array snapshot:', $state.snapshot(tasks));
            
            play('focus');
            
        } catch (error) {
            console.error('SSE Import Failed:', error);
            play('error');
            
            // Even on error, clean up the files that were being processed to avoid UI duplication
            console.log('🧹 SSE: Emergency cleanup after error', {
                tasksBefore: tasks.length,
                filesBeingProcessed: files.length
            });
            
            // Remove files from processing arrays (but keep tasks for retry/error visibility)
            removeFiles(files);
            
            // Could fall back to traditional import here
        } finally {
            assessingState = AssessingState.IDLE;
            processingState = ProcessingState.IDLE;
            currentStage = null;
            stageProgress = 0;
        }
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
        const doc = await processTask(task)            
            .catch(e => {
                doc.state = DocumentState.ERROR;
                console.log('ERROR assessing document', e, doc);
            });
        const valid = doc.filter((d: Document) => d.isMedical);
        const invalid = doc.filter((d: Document) => !d.isMedical).map((d: Document) => {
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
        
            const report = await processDocument(doc, ($user as User)?.language)
                .catch(e => {
                    doc.state = DocumentState.ERROR;
                    console.log('ERROR processing document', e, doc);
                    return null;
                });
            
            documents = documents.slice(1);
            
            if (!report) {
                continue;
            }

            const processedDoc: Document = {
                ...doc,
                state: DocumentState.PROCESSED,
                title: report.report?.title || doc.title,
                content: {
                    tags: report.tags || [],
                    ...report.report
                }
            };
            
            results = [...results, processedDoc]
            play('focus');
            
            byProfileDetected = mergeNamesOnReports(results);
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
        currentFiles = [...currentFiles.filter(file => !files.includes(file))];
        processingFiles = [...processingFiles.filter(file => !files.includes(file))];
    }


    let savingDocumentsInProgress: boolean = $state(false);

    async function add() {
        savingDocumentsInProgress = true;
        console.log('Saving files');

        while (byProfileDetected.length > 0) {
            const profileDetected = byProfileDetected[0];
            const signals = [];
  
            // 1. check if profile exists            
            if (profileDetected.profile.id === PROFILE_NEW_ID ) {
                // 1.1 create a new profile
                profileDetected.profile = await createVirtualProfile(profileDetected.profile);
            }

            // 2. add the documents to the database for each new profile
            while (profileDetected.reports.length > 0) {
                const document = profileDetected.reports[0];
                
                // Convert Document to DocumentNew for saving
                const documentNew: DocumentNew = {
                    user_id: profileDetected.profile.id,
                    type: DocumentType.document,
                    metadata: {
                        title: document.content.title,
                        tags: document.content.tags,
                        date: document.content.date,
                        category: document.content.category,
                        language: document.language || 'English'
                    },
                    content: document.content,
                    attachments: document.attachments || []
                };

                if (document.content.summary) {
                    documentNew.metadata!.summary = document.content.summary;
                }
                if (document.content.diagnosis) {
                    documentNew.metadata!.diagnosis = document.content.diagnosis;
                }

                // 2.2 create a signals listing
                if (document.content.signals) {
                    signals.push(...document.content.signals);
                    // add signals names to the metadata
                    documentNew.metadata!.signals = document.content.signals.map((signal: any) => signal.test);
                }

                // 3. add documents to the database
                const newSavedDocument = await addDocument(documentNew);
                console.log('newSavedDocument', newSavedDocument);
                
                // 4. process all health data including META_HISTORIES entries
                // Pass the entire document content instead of just signals array
                await processHealthData(document.content, profileDetected.profile.id, newSavedDocument.id);

                // remove the document from the list
                profileDetected.reports = profileDetected.reports.slice(1);
                savedDocuments = [...savedDocuments, newSavedDocument]; 
            }
            byProfileDetected = byProfileDetected.slice(1);
            //ui.emit('overlay.import', false);
            setTimeout(() => {
                savingDocumentsInProgress = false;
            },500)
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

    let previewReport: Document | null = $state(null);

    let analyzingInProgress = $derived(assessingState === 'ASSESSING' || processingState === 'PROCESSING');
    let remainingScans = $derived((($user as User)?.subscriptionStats?.scans || 0) - processedCount);
</script>

<div class="page -empty">
{#if ($user as User)?.subscriptionStats?.scans <= 0}
    <div class="alert -warning">
        { $t('app.import.maxium-scans-reached', { values: {
            limit: ($user as User)?.subscriptionStats?.scans
        }}) } { $t('app.upgrade.please-upgrade-your-subscription-to-continue') }
    </div>
{:else}

    <h3 class="h3 heading">{ $t('app.import.import-reports-scan-or-images') }</h3>

    <input type="file" id="upload-file" class="-none" accept=".pdf,.jpg,.jpeg,.png,.webp,.webm" onchange={fileInput} />
    
    <div class="import-canvas">
        <div class="imports">


            {#each savedDocuments as doc}
            <div class="report-done">
                <DocumentTile document={doc} />
            </div>
            {/each}

            {#each byProfileDetected as profileDetected}
                <ImportProfile bind:profile={profileDetected.profile} />
                {#each profileDetected.reports as doc}
                    <div class="report-import">    
                        <ImportDocument {doc} onclick={() => previewReport = doc} onremove={() => removeItem('results', doc)} />
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
                <ImportDocument {doc} onremove={() => removeItem('invalids', doc)} />
            </div>
            {/each}
            {#each tasks as task (task.title + task.files?.[0]?.size)}
            <div class="report-import">
                <ImportDocument doc={task} onremove={() => removeItem('tasks', task)} />
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
            <button onclick={assess} class="button -primary -large" disabled={tasks.length == 0 || analyzingInProgress}>
                {#if analyzingInProgress}
                    <div class="button-loading">
                        {#if useSSE && currentStage}
                            <DualStageProgress 
                                overallProgress={stageProgress}
                                currentStage={currentStage || 'extract'}
                                extractProgress={currentStage === 'extract' ? stageProgress : 100}
                                analyzeProgress={currentStage === 'analyze' ? stageProgress : 0}
                                currentMessage={currentStage === 'extract' ? "Extracting text and data..." : "Analyzing medical content..."}
                                filesTotal={processingFiles.length}
                                filesCompleted={processedCount}
                            />
                        {:else}
                            <LoaderThinking />
                        {/if}
                    </div>
                {:else}
                    { $t('app.import.analyze-reports') }
                {/if}
            </button>
            {/if}
            {#if byProfileDetected.length > 0 && !analyzingInProgress}
            <button class="button -large" onclick={add} disabled={results.length == 0 || savingDocumentsInProgress}>
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
        <!-- Convert import Document to SavedDocument format for DocumentView -->
        <DocumentView document={{
            id: crypto.randomUUID(),
            key: '',
            user_id: '',
            owner_id: '',
            type: DocumentType.document,
            metadata: previewReport.metadata || {
                title: previewReport.content.title,
                tags: previewReport.content.tags,
                date: previewReport.content.date
            },
            content: previewReport.content,
            attachments: []
        } as SavedDocument} />
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
    .report-done {
        width: 12rem;
        background-color: var(--color-gray-300);
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
