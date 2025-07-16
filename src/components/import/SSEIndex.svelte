<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { files } from '$lib/files';
  import { sseImportClient, processDocumentsFallback, type SSEProgressEvent } from '$lib/import/sse-client';
  import type { Assessment, ReportAnalysis } from '$lib/import/types';
  import type { DocumentNew, Document as SavedDocument } from '$lib/documents/types.d';
  import { DocumentState, DocumentType } from '$lib/documents/types.d';
  import { addDocument } from '$lib/documents';
  import user, { type User } from '$lib/user';
  import { play } from '$components/ui/Sounds.svelte';
  import type { Profile } from '$lib/types.d';
  import { mergeNamesOnReports, excludePossibleDuplicatesInPatients } from '$lib/profiles/tools';
  import { updateSignals } from '$lib/health/signals';

  // Import our new components
  import DualStageProgress from './DualStageProgress.svelte';
  import FileProgressCard from './FileProgressCard.svelte';
  import DropFiles from './DropFiles.svelte';
  import ImportProfile from './ImportProfile.svelte';
  import ScreenOverlay from '$components/ui/ScreenOverlay.svelte';
  import DocumentView from '$components/documents/DocumentView.svelte';
  import DocumentTile from '$components/documents/DocumentTile.svelte';

  // State management
  let processingFiles: File[] = $state([]);
  let fileProgress: Map<string, any> = $state(new Map());
  let overallProgress = $state(0);
  let currentStage: 'extract' | 'analyze' | 'complete' | 'error' = $state('extract');
  let currentMessage = $state('');
  let filesCompleted = $state(0);
  
  // Results
  let assessments: Assessment[] = $state([]);
  let analyses: ReportAnalysis[] = $state([]);
  let documents: DocumentNew[] = $state([]);
  let byProfileDetected: { profile: Profile, reports: DocumentNew[] }[] = $state([]);
  let savedDocuments: SavedDocument[] = $state([]);

  // Processing state
  enum ProcessingState {
    IDLE = 'IDLE',
    PROCESSING = 'PROCESSING',
    COMPLETING = 'COMPLETING'
  }
  let processingState = $state(ProcessingState.IDLE);

  // Preview functionality
  let previewReport: DocumentNew | null = $state(null);

  // SSE client setup
  let isSSEEnabled = $state(true);
  let useSSEFallback = $state(false);

  onMount(() => {
    const unsubscribe = files.subscribe(value => {
      if (value.length > 0) {
        prepareFiles(value);
      }
    });

    // Setup SSE client callbacks
    sseImportClient.onProgress(handleProgress);
    sseImportClient.onError(handleError);

    return () => {
      unsubscribe();
      sseImportClient.cleanup();
    };
  });

  onDestroy(() => {
    sseImportClient.cleanup();
  });

  // Handle new files
  function prepareFiles(newFiles: File[]) {
    if (processingState === ProcessingState.PROCESSING) {
      return; // Already processing
    }

    play('focus');
    processingFiles = [...newFiles];
    files.set([]); // Clear the store
    
    // Initialize file progress tracking
    for (const file of newFiles) {
      const fileId = `${file.name}-${file.size}-${Date.now()}`;
      fileProgress.set(fileId, {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        stage: 'extract',
        progress: 0,
        message: 'Preparing file...',
        thumbnail: null,
        error: null
      });
    }

    startProcessing();
  }

  // Start the SSE processing workflow
  async function startProcessing() {
    if (processingFiles.length === 0) return;

    processingState = ProcessingState.PROCESSING;
    currentStage = 'extract';
    overallProgress = 0;
    filesCompleted = 0;

    try {
      if (isSSEEnabled && !useSSEFallback) {
        // Use SSE workflow
        const result = await sseImportClient.processDocumentsSSE(processingFiles, {
          language: ($user as User)?.language,
          onStageChange: (stage) => {
            currentStage = stage;
          }
        });
        
        assessments = result.assessments;
        analyses = result.analyses;
      } else {
        // Use fallback workflow
        const result = await processDocumentsFallback(processingFiles, {
          language: ($user as User)?.language
        });
        
        assessments = result.assessments;
        analyses = result.analyses;
      }

      // Process results into documents
      await processResults();
      
      currentStage = 'complete';
      overallProgress = 100;
      processingState = ProcessingState.IDLE;
      
    } catch (error) {
      console.error('Processing failed:', error);
      currentStage = 'error';
      currentMessage = 'Processing failed. Please try again.';
      processingState = ProcessingState.IDLE;
      play('error');
    }
  }

  // Handle SSE progress events
  function handleProgress(event: SSEProgressEvent) {
    if (event.fileId) {
      // Update file-specific progress
      const current = fileProgress.get(event.fileId);
      if (current) {
        fileProgress.set(event.fileId, {
          ...current,
          stage: event.stage as any,
          progress: event.progress,
          message: event.message
        });
      }
    }

    // Update overall progress
    currentMessage = event.message;
    
    // Calculate overall progress based on stage and individual file progress
    const totalFiles = processingFiles.length;
    const completedFiles = Array.from(fileProgress.values())
      .filter(fp => fp.stage === 'complete').length;
    
    filesCompleted = completedFiles;
    
    if (event.stage === 'extract' || currentStage === 'extract') {
      // Extraction phase: 0-50%
      const extractProgress = Array.from(fileProgress.values())
        .reduce((sum, fp) => sum + (fp.stage === 'extract' ? fp.progress : 100), 0) / totalFiles;
      overallProgress = (extractProgress / 100) * 50;
    } else if (event.stage === 'analyze' || currentStage === 'analyze') {
      // Analysis phase: 50-100%
      const analyzeProgress = Array.from(fileProgress.values())
        .reduce((sum, fp) => sum + (fp.stage === 'analyze' ? fp.progress : 100), 0) / totalFiles;
      overallProgress = 50 + (analyzeProgress / 100) * 50;
    }
  }

  // Handle SSE errors
  function handleError(error: Error, fileId?: string) {
    console.error('SSE Error:', error, fileId);
    
    if (fileId) {
      const current = fileProgress.get(fileId);
      if (current) {
        fileProgress.set(fileId, {
          ...current,
          stage: 'error',
          error: error.message
        });
      }
    }

    // If all files fail, switch to fallback
    const allFailed = Array.from(fileProgress.values())
      .every(fp => fp.stage === 'error');
    
    if (allFailed && !useSSEFallback) {
      useSSEFallback = true;
      setTimeout(() => startProcessing(), 1000);
    }
  }

  // Process results into document format
  async function processResults() {
    const newDocuments: DocumentNew[] = [];
    
    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i];
      const analysis = analyses[i];
      
      for (const docInfo of assessment.documents) {
        if (docInfo.isMedical) {
          const document: DocumentNew = {
            type: DocumentType.document,
            content: {
              title: analysis?.report?.title || docInfo.title,
              tags: analysis?.tags || [],
              date: docInfo.date,
              ...analysis?.report
            },
            attachments: [],
            metadata: {
              title: analysis?.report?.title || docInfo.title,
              tags: analysis?.tags || [],
              date: docInfo.date,
              category: analysis?.report?.category || 'report',
              isMedical: true,
              state: DocumentState.PROCESSED,
              pages: assessment.pages.filter(page => 
                docInfo.pages.includes(page.page)
              ).map(page => ({
                page: page.page,
                text: page.text,
                image: page.images?.[0]?.data,
                thumbnail: page.images?.[0]?.data
              }))
            }
          };
          
          newDocuments.push(document);
        }
      }
    }

    documents = newDocuments;
    
    // Group by profiles
    await groupByProfiles();
  }

  // Group documents by detected profiles
  async function groupByProfiles() {
    const grouped = mergeNamesOnReports(documents);
    const excludeDuplicates = excludePossibleDuplicatesInPatients(grouped);
    byProfileDetected = excludeDuplicates;
  }

  // Retry failed file
  function retryFile(fileId: string) {
    const fileProgressItem = fileProgress.get(fileId);
    if (fileProgressItem) {
      fileProgress.set(fileId, {
        ...fileProgressItem,
        stage: 'extract',
        progress: 0,
        message: 'Retrying...',
        error: null
      });
      
      // Find the file and reprocess it
      const file = processingFiles.find(f => 
        `${f.name}-${f.size}` === fileId.split('-').slice(0, -1).join('-')
      );
      
      if (file) {
        // Restart processing for this specific file
        startProcessing();
      }
    }
  }

  // Remove failed file
  function removeFile(fileId: string) {
    fileProgress.delete(fileId);
    // Update file list
    const fileName = fileProgress.get(fileId)?.fileName;
    if (fileName) {
      processingFiles = processingFiles.filter(f => f.name !== fileName);
    }
  }

  // Save documents to profiles
  async function saveDocuments() {
    for (const group of byProfileDetected) {
      for (const doc of group.reports) {
        try {
          // Set the user_id in the document before saving
          doc.user_id = group.profile.id;
          const savedDoc = await addDocument(doc);
          savedDocuments.push(savedDoc);
          
          // Update health signals
          if (doc.content.signals) {
            await updateSignals(doc.content.signals, group.profile.id);
          }
        } catch (error) {
          console.error('Failed to save document:', error);
        }
      }
    }
    
    // Clear processed data
    clearAll();
  }

  // Clear all data
  function clearAll() {
    processingFiles = [];
    fileProgress.clear();
    assessments = [];
    analyses = [];
    documents = [];
    byProfileDetected = [];
    overallProgress = 0;
    currentStage = 'extract';
    currentMessage = '';
    filesCompleted = 0;
    processingState = ProcessingState.IDLE;
  }

  // File input reference
  let fileInputRef: HTMLInputElement | undefined = $state();

  // File input handler
  function fileInput(e: any) {
    files.set([...$files, ...e.target.files]);
  }
