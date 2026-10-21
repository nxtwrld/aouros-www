# Medical Document Import Architecture

> **Status:** Implemented (parts stale) · **Type:** Reference · **Verified:** 2026-10-21
> **Built:** `src/routes/v1/import/jobs/`, `src/lib/import/{file-cache,job-store,job-manager,finalizer}.ts`, `src/lib/import.server/`, `src/lib/langgraph/` · **Pending:** external MCP validation (Phase 4)

## Overview

The Mediqom document import system is a sophisticated medical document processing pipeline that combines client-side document handling, server-side AI analysis, and end-to-end encryption to securely process and store medical records. The system supports multiple document types including medical reports, lab results, prescriptions, imaging studies, and dental records.

## Architecture Components

### 1. Client-Side Processing (`src/components/import/`)

The client-side import system handles document upload, preprocessing, and encryption:

- **`Index.svelte`**: Main orchestrator component managing the import flow
- **`ImportDocument.svelte`**: Individual document display and management
- **`ImportView.svelte`**: Job-based import flow (see [Resilient Job-Based Import](#3-resilient-job-based-import-current-client-path))
- **`JobCard.svelte` / `JobProgressCard.svelte`**: Per-job progress cards
- **`DualStageProgress.svelte`**: Two-stage progress indicator (extraction + analysis)
- **`SelectProfile.svelte`**: Patient profile selection and assignment

(`FileProgressCard.svelte` and `SSEIndex.svelte` no longer exist. SSE is handled by `src/lib/import/sse-client.ts`.)

### 2. Server-Side AI Processing (`src/lib/import.server/`)

The server-side analysis engine processes documents through multiple AI providers:

- **`assessInputs.ts`**: Document assessment and classification
- **`convertWorkflowResult.ts`**: Converts LangGraph workflow output into the import result shape
- **`gemini.ts`**: Google Gemini Vision API integration

Key features:

- Multi-language schema localization (Czech, German, English)
- Document type detection (report, laboratory, dental, imaging, prescription)
- Conditional extraction based on detected features
- Token usage optimization and tracking

### 3. LangGraph Workflow Orchestration (`src/lib/langgraph/`)

Advanced workflow management using query-oriented models (QOM):

#### Core Workflows

- **`workflows/unified-workflow.ts`**: Main workflow orchestrator
- **`workflows/multi-node-orchestrator.ts`**: Parallel node execution engine
- **`workflows/document-processing.ts`**: Document-specific processing pipeline

#### Processing Nodes (23+ specialized nodes)

- **Input Validation**: Schema validation, format checking
- **Feature Detection**: Medical content classification
- **Provider Selection**: Optimal AI provider routing
- **Document Type Router**: Specialized processing paths
- **Medical Terms Generation**: Automatic medical terminology extraction
- **Quality Gate**: Output validation and confidence scoring
- **Cross-Validation Aggregator**: Multi-provider consensus building

#### Advanced Features

- **Universal Node Factory**: Dynamic node creation and configuration
- **Workflow Recording/Replay**: Development cost reduction (95% savings)
- **Parallel Processing**: Concurrent node execution for performance
- **Selective Analysis**: Process only relevant document sections

### 4. Security & Encryption (`src/lib/documents/`)

Multi-layer security architecture ensuring data privacy:

- **AES-256 Encryption**: Document content encryption
- **RSA Key Management**: Public key encryption of AES keys
- **Client-Side Only**: Server never accesses raw encryption keys
- **Per-Profile Keys**: Separate encryption keys per patient profile

## Processing Pipeline

### Phase 1: Document Upload & Extraction

```mermaid
graph LR
    A[File Upload] --> B[Format Detection]
    B --> C{Import Mode?}
    C -->|SSE| D[Real-time Stream]
    C -->|Batch| E[Traditional Processing]
    D --> F[Extract Text/Images]
    E --> F
    F --> G[Page Segmentation]
```

1. **File Upload**: User selects PDF, images (JPG, PNG, WEBP)
2. **Format Detection**: Identify file type and structure
3. **Import Mode Selection**: Choose SSE streaming or batch processing
4. **Text/Image Extraction**: OCR for images, text extraction for PDFs
5. **Page Segmentation**: Split multi-page documents

### Phase 2: AI Analysis

```mermaid
graph TD
    A[Extracted Content] --> B[Feature Detection]
    B --> C{Medical?}
    C -->|Yes| D[Document Classification]
    C -->|No| E[Reject]
    D --> F{Document Type}
    F -->|Report| G[Report Processor]
    F -->|Lab| H[Laboratory Processor]
    F -->|Imaging| I[Imaging Processor]
    F -->|Dental| J[Dental Processor]
    G --> K[Schema Application]
    H --> K
    I --> K
    J --> K
    K --> L[Data Extraction]
```

1. **Feature Detection**: Identify medical relevance and document features
2. **Document Classification**: Determine specific document type
3. **Schema Selection**: Apply appropriate extraction schema
4. **Structured Extraction**: Extract data according to schema
5. **Validation**: Verify extracted data completeness

### Phase 3: Post-Processing & Storage

```mermaid
graph LR
    A[Extracted Data] --> B[Tag Enhancement]
    B --> C[Signal Normalization]
    C --> D[Quality Check]
    D --> E[Client Encryption]
    E --> F[Store Document]
    F --> G[Update Context]
```

1. **Tag Enhancement**: Add body parts and medical terms
2. **Signal Normalization**: Standardize lab values and units
3. **Quality Validation**: Ensure data meets minimum requirements
4. **Client-Side Encryption**: AES encryption with RSA key management
5. **Secure Storage**: Save encrypted document to database
6. **Context Update**: Update patient medical context

## Import Modes

### 1. Traditional Batch Mode

- Sequential file processing
- Complete analysis before returning results
- Suitable for small batches (1-5 documents)
- No real-time progress updates

### 2. SSE Streaming Mode

- Real-time progress updates via Server-Sent Events
- Parallel processing capabilities
- Stage-by-stage progress tracking
- Optimal for large batches or slow connections

There is no `src/lib/config/import-flags.ts` and no SSE on/off flag: SSE is always used. See [Configuration](#configuration).

### 3. Resilient Job-Based Import (current client path)

`src/components/import/ImportView.svelte` imports through server-side **jobs**, so an import survives page reloads, tab switches and dropped connections.

**Server endpoints** (`src/routes/v1/import/jobs/`):

- **POST** `/v1/import/jobs` creates a job. **GET** lists the user's jobs that haven't expired.
- **GET / PATCH / DELETE** `/v1/import/jobs/[id]` reads, updates or removes a single job.
- **PATCH** `/v1/import/jobs/[id]/layout` merges client-side DocLayout-YOLO detections into the job's `file_manifest` while the server OCR is still running.
- **POST** `/v1/import/jobs/[id]/process` runs extraction and then per-document analysis as an **SSE stream**. It also persists `stage`/`progress` to the `import_jobs` row, so a reconnecting client can resume. Results are stored AES-256-GCM encrypted (`encrypted_extraction_result` and `encrypted_analysis_results`, with a job key wrapped by the user's RSA public key).

**Client modules** (`src/lib/import/`):

- `file-cache.ts`: an IndexedDB cache (`mediqom-import-cache`) of the original files, encrypted with ephemeral AES-256-GCM keys, kept so a job can be retried.
- `job-store.ts`: Svelte stores (`importJobs`, plus derived `activeJobs`, `completedJobs`, `errorJobs` and `pendingJobs`) and import errors.
- `job-manager.ts`: the orchestrator (`createJob`, `processJob`, `fetchJob`, `checkPendingJobs`, `retryJob`, `deleteJob`, `updateLayoutDetections`).
- `finalizer.ts`: decrypts job results, assembles documents and saves them (`decryptJobResults`, `assembleDocuments`, `saveDocuments`).

**Retention (`import_jobs` TTL):** rows carry an `expires_at` that a trigger updates when the status changes. Per `supabase/migrations/20260213_encrypt_import_results.sql`, **completed jobs expire after 1 hour** (cut from 7 days) and **failed jobs after 24 hours**. The default TTL at creation (reported as 24h) comes from the original table migration, which isn't in this repo.

## API Endpoints

### Document Extraction

- **POST** `/v1/import/extract` - Traditional extraction
- **POST** `/v1/import/extract/stream` - SSE streaming extraction

### Document Analysis

- **POST** `/v1/import/report/stream` - SSE streaming analysis (there is no non-streaming `/v1/import/report` route)

### Medical Imaging

- **POST** `/v1/import/medical-imaging` and `/v1/import/medical-imaging/stream`

### Import Jobs

- See [Resilient Job-Based Import](#3-resilient-job-based-import-current-client-path) above

### Attachment Management

- **POST** `/v1/med/profiles/{profile_id}/attachments` - Upload encrypted attachments
- **DELETE** `/v1/med/profiles/{profile_id}/attachments` - Remove attachments

## Configuration

### Feature Flags

Import-related flags live in `src/lib/config/feature-flags.ts` (`FEATURE_FLAGS`), driven by `PUBLIC_ENABLE_*` env vars:

```typescript
FEATURE_FLAGS = {
  ENHANCED_SIGNAL_PROCESSING, // PUBLIC_ENABLE_ENHANCED_SIGNALS
  MULTI_PROVIDER_AI, // PUBLIC_ENABLE_MULTI_PROVIDER_AI
  EXTERNAL_VALIDATION, // PUBLIC_ENABLE_EXTERNAL_VALIDATION (MCP validation, Phase 4)
  ENCRYPTED_IMPORT_CACHE, // on unless PUBLIC_ENABLE_ENCRYPTED_IMPORT_CACHE === "false"
  // ...plus non-import flags (CARE_PLAN, MEDICATIONS, SPECIALIZED_UI)
};
```

### Supported Document Types

- Medical Reports
- Laboratory Results
- Imaging Studies (X-ray, MRI, CT)
- Dental Records
- Prescriptions
- Immunization Records
- DICOM Images

### Language Support

- English (primary)
- Czech
- German

## Error Handling

### Client-Side Recovery

- Automatic retry with exponential backoff
- Partial batch processing on failure
- User-friendly error messages
- Progress preservation on reconnection

### Server-Side Resilience

- Provider fallback chains
- Graceful degradation
- Detailed error logging
- Transaction rollback on failure

## Performance Metrics

### Current Performance

- **Processing Time**: 3-8 seconds per document
- **Token Usage**: $0.08-0.18 per document
- **Concurrent Processing**: 10-20 documents
- **Success Rate**: 92-95% for medical documents

### Optimization Strategies

- Parallel node execution in LangGraph
- Selective section processing
- Provider-based cost optimization
- Workflow replay for development

## Security Considerations

### Data Protection

- **End-to-end encryption**: Client encrypts before transmission
- **Zero-knowledge architecture**: Server cannot decrypt documents
- **Key rotation**: Regular key updates for enhanced security
- **Audit trails**: Complete processing history

### HIPAA Compliance

- Encrypted data at rest and in transit
- Access controls and authentication
- Audit logging for all operations
- Secure key management practices

## Development Workflow

### Adding New Document Types

1. Create schema in `src/lib/configurations/`
2. Add processor node in `src/lib/langgraph/nodes/`
3. Update document router logic
4. Add UI components if needed
5. Test with sample documents

### Debugging Tools

- Workflow recording and replay
- SSE event monitoring
- Token usage tracking
- Processing time profiling

## Future Enhancements

### Phase 4 (Planned)

- MCP external validation integration
- Advanced medical term linking
- Multi-provider consensus validation
- LangSmith monitoring integration

### Phase 5 (Proposed)

- Support for additional document formats
- Real-time collaboration features
- Advanced duplicate detection
- Automated medical coding (ICD-10, CPT)

## Related Documentation

- [IMPORT_ENCRYPTION.md](IMPORT_ENCRYPTION.md) - Import encryption implementation
- [CLAUDE.md](../../../CLAUDE.md) - Project overview and quick reference