</script>

<div class="sse-import-container">
  <!-- File Drop Area -->
  {#if processingState === ProcessingState.IDLE && processingFiles.length === 0}
    <div class="drop-section">
      <DropFiles>
        <div class="upload-area">
          <h3 class="upload-heading">Import medical reports and images</h3>
          
          <input 
            type="file" 
            id="upload-file"
            multiple 
            accept="image/*,.pdf,.jpg,.jpeg,.png,.webp" 
            style="display: none;" 
            onchange={fileInput}
            bind:this={fileInputRef}
          />
          
          <div class="upload-actions">
            <label for="upload-file" class="upload-button">
              <div class="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <span>Choose Files</span>
            </label>
            
            <p class="upload-hint">or drag and drop files here</p>
          </div>
          
          <p class="file-types">Supports PDF, JPG, PNG, WEBP images</p>
        </div>
      </DropFiles>
    </div>
  {/if}

  <!-- Processing View -->
  {#if processingState === ProcessingState.PROCESSING || currentStage !== 'extract' || processingFiles.length > 0}
    <div class="processing-section">
      <!-- Overall Progress -->
      <DualStageProgress 
        {overallProgress}
        {currentStage}
        extractProgress={currentStage === 'extract' ? 
          Array.from(fileProgress.values()).reduce((sum, fp) => sum + fp.progress, 0) / Math.max(fileProgress.size, 1) : 100}
        analyzeProgress={currentStage === 'analyze' ? 
          Array.from(fileProgress.values()).reduce((sum, fp) => sum + fp.progress, 0) / Math.max(fileProgress.size, 1) : 
          (currentStage === 'complete' ? 100 : 0)}
        {currentMessage}
        filesTotal={processingFiles.length}
        {filesCompleted}
      />

      <!-- Individual File Progress -->
      {#if fileProgress.size > 0}
        <div class="files-progress">
          <h4>File Progress</h4>
          <div class="files-grid">
            {#each Array.from(fileProgress.values()) as fileProgressItem (fileProgressItem.fileId)}
              <FileProgressCard 
                fileProgress={fileProgressItem}
                onRetry={retryFile}
                onRemove={removeFile}
              />
            {/each}
          </div>
        </div>
      {/if}

      <!-- Fallback Notice -->
      {#if useSSEFallback}
        <div class="fallback-notice">
          <p>⚠️ Using fallback processing method</p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Results View -->
  {#if currentStage === 'complete' && byProfileDetected.length > 0}
    <div class="results-section">
      <div class="results-header">
        <h3>Processing Complete!</h3>
        <p>Found {documents.length} medical documents for {byProfileDetected.length} patients.</p>
      </div>

      <!-- Profile Groups -->
      {#each byProfileDetected as group}
        <div class="profile-group">
          <ImportProfile profile={group.profile} />
          
          <div class="documents-grid">
            {#each group.reports as doc}
              <div 
                class="preview-document-card" 
                role="button" 
                tabindex="0"
                onclick={() => previewReport = doc}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    previewReport = doc;
                  }
                }}
                aria-label="Preview document: {doc.content.title}"
              >
                <div class="card-header">
                  <div class="date-badge">{new Date(doc.content.date).toLocaleDateString()}</div>
                </div>
                <div class="card-body">
                  <h4 class="card-title">{doc.content.title}</h4>
                  {#if doc.content.tags && doc.content.tags.length > 0}
                    <div class="card-tags">
                      {#each doc.content.tags.slice(0, 3) as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="card-footer">
                  <svg class="category-icon" viewBox="0 0 24 24">
                    <use href="/icons-o.svg#report-{doc.content.category || 'report'}" />
                  </svg>
                  <span class="category-label">{doc.content.category || 'Report'}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}

      <!-- Save Action -->
      <div class="save-section">
        <button class="save-button" onclick={saveDocuments}>
          Save {documents.length} Documents
        </button>
        <button class="clear-button" onclick={clearAll}>
          Start Over
        </button>
      </div>
    </div>
  {/if}

  <!-- Error State -->
  {#if currentStage === 'error'}
    <div class="error-section">
      <h3>Processing Error</h3>
      <p>{currentMessage}</p>
      <div class="error-actions">
        <button onclick={startProcessing}>Try Again</button>
        <button onclick={clearAll}>Start Over</button>
      </div>
    </div>
  {/if}
</div>

<!-- Preview Modal -->
{#if previewReport}
  <ScreenOverlay title={previewReport.content.title} preventer={true} on:close={() => previewReport = null}>
    <!-- Convert DocumentNew to SavedDocument format for DocumentView -->
    <DocumentView document={{
      id: crypto.randomUUID(),
      key: '',
      user_id: '',
      owner_id: '',
      type: previewReport.type,
      metadata: previewReport.metadata || {
        title: previewReport.content.title,
        tags: previewReport.content.tags || [],
        date: previewReport.content.date,
        category: previewReport.content.category || 'report',
        ...previewReport.content
      },
      content: previewReport.content,
      attachments: previewReport.attachments || []
    }} />
  </ScreenOverlay>
{/if}

<style>
  .sse-import-container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .drop-section {
    margin-bottom: 32px;
  }

  .upload-area {
    text-align: center;
    padding: 48px 24px;
    border: 2px dashed #d1d5db;
    border-radius: 12px;
    background: #f9fafb;
    transition: all 0.3s ease;
  }

  .upload-area:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .upload-heading {
    color: #374151;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 24px 0;
  }

  .upload-actions {
    margin-bottom: 16px;
  }

  .upload-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #3b82f6;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s ease;
    border: none;
    text-decoration: none;
  }

  .upload-button:hover {
    background: #2563eb;
  }

  .upload-icon {
    display: flex;
    align-items: center;
  }

  .upload-icon svg {
    width: 20px;
    height: 20px;
  }

  .upload-hint {
    color: #6b7280;
    font-size: 14px;
    margin: 12px 0 0 0;
  }

  .file-types {
    color: #9ca3af;
    font-size: 12px;
    margin: 0;
  }

  .processing-section {
    margin-bottom: 32px;
  }

  .files-progress {
    margin-top: 32px;
  }

  .files-progress h4 {
    margin-bottom: 16px;
    color: #374151;
    font-size: 16px;
    font-weight: 600;
  }

  .files-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .fallback-notice {
    margin-top: 16px;
    padding: 12px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    text-align: center;
  }

  .fallback-notice p {
    margin: 0;
    color: #92400e;
    font-size: 14px;
  }

  .results-section {
    margin-top: 32px;
  }

  .results-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .results-header h3 {
    color: #10b981;
    font-size: 24px;
    margin-bottom: 8px;
  }

  .results-header p {
    color: #6b7280;
    font-size: 16px;
  }

  .profile-group {
    margin-bottom: 32px;
    padding: 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .documents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  .preview-document-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 200px;
  }

  .preview-document-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .preview-document-card:active {
    transform: translateY(-2px);
  }

  .preview-document-card:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .card-header {
    padding: 12px 16px;
    display: flex;
    justify-content: flex-end;
  }

  .date-badge {
    background: #f3f4f6;
    color: #6b7280;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
  }

  .card-body {
    flex: 1;
    padding: 0 16px 12px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .card-title {
    color: #111827;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tag {
    background: #eff6ff;
    color: #2563eb;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }

  .category-icon {
    width: 20px;
    height: 20px;
    fill: #6b7280;
  }

  .category-label {
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .save-section {
    text-align: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .save-button,
  .clear-button {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    margin: 0 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .save-button {
    background: #10b981;
    color: white;
    border: none;
  }

  .save-button:hover {
    background: #059669;
  }

  .clear-button {
    background: transparent;
    color: #6b7280;
    border: 1px solid #d1d5db;
  }

  .clear-button:hover {
    background: #f9fafb;
  }

  .error-section {
    text-align: center;
    padding: 32px;
    background: #fef2f2;
    border-radius: 12px;
    border: 1px solid #fecaca;
  }

  .error-section h3 {
    color: #dc2626;
    margin-bottom: 16px;
  }

  .error-section p {
    color: #7f1d1d;
    margin-bottom: 24px;
  }

  .error-actions button {
    padding: 10px 20px;
    margin: 0 8px;
    border-radius: 6px;
    border: 1px solid #dc2626;
    background: white;
    color: #dc2626;
    cursor: pointer;
    font-weight: 500;
  }

  .error-actions button:hover {
    background: #fef2f2;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .sse-import-container {
      padding: 16px;
    }

    .upload-area {
      padding: 32px 16px;
    }

    .upload-heading {
      font-size: 18px;
    }

    .upload-button {
      padding: 10px 20px;
      font-size: 14px;
    }

    .files-grid {
      grid-template-columns: 1fr;
    }

    .documents-grid {
      grid-template-columns: 1fr;
    }

    .save-section {
      flex-direction: column;
      gap: 12px;
    }

    .save-button,
    .clear-button {
      width: 100%;
      margin: 0;
    }
  }
</style>