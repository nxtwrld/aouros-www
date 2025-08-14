# AI DICOM Import Implementation Plan

## Executive Summary

This document outlines the comprehensive integration of medical imaging (DICOM files and standard medical images) into Mediqom's existing document import system. The plan leverages the current LangGraph workflow architecture while adding specialized capabilities for medical image processing, analysis, and visualization.

**Key Goals:**
- Add DICOM file support with client-side processing using Cornerstone.js
- Implement AI-driven medical image analysis for body part detection and anomaly identification
- Maintain existing workflow efficiency and parallel processing architecture
- Extend document viewer with advanced DICOM visualization capabilities

## Current Architecture Analysis

### Existing LangGraph Import Flow Efficiency

Our current import system demonstrates excellent optimization patterns:

#### ✅ **Highly Optimized Design Elements**

1. **Single Feature Detection Call**: One comprehensive AI request identifies 30+ medical sections
   - Eliminates multiple AI calls for section detection
   - Uses comprehensive JSON schema with boolean flags
   - Supports conditional node execution based on detected features

2. **Universal Node Factory Pattern**: All 23+ processing nodes share common architecture
   - Consistent base class with standardized progress reporting
   - Schema-driven processing for each medical specialty
   - Dynamic node creation from configuration objects

3. **Intelligent Parallel Processing**: Multi-node orchestrator executes relevant nodes concurrently
   - Conditional execution - only runs nodes for detected features
   - Parallel execution groups based on priority levels
   - Efficient resource utilization with configurable concurrency limits

4. **Structured Output Mapping**: Clean aggregation of specialized node results
   - Proper ReportAnalysis interface compliance
   - Conflict resolution for overlapping medical sections
   - Backward compatibility maintenance

### Current Node Architecture

```typescript
// Example of efficient node configuration
"imaging-processing": {
  nodeName: "imaging-processing",
  description: "Medical imaging analysis",
  schemaPath: "$lib/configurations/imaging",
  triggers: ["hasImaging", "hasImagingFindings"],
  priority: 2,
  outputMapping: {
    reportField: "imaging"
  }
}
```

### Processing Flow Stages

1. **Input Validation** (30-40%) - Document structure and format validation
2. **Document Type Router** (40-50%) - Classification and routing logic
3. **Provider Selection** (50-60%) - Optimal AI provider selection
4. **Feature Detection** (60-70%) - Single comprehensive medical section detection
5. **Multi-Node Processing** (70-85%) - Parallel execution of relevant specialized nodes
6. **Medical Terms Generation** (85-90%) - Search optimization term generation
7. **External Validation** (95-98%) - Optional external validation (Phase 4)
8. **Quality Gate** (98-100%) - Final validation and confidence scoring

## Medical Imaging Integration Strategy

### Design Philosophy

**Two-Flow Architecture**: Implement FLOW1 (DICOM processing) and FLOW2 (mixed content analysis) as specified, leveraging existing optimized LangGraph architecture.

### Required Flows Implementation

#### FLOW1: DICOM File Processing (Client-Side)
1. **File Recognition**: Detect DICOM files (.dcm, .dicom, .dic) on client
2. **PNG Extraction**: Use Cornerstone.js to extract viewable PNG images
3. **Metadata Extraction**: Pull patient info, study details, modality data
4. **Storage Preparation**: Keep original DICOM in memory for encryption
5. **FLOW2 Initialization**: Pass extracted PNG to FLOW2 with isDicomExtracted=true

#### FLOW2: Mixed Content Image Analysis (Server-Side)
**Step 1 - Content Detection**: Classify image content type
- Document scans with text vs medical imaging
- Handle mixed content (medical images with embedded text)
- Skip detection step if isDicomExtracted=true (pre-classified)

**Step 2 - Medical Analysis** (if medical imaging detected):
- Body parts classification using existing classifier system
- Anomaly detection (fractures, tumors, abnormalities)
- Clinical findings extraction

### Integration Approach

#### Phase 1: Universal Metadata System and Enhanced Feature Detection
**Goal**: Create scalable metadata handling system for multiple document formats

```typescript
// New Universal Metadata System (src/lib/metadata/types.ts)
interface DocumentMetadata {
  source: 'dicom' | 'pdf_extracted' | 'hl7' | 'lab_instrument' | 'manual';
  originalFormat?: string;
  
  // Universal fields populated by any document type
  studyDate?: string;        // DICOM: studyDate, PDF: extracted from text
  patientInfo?: {
    name?: string;           // DICOM: patientName, PDF: extracted from text  
    id?: string;             // DICOM: patientId, PDF: extracted from text
    birthDate?: string;
  };
  
  // Medical context hints for AI processing (pre-computed)
  medicalContext?: {
    bodyParts?: string[];    // DICOM: from bodyPartExamined, PDF: null
    modality?: string;       // DICOM: modality field, PDF: inferred
    viewPosition?: string;   // DICOM: viewPosition, PDF: null
    specialty?: string;      // DICOM: from modality, PDF: inferred from text
    urgency?: number;        // Computed from various sources
  };
  
  // Format-specific metadata (strongly typed per format)
  dicom?: DicomSpecificMetadata;
  hl7?: HL7SpecificMetadata;    // Future
  pdf?: PDFSpecificMetadata;    // Future
}

// Enhanced server payload with universal metadata
interface ProcessingPayload {
  images: string[];             // Base64 images (always from client)
  text?: string;                // Extracted text content  
  metadata: DocumentMetadata;   // Universal metadata system
}

// Extensions to src/lib/configurations/feature-detection.ts
hasMedicalImaging: {
  type: "boolean",
  description: "Does the document contain medical images (X-ray, MRI, CT, ultrasound) or DICOM data requiring specialized analysis?"
},
imageContentType: {
  type: "string",
  enum: ["document_scan", "medical_imaging", "mixed_content", "non_medical"],
  description: "Primary content type classification for images"
},
hasEmbeddedText: {
  type: "boolean", 
  description: "Does the medical image contain embedded text/annotations?"
},
isScannedDocument: {
  type: "boolean",
  description: "Is this a scanned text document rather than medical imaging?"
},
isDicomExtracted: {
  type: "boolean",
  description: "Was this image data extracted from a DICOM file on the client side? (Skip content detection if true)"
},
// Metadata-informed fields (pre-populated from universal metadata)
metadataHints: {
  type: "object",
  properties: {
    bodyPartsHint: {
      type: "array",
      items: { type: "string" },
      description: "Body parts suggested by document metadata (e.g., DICOM bodyPartExamined)"
    },
    modalityHint: {
      type: "string", 
      description: "Imaging modality from metadata (CT, MRI, X-ray, etc.)"
    },
    studyDateHint: {
      type: "string",
      description: "Study date from metadata or extracted text"
    }
  },
  description: "Metadata-derived hints to inform AI analysis"
}
```

#### Phase 2: Unified Medical Analysis with Metadata Intelligence
**Goal**: Single comprehensive medical analysis node informed by universal metadata

```typescript
// Additions to src/lib/langgraph/factories/universal-node-factory.ts

// STEP 1: Smart Image Processing (Skip if isDicomExtracted=true)
"smart-image-processor": {
  nodeName: "smart-image-processor",
  description: "Intelligently classify image content and conditionally extract text, skipping OCR for pure medical images",
  schemaPath: "$lib/configurations/smart-image-processor",
  triggers: ["hasImages"],
  priority: 1,
  skipConditions: ["isDicomExtracted"], // Skip if DICOM already classified
  outputMapping: {
    reportField: "smartImageProcessing",
    conditionalFields: {
      "extractedText": "documentText", // Only populated if OCR performed
      "imageContentType": "contentClassification",
      "processingRecommendation": "routingDecision"
    }
  }
},

// STEP 2: Comprehensive Medical Analysis (Replaces separate body parts + anomaly nodes)
"comprehensive-medical-image-analysis": {
  nodeName: "comprehensive-medical-image-analysis",
  description: "Unified medical image analysis using metadata hints for body parts, anomalies, and clinical findings",
  schemaPath: "$lib/configurations/comprehensive-medical-image-analysis",
  triggers: ["imageContentType=medical_imaging", "isDicomExtracted"],
  priority: 2,
  contextSources: ["metadata.medicalContext"], // Use metadata as AI context
  outputMapping: {
    reportField: "medicalImageAnalysis",
    // Split comprehensive analysis into multiple report sections
    additionalMappings: {
      "bodyParts": "detectedBodyParts",
      "medicalAnomalies": "clinicalAnomalies",
      "clinicalFindings": "clinicalFindings",
      "metadataValidation": "metadataAlignment"
    }
  }
},

// REMOVED: Separate body-parts-classification node (merged into comprehensive)
// REMOVED: Separate medical-anomaly-detection node (merged into comprehensive)  
// REMOVED: dicom-metadata-processing node (metadata used as context, not processed)
```

#### Phase 3: Enhanced Conditional Routing
**Goal**: Implement proper flow control for two-flow architecture

```typescript
// New routing logic for src/lib/langgraph/workflows/unified-workflow.ts

const shouldProcessImages = (state: DocumentProcessingState): string => {
  // Skip smart processing for DICOM-extracted images (already classified as medical)
  if (state.featureDetectionResults?.isDicomExtracted) {
    console.log("✅ DICOM extracted - skipping smart processing, proceeding directly to medical analysis");
    return "skip_smart_processing";
  }
  
  // Process standard uploaded images with smart processor
  if (state.featureDetectionResults?.hasImages) {
    console.log("🔍 Standard images detected - performing smart image processing (classification + conditional OCR)");
    return "smart_process";
  }
  
  console.log("📝 No images to process");
  return "no_images";
};

const shouldAnalyzeMedicalContent = (state: DocumentProcessingState): string => {
  // Route based on smart processor results or DICOM pre-classification
  const smartResults = state.smartImageProcessing;
  const isDicomExtracted = state.featureDetectionResults?.isDicomExtracted;
  
  // DICOM images always go to medical analysis
  if (isDicomExtracted) {
    console.log("🏥 DICOM content - proceeding to medical analysis");
    return "analyze_medical";
  }
  
  // Check smart processor routing recommendation
  if (smartResults?.skipMedicalAnalysis === false) {
    const contentType = smartResults?.imageContentType;
    
    if (contentType === "medical_imaging") {
      console.log("🏥 Medical imaging detected - proceeding to medical analysis");
      return "analyze_medical";
    }
    
    if (contentType === "mixed_content") {
      console.log("📋 Mixed content - processing both medical and document aspects");
      return "process_mixed";
    }
  }
  
  if (smartResults?.skipMedicalAnalysis === true) {
    console.log("📄 Document scan detected - skipping medical analysis");
    return "skip_medical";
  }
  
  console.log("❌ Non-medical content - skipping medical analysis");
  return "skip_analysis";
};

const shouldProcessDocumentText = (state: DocumentProcessingState): string => {
  // Route based on smart processor text extraction results
  const smartResults = state.smartImageProcessing;
  
  if (smartResults?.skipDocumentProcessing === true) {
    console.log("🏥 Pure medical imaging - skipping document text processing");
    return "skip_document";
  }
  
  if (smartResults?.textExtractionPerformed === true && smartResults?.extractedText) {
    console.log("📄 Text extracted - proceeding to document processing");
    return "process_text";
  }
  
  console.log("📝 No text content to process");
  return "no_text";
};
```

## Smart Image Processor Integration Plan

### Implementation Steps

#### Step 1: Create Smart Image Processor Schema
**File**: `src/lib/configurations/smart-image-processor.ts`
- Combine image classification and conditional OCR in single function definition
- Return classification results + extracted text (null for medical images)
- Include routing flags for downstream processing decisions

#### Step 2: Update Universal Node Factory
**File**: `src/lib/langgraph/factories/universal-node-factory.ts`
- Replace `image-content-detection` node with `smart-image-processor`
- Set priority 1 (early pipeline execution)
- Configure conditional output mapping for text and classification results
- Add skip conditions for DICOM-extracted images

#### Step 3: Update Workflow Routing
**File**: `src/lib/langgraph/workflows/unified-workflow.ts`
- Modify routing functions to use smart processor results
- Add `shouldProcessImages()` function for smart processing decisions
- Update `shouldAnalyzeMedicalContent()` to use smart processor flags
- Add `shouldProcessDocumentText()` for conditional text processing

#### Step 4: Update Server Endpoint
**File**: `src/routes/v1/import/extract/+server.ts`
- Modify payload handling to support smart processor results
- Route based on `skipMedicalAnalysis` and `skipDocumentProcessing` flags
- Integrate with existing feature detection flow

### Integration Points

#### With Existing Feature Detection
- Smart processor runs before feature detection
- Results inform feature detection context
- DICOM files bypass smart processor (already classified)

#### With Medical Analysis Nodes
- Smart processor determines if medical analysis should run
- Provides modality hints for specialized analysis
- Passes extracted annotations to medical analysis

#### With Document Processing
- Conditional text extraction based on content classification
- Skip OCR entirely for pure medical images
- Extract annotations for mixed content

## Corrected Architecture Understanding

### Current File Processing Flow (Existing)

The existing system has a clear, efficient architecture:

1. **File Input** → `fileInput()` in `src/components/import/Index.svelte`
2. **Task Creation** → `createTasks()` in `src/lib/files/index.ts` processes files:
   - **PDFs**: Convert to images via `processPDF()` 
   - **Images**: Group as image batch
   - **All become images**: Everything is converted to base64 image arrays
3. **Server Processing** → Images sent to `/v1/import/extract` then through LangGraph
4. **Document Creation** → Results processed into documents with attachments

### Key Insight: Augment, Don't Replace

**✅ Correct Approach**: Enhance existing `createTasks()` function to:
- Detect DICOM files alongside PDFs and images
- Extract PNG images from DICOM using Cornerstone.js  
- Bundle DICOM metadata with extracted images
- Store original DICOM as attachment for encryption

**❌ Previous Misunderstanding**: Creating parallel processing flows

## Technical Implementation Details

### 1. Enhanced Client-Side File Processing

#### A. Enhanced createTasks() Function (`src/lib/files/index.ts`)

```typescript
// Add DICOM support to existing createTasks function

import { dicomHandler } from './dicom-handler'; // New import

export async function createTasks(files: File[]): Promise<Task[]> {
  const tasks: Task[] = [];

  // Enhanced file grouping - add DICOM detection
  const groupped = {
    images: [] as File[],
    dicom: [] as File[], // NEW: DICOM files
    rest: [] as File[],
  };

  for (let file of files) {
    if (file.type.startsWith("image")) {
      groupped.images.push(file);
    } else if (dicomHandler.detectDicomFile(file)) { // NEW: DICOM detection
      groupped.dicom.push(file);
    } else {
      groupped.rest.push(file);
    }
  }

  // Existing PDF processing (unchanged)
  while (groupped.rest.length > 0) {
    // ... existing PDF processing logic
  }

  // NEW: Process DICOM files
  for (const dicomFile of groupped.dicom) {
    try {
      const dicomResult = await dicomHandler.processDicomFile(dicomFile);
      
      // Convert extracted images to base64 (same format as existing images)
      const base64Images = await Promise.all(
        dicomResult.extractedImages.map(async (imageData) => 
          await imageDataToBase64(imageData)
        )
      );
      
      tasks.push({
        title: dicomFile.name,
        type: "application/dicom", // NEW task type
        icon: "dicom",
        data: base64Images, // Same format as existing image data
        dicomMetadata: dicomResult.metadata, // NEW: Bundle metadata
        originalDicom: dicomResult.originalDicomBuffer, // Store for attachment
        state: TaskState.NEW,
        files: [dicomFile],
      });
    } catch (error) {
      console.error('DICOM processing failed:', error);
      // Could fallback to treating as regular file
    }
  }

  // Existing image processing (unchanged)
  if (groupped.images.length > 0) {
    tasks.push({
      title: "Images",
      type: "images", 
      icon: groupped.images[0].type.split("/")[1],
      data: await Promise.all(
        groupped.images.map(async (file) => {
          return await readAsBase64(file);
        }),
      ),
      state: TaskState.NEW,
      files: groupped.images,
    });
  }

  return tasks;
}

// Helper function to convert ImageData to base64
async function imageDataToBase64(imageData: ImageData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1]; // Return base64 without data URL prefix
}
```

#### B. DICOM File Handler (`src/lib/files/dicom-handler.ts`)

```typescript
// New file for DICOM processing using Cornerstone.js
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyDescription?: string;
  modality?: string;
  bodyPartExamined?: string;
  viewPosition?: string;
  institutionName?: string;
  referringPhysician?: string;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  // Technical parameters for viewer
  pixelSpacing?: number[];
  windowCenter?: number;
  windowWidth?: number;
}

export interface DicomProcessingResult {
  extractedImages: ImageData[]; // For AI processing
  metadata: DicomMetadata; // For bundling with server request
  originalDicomBuffer: ArrayBuffer; // For attachment storage
}

export class DicomHandler {
  private isInitialized = false;

  // Initialize Cornerstone.js
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    cornerstone.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    this.isInitialized = true;
  }

  // Detect DICOM files by extension and MIME type
  detectDicomFile(file: File): boolean {
    const dicomExtensions = ['.dcm', '.dicom', '.dic'];
    const extension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
    return dicomExtensions.includes(extension) || file.type === 'application/dicom';
  }

  // Main processing function - extract images and metadata
  async processDicomFile(file: File): Promise<DicomProcessingResult> {
    await this.initialize();
    
    const arrayBuffer = await file.arrayBuffer();
    const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
    
    return {
      extractedImages: await this.extractImages(file),
      metadata: this.extractMetadata(dataSet),
      originalDicomBuffer: arrayBuffer,
    };
  }

  // Extract DICOM metadata for medical context
  private extractMetadata(dataSet: any): DicomMetadata {
    return {
      patientName: dataSet.string('x00100010'),
      patientId: dataSet.string('x00100020'), 
      studyDate: dataSet.string('x00080020'),
      studyDescription: dataSet.string('x00081030'),
      modality: dataSet.string('x00080060'),
      bodyPartExamined: dataSet.string('x00180015'),
      viewPosition: dataSet.string('x00185101'),
      institutionName: dataSet.string('x00080080'),
      referringPhysician: dataSet.string('x00080090'),
      studyInstanceUID: dataSet.string('x0020000d'),
      seriesInstanceUID: dataSet.string('x0020000e'),
      // Technical parameters
      pixelSpacing: this.parsePixelSpacing(dataSet.string('x00280030')),
      windowCenter: dataSet.intString('x00281050'),
      windowWidth: dataSet.intString('x00281051')
    };
  }

  // Extract PNG images using Cornerstone.js
  private async extractImages(file: File): Promise<ImageData[]> {
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
    const image = await cornerstone.loadImage(imageId);
    
    // Convert Cornerstone image to ImageData for AI processing
    return [this.cornerstoneImageToImageData(image)];
  }

  // Convert Cornerstone image to standard ImageData
  private cornerstoneImageToImageData(image: any): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    
    // Apply DICOM windowing and convert to RGB
    const imageData = ctx.createImageData(image.width, image.height);
    // ... DICOM to RGB conversion logic
    
    return imageData;
  }
}

export const dicomHandler = new DicomHandler();
```

#### B. Enhanced Import Component Integration

```typescript
// Enhancement to src/components/import/Index.svelte
<script lang="ts">
  import { dicomHandler } from '$lib/files/dicom-handler';
  
  let dicomProcessingResults: Map<string, DicomProcessingResult> = new Map();
  
  async function handleFileSelect(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    
    for (const file of files) {
      if (dicomHandler.detectDicomFile(file)) {
        try {
          const result = await dicomHandler.processDicomFile(file);
          dicomProcessingResults.set(file.name, result);
          
          // Add extracted images to standard processing flow
          await processExtractedImages(result.extractedImages, {
            isDicomExtracted: true,
            dicomMetadata: result.metadata,
            originalFileName: file.name
          });
        } catch (error) {
          console.error('DICOM processing failed:', error);
          // Fallback to standard file processing
        }
      } else {
        // Standard file processing
        await processStandardFile(file);
      }
    }
  }
</script>
```

#### C. Enhanced Task Processing (`src/lib/files/index.ts`)

```typescript
// Add DICOM task processing to existing processTask function

export async function processTask(task: Task): Promise<DocumentNew[]> {
  switch (task.type) {
    case "application/pdf":
      return (await processPDF(task.data as ArrayBuffer, task.password).then(
        (assessment) => {
          return processMultipageAssessmentToDocuments(assessment, [], task);
        },
      )) as DocumentNew[];
      
    case "images":
      return (await processImages(task.data as string[]).then((assessment) => {
        return processMultipageAssessmentToDocuments(assessment, [], task);
      })) as DocumentNew[];
      
    case "application/dicom": // NEW: DICOM processing
      return (await processDicomImages(
        task.data as string[], // Base64 images
        task.dicomMetadata // Bundle metadata
      ).then((assessment) => {
        return processMultipageAssessmentToDocuments(assessment, [], task);
      })) as DocumentNew[];
      
    default:
      return Promise.reject("Unsupported task type");
  }
}

// NEW: DICOM-specific image processing
async function processDicomImages(
  images: string[], 
  dicomMetadata: DicomMetadata
): Promise<ProcessedFile> {
  return new Promise(async (resolve, reject) => {
    const resizedImages = await Promise.all(
      images.map(async (image) => resizeImage(image, PROCESS_SIZE)),
    );

    // Enhanced request with DICOM metadata
    const response = await fetch("/v1/import/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: resizedImages,
        metadata: { // NEW: Bundle DICOM metadata
          isDicomExtracted: true,
          imageSource: 'dicom',
          dicomMetadata: dicomMetadata,
          imageContentType: 'medical_imaging' // Pre-classify
        }
      }),
    });

    const processed = await response.json();

    // Attach original images and thumbnails (same as existing)
    processed.pages = await Promise.all(
      processed.pages.map(async (page: any, index: number) => {
        const image = images[index];
        return {
          ...page,
          image,
          thumbnail: await resizeImage(image, THUMBNAIL_SIZE),
          dicomMetadata: dicomMetadata, // Include DICOM context
        };
      }),
    );

    resolve(processed);
  });
}
```

### 2. Enhanced Server-Side Processing

#### A. Smart Image Processor Schema (`src/lib/configurations/smart-image-processor.ts`)

```typescript
import type { FunctionDefinition } from "@langchain/core/language_models/base";

export default {
  name: "smart-image-processor",
  description: "Intelligently classify image content and conditionally extract text based on content type. CRITICAL WORKFLOW: First classify the image. Only extract text when imageContentType = document_scan OR hasEmbeddedText = true OR imageContentType = mixed_content. If imageContentType = medical_imaging AND hasEmbeddedText = false, set extractedText to null (skip OCR to save processing costs).",
  parameters: {
    type: "object",
    properties: {
      // Image Classification Results
      imageContentType: {
        type: "string",
        enum: ["document_scan", "medical_imaging", "mixed_content", "non_medical"],
        description: "Primary content type classification for the image"
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confidence score for content type classification"
      },
      
      // Content Analysis
      hasEmbeddedText: {
        type: "boolean",
        description: "Does the image contain embedded text or annotations?"
      },
      isScannedDocument: {
        type: "boolean",
        description: "Is this a scanned text document rather than medical imaging?"
      },
      medicalModalityHint: {
        type: "string",
        enum: ["xray", "ct", "mri", "ultrasound", "mammography", "pet", "nuclear", "unknown"],
        description: "Suspected medical imaging modality if medical content detected"
      },
      
      // Conditional Text Extraction
      extractedText: {
        type: "string",
        description: "Text content extracted from image. CONSTRAINT: Only extract text when (imageContentType = document_scan OR hasEmbeddedText = true OR imageContentType = mixed_content). Set to null when (imageContentType = medical_imaging AND hasEmbeddedText = false)."
      },
      textExtractionPerformed: {
        type: "boolean",
        description: "Whether OCR text extraction was performed on this image"
      },
      textConfidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confidence score for extracted text accuracy (only if OCR performed)"
      },
      
      // Processing Routing
      processingRecommendation: {
        type: "string",
        enum: ["proceed_to_medical_analysis", "proceed_to_document_processing", "process_both_aspects", "skip_analysis"],
        description: "Recommended next processing step based on content classification and text extraction results"
      },
      skipMedicalAnalysis: {
        type: "boolean",
        description: "Whether to skip medical image analysis (true for pure document scans)"
      },
      skipDocumentProcessing: {
        type: "boolean", 
        description: "Whether to skip document text processing (true for pure medical images)"
      }
    },
    required: [
      "imageContentType", 
      "confidence", 
      "hasEmbeddedText", 
      "isScannedDocument", 
      "extractedText", 
      "textExtractionPerformed", 
      "processingRecommendation",
      "skipMedicalAnalysis",
      "skipDocumentProcessing"
    ]
  }
} as FunctionDefinition;
```

#### B. Comprehensive Medical Image Analysis Schema (`src/lib/configurations/comprehensive-medical-image-analysis.ts`)

```typescript
import type { FunctionDefinition } from "@langchain/core/language_models/base";
import coreBodyParts from "./core.bodyParts";

export default {
  name: "comprehensive-medical-image-analyzer",
  description: "Unified medical image analysis combining body part detection, anomaly identification, and clinical findings using metadata hints. Use provided metadata context (DICOM metadata, study information, modality hints) to enhance analysis accuracy and focus detection on relevant anatomical regions.",
  parameters: {
    type: "object",
    properties: {
      // Core medical components - reuse shared schemas  
      bodyParts: coreBodyParts,
      
      // Image-specific visual regions (separate from core body parts data)
      imageRegions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            bodyPartId: {
              type: "string",
              description: "Reference to body part identification from bodyParts array"
            },
            boundingBox: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" }
              },
              description: "Bounding box coordinates for the anatomical region in the image"
            },
            visualConfidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Visual detection confidence for this region in the image"
            }
          },
          required: ["bodyPartId", "visualConfidence"]
        },
        description: "Visual regions in the image corresponding to detected body parts"
      },
      
      // Clinical Anomalies Analysis (replaces separate medical-anomaly-detection node)
      clinicalAnomalies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            finding: {
              type: "string",
              description: "Description of the clinical finding or anomaly"
            },
            location: {
              type: "string",
              description: "Anatomical location of the finding"
            },
            severity: {
              type: "string",
              enum: ["normal", "mild", "moderate", "severe", "critical"],
              description: "Clinical severity assessment"
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confidence score for this finding"
            },
            urgency: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Clinical urgency level (1=routine, 5=emergency)"
            },
            category: {
              type: "string",
              enum: ["normal_variant", "pathological", "artifact", "requires_followup"],
              description: "Classification category for the finding"
            }
          },
          required: ["finding", "location", "severity", "confidence", "category"]
        },
        description: "Clinical findings and anomalies identified in the medical image"
      },
      
      // Comprehensive Clinical Assessment
      clinicalFindings: {
        type: "object",
        properties: {
          imageType: {
            type: "string",
            enum: ["xray", "ct", "mri", "ultrasound", "mammography", "pet", "nuclear", "other"],
            description: "Primary imaging modality (confirm or correct metadata hint)"
          },
          imageQuality: {
            type: "string",
            enum: ["excellent", "good", "adequate", "poor", "non-diagnostic"],
            description: "Technical quality assessment of the medical image"
          },
          anatomicalView: {
            type: "string",
            enum: ["ap", "pa", "lateral", "oblique", "axial", "sagittal", "coronal", "other"],
            description: "Anatomical view or projection of the image"
          },
          overallImpression: {
            type: "string",
            description: "Overall radiological impression or summary of findings"
          },
          recommendedFollowUp: {
            type: "string",
            description: "Clinical recommendations for follow-up or additional imaging"
          },
          abnormalitiesDetected: {
            type: "boolean",
            description: "Whether any abnormalities or pathological findings were detected"
          }
        },
        required: ["imageType", "imageQuality", "anatomicalView", "overallImpression", "abnormalitiesDetected"]
      },
      
      // Metadata Validation (replaces dicom-metadata-processing node)
      metadataValidation: {
        type: "object",
        properties: {
          metadataAccuracy: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "How well metadata hints matched actual image content"
          },
          correctedFields: {
            type: "array",
            items: { type: "string" },
            description: "Metadata fields that were corrected based on image analysis"
          },
          missingFields: {
            type: "array",
            items: { type: "string" },
            description: "Important metadata fields that were missing but detected in image"
          },
          qualityIssues: {
            type: "array",
            items: { type: "string" },
            description: "Any quality or consistency issues found with the metadata"
          }
        },
        required: ["metadataAccuracy"]
      }
    },
    required: ["bodyParts", "imageRegions", "clinicalAnomalies", "clinicalFindings", "metadataValidation"]
  }
} as FunctionDefinition;
```


### 3. Document Viewer Enhancements

#### Enhanced SectionImaging Component

The existing `src/components/documents/SectionImaging.svelte` already provides excellent DICOM support. Enhancements needed:

```typescript
// Additional features for SectionImaging.svelte:

// 1. AI Analysis Overlay Integration
interface AnalysisOverlay {
  bodyRegions: BodyRegion[];
  clinicalFindings: ClinicalFinding[];
  showOverlays: boolean;
}

// 2. Enhanced DICOM Metadata Display
interface DicomDisplayOptions {
  showTechnicalDetails: boolean;
  showPatientInfo: boolean;  
  showStudyInfo: boolean;
}

// 3. Measurement Tools Integration
interface MeasurementTools {
  enableRuler: boolean;
  enableAngleOmeasurement: boolean;
  enableAreaMeasurement: boolean;
  measurements: Measurement[];
}

// 4. Multi-frame Support
interface MultiFrameSupport {
  currentFrame: number;
  totalFrames: number;
  frameRate: number;
  playback: boolean;
}
```

### 4. Data Models & Type Definitions

#### Core Interfaces (`src/lib/types/medical-imaging.ts`)

```typescript
export interface MedicalImageAnalysis {
  imageType: ImageModality;
  imageQuality: ImageQuality;
  anatomicalView: AnatomicalView;
  bodyRegions: BodyRegion[];
  clinicalFindings: ClinicalFinding[];
  abnormalitiesDetected: boolean;
  recommendedFollowUp?: string;
  radiologicalImpression?: string;
  processingTimestamp: string;
  aiProvider: string;
  confidence: number;
}

export interface BodyRegion {
  name: string;
  confidence: number;
  boundingBox?: BoundingBox;
  anatomicalCategory: 'head' | 'chest' | 'abdomen' | 'pelvis' | 'extremities' | 'spine';
}

export interface ClinicalFinding {
  finding: string;
  location: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  urgency: 1 | 2 | 3 | 4 | 5;
  category: 'normal' | 'abnormal' | 'pathological' | 'artifact';
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ImageModality = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'mammography' | 'pet' | 'nuclear' | 'other';
export type ImageQuality = 'excellent' | 'good' | 'adequate' | 'poor' | 'non-diagnostic';  
export type AnatomicalView = 'ap' | 'pa' | 'lateral' | 'oblique' | 'axial' | 'sagittal' | 'coronal' | 'other';

export interface DicomDocument extends Document {
  type: 'medical_imaging';
  content: {
    medicalImageAnalysis?: MedicalImageAnalysis;
    dicomMetadata?: DicomMetadata;
    originalImages: string[]; // URLs to extracted images
    thumbnails: string[]; // URLs to thumbnails
  };
  attachments: Array<{
    type: 'application/dicom' | 'image/png';
    encrypted: boolean;
    original: boolean;
    extracted?: boolean;
    thumbnail?: boolean;
  }>;
}
```

### 5. API Endpoint Enhancements

#### New Endpoints

```typescript
// src/routes/v1/import/medical-image/analyze/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  const { images, metadata, language } = await request.json();
  
  // Process medical images through LangGraph workflow
  const result = await runUnifiedDocumentProcessingWorkflow(
    images, 
    '', // No text content for pure image analysis
    language,
    {
      enableMedicalImaging: true,
      imageMetadata: metadata
    }
  );
  
  return json(result);
};

// src/routes/v1/import/dicom/process/+server.ts  
export const POST: RequestHandler = async ({ request }) => {
  const { dicomData, extractedImages, metadata } = await request.json();
  
  // Process DICOM with metadata integration
  const result = await runUnifiedDocumentProcessingWorkflow(
    extractedImages,
    JSON.stringify(metadata), // DICOM metadata as text
    'English',
    {
      isDicomExtracted: true,
      dicomMetadata: metadata
    }
  );
  
  return json(result);
};
```

#### Enhanced SSE Streaming Support

```typescript
// src/routes/v1/import/medical-image/stream/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  // Create SSE stream for real-time medical image analysis
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: SSEProgressEvent) => {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      };

      // Process with real-time progress updates
      const result = await runUnifiedDocumentProcessingWorkflow(
        data.images,
        data.text || '',
        data.language,
        {
          enableMedicalImaging: true,
          streamResults: true
        },
        sendEvent // Real-time progress callback
      );
      
      // Send final result
      sendEvent({
        type: "complete",
        stage: "medical_image_analysis_complete", 
        progress: 100,
        message: "Medical image analysis completed",
        data: result,
        timestamp: Date.now()
      });
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};
```

### 6. Security & Encryption Strategy

#### Use Existing Attachment System

DICOM files should use the **existing well-designed attachment encryption system** in `src/lib/documents/index.ts`. No custom encryption needed.

#### DICOM Attachment Pattern

```typescript
// DICOM files create two attachments using existing system:

// 1. Original DICOM file as primary attachment
const dicomAttachment: Attachment = {
  file: await toBase64(dicomResult.originalDicomBuffer), // Base64 DICOM
  type: "application/dicom"
  // No thumbnail - this is the primary file
};

// 2. Extracted PNG as thumbnail attachment  
const thumbnailAttachment: Attachment = {
  file: extractedPngBase64, // Base64 PNG from Cornerstone.js
  type: "image/png",
  thumbnail: thumbnailBase64 // Smaller version for preview
};

// Use existing addDocument() with attachments array
const documentNew: DocumentNew = {
  type: DocumentType.document,
  content: {
    title: "DICOM Study",
    medicalImageAnalysis: analysisResults, // AI analysis results
    dicomMetadata: dicomMetadata // DICOM metadata
  },
  attachments: [dicomAttachment, thumbnailAttachment] // Existing system handles encryption
};

// Existing system automatically:
// ✅ Encrypts attachments with AES-256-GCM
// ✅ Encrypts AES key with user's RSA public key  
// ✅ Saves encrypted files to secure storage
// ✅ Creates proper document with attachment references
```

#### Integration with Existing processMultipageAssessmentToDocuments()

```typescript
// Enhance existing function in src/lib/files/index.ts
case "application/dicom":
  // Create attachments using existing pattern
  attachment = {
    thumbnail: pages[0].thumbnail, // PNG thumbnail
    type: "application/dicom", // Original DICOM file
    file: await toBase64(task.originalDicom) // From DicomProcessingResult
  };
  
  // Optional: Add extracted PNG as separate attachment
  if (task.extractedPngImages) {
    additionalAttachments.push({
      type: "image/png",
      file: task.extractedPngImages[0], // First extracted image
      thumbnail: await resizeImage(task.extractedPngImages[0], THUMBNAIL_SIZE)
    });
  }
  break;
```

#### Security Benefits of Existing System

The existing attachment system already provides:
- **AES-256-GCM encryption** for all attachment data
- **RSA-OAEP key encryption** for secure key management  
- **Per-user key encryption** for multi-user access
- **Automatic key rotation** and secure key storage
- **Proven security model** used across all document types

**No custom DICOM encryption needed** - leverage the existing robust system.

## Revised Implementation Timeline

### Phase 1: Client-Side DICOM Integration (Weeks 1-2)
**Deliverables:**
- [ ] Install Cornerstone.js dependencies (`npm install cornerstone-core cornerstone-wado-image-loader dicom-parser`)
- [ ] Implement `DicomHandler` class in `src/lib/files/dicom-handler.ts`
- [ ] Enhance `createTasks()` function in `src/lib/files/index.ts` with DICOM detection
- [ ] Add `processDicomImages()` function for server communication
- [ ] Add DICOM task type to `processTask()` function
- [ ] Test DICOM file detection and PNG extraction

**Key Milestones:**
- DICOM files automatically detected alongside PDFs and images
- PNG images successfully extracted from DICOM files using Cornerstone.js
- DICOM metadata bundled with image data for server processing
- Original DICOM files stored for attachment creation

### Phase 2: Server-Side Processing (Weeks 2-3)  
**Deliverables:**
- [ ] Enhance `/v1/import/extract` endpoint to accept DICOM metadata
- [ ] Update feature detection schema with `isDicomExtracted`, `imageContentType` flags
- [ ] Add image content detection node for non-DICOM images
- [ ] Integrate body parts classification using existing `bodyparts.extraction` schema
- [ ] Add medical anomaly detection node with specialized schema
- [ ] Update LangGraph routing with DICOM conditional logic
- [ ] Test server processing with bundled DICOM metadata

**Key Milestones:**
- Server correctly processes DICOM-extracted images with pre-classification
- Standard images properly classified as medical vs document scans
- Body parts detected using existing classifier system
- Medical anomalies identified with confidence scores

### Phase 3: Document Viewer Enhancement (Weeks 3-4)
**Deliverables:**
- [ ] Update attachment creation logic to include DICOM files with proper categorization
- [ ] Enhance existing `SectionImaging.svelte` with DICOM attachment support
- [ ] Add conditional viewer logic (Cornerstone.js for DICOM, standard for images)
- [ ] Integrate AI analysis overlays showing detected body parts and anomalies
- [ ] Add DICOM metadata display panel
- [ ] Test viewer switching between DICOM and standard image attachments

**Key Milestones:**
- Documents correctly created with DICOM attachments stored as encrypted files
- `SectionImaging.svelte` automatically detects and loads appropriate viewer
- DICOM files displayed using existing Cornerstone.js integration
- AI analysis results displayed as overlays on medical images

### Phase 4: Testing & Validation (Weeks 4-5)
**Deliverables:**
- [ ] Comprehensive testing with sample DICOM files
- [ ] Validation of AI detection accuracy
- [ ] Performance optimization and memory management
- [ ] Security audit of encryption implementation
- [ ] Integration testing with existing document workflow
- [ ] User acceptance testing with medical professionals

**Key Milestones:**
- 95%+ accuracy in DICOM file processing
- <5 second processing time for standard DICOM files
- Zero data leakage in encryption implementation
- Seamless integration with existing import workflow

### Phase 5: Production Deployment (Weeks 5-6)
**Deliverables:**
- [ ] Production environment configuration
- [ ] Monitoring and alerting setup
- [ ] Documentation and user guides
- [ ] Staff training materials
- [ ] Rollout plan and feature flag configuration
- [ ] Performance monitoring dashboard

**Key Milestones:**
- Feature deployed behind feature flag
- Monitoring confirms system stability
- User feedback collected and addressed
- Full production rollout completed

## Testing Strategy

### Sample DICOM Files
- **Chest X-rays**: AP and PA views with normal and abnormal findings
- **CT Scans**: Abdomen, chest, and brain studies with multi-frame series
- **MRI Images**: T1 and T2 weighted images with various anatomical regions
- **Ultrasound**: Cardiac echo and abdominal studies
- **Mammography**: Screening and diagnostic mammograms

### Testing Scenarios

#### Functional Testing
1. **DICOM File Detection**
   - Various file extensions (.dcm, .dicom, .dic)
   - MIME type detection
   - Corrupted file handling

2. **Image Extraction**
   - Single frame DICOM files
   - Multi-frame series
   - Different bit depths and color spaces
   - Compressed DICOM formats

3. **AI Analysis Accuracy**
   - Body part identification across modalities
   - Abnormality detection sensitivity
   - False positive rate assessment
   - Multi-language support

4. **Viewer Functionality**
   - Zoom and pan operations
   - Window/level adjustments  
   - Measurement tool accuracy
   - Overlay rendering performance

#### Performance Testing
- **Processing Speed**: <5 seconds for standard DICOM files
- **Memory Usage**: Efficient handling of large image series
- **Concurrent Processing**: Multiple DICOM files simultaneously
- **Network Performance**: SSE streaming with large images

#### Security Testing
- **Encryption Validation**: AES encryption of all DICOM data
- **Key Management**: RSA key encryption/decryption
- **Data Leakage**: Verify no unencrypted DICOM data in memory/storage
- **Access Control**: User-specific DICOM access validation

## Performance Considerations

### Optimization Strategies

#### Client-Side Optimization
1. **Progressive Image Loading**: Load thumbnails first, full resolution on demand
2. **Memory Management**: Dispose of unused Cornerstone image objects
3. **Worker Thread Processing**: Move DICOM processing to web workers
4. **Caching Strategy**: Cache processed DICOM metadata and thumbnails

#### Server-Side Optimization  
1. **Parallel Node Execution**: Maintain existing parallel processing model
2. **AI Provider Selection**: Route medical imaging to vision-capable models
3. **Token Optimization**: Efficient prompt engineering for medical image analysis
4. **Result Caching**: Cache analysis results for identical images

#### Network Optimization
1. **Image Compression**: Optimize PNG extraction for network transfer
2. **Progressive Enhancement**: Basic functionality without heavy dependencies
3. **SSE Optimization**: Efficient progress streaming for large files
4. **Chunked Upload**: Support for large DICOM file uploads

### Performance Targets

- **DICOM Processing Time**: <3 seconds for extraction + metadata
- **AI Analysis Time**: <8 seconds for comprehensive medical image analysis  
- **Viewer Loading Time**: <2 seconds for DICOM image display
- **Memory Usage**: <500MB for processing large DICOM series
- **Network Transfer**: <50% size increase over original DICOM files

## Success Metrics & KPIs

### Technical Metrics
- **Processing Accuracy**: >95% correct body part identification
- **Anomaly Detection Sensitivity**: >85% detection rate for obvious abnormalities
- **Processing Speed**: <10 seconds total for DICOM → Analysis → Display
- **System Uptime**: >99.5% availability during medical imaging operations
- **Error Rate**: <2% processing failures due to file format issues

### User Experience Metrics
- **User Adoption**: >80% of users with medical imaging use DICOM features
- **Task Completion Rate**: >90% successful DICOM file processing
- **User Satisfaction**: >4.5/5 rating for medical imaging workflow
- **Feature Usage**: >60% of users utilize AI analysis overlays
- **Support Tickets**: <5% of imports require support intervention

### Business Impact Metrics
- **Processing Efficiency**: 60% reduction in manual DICOM analysis time
- **Clinical Accuracy**: Improved detection of missed findings in routine images
- **Workflow Integration**: Seamless integration with existing medical records
- **Cost Efficiency**: <$0.25 per DICOM file processing cost
- **Scalability**: Support for 100+ concurrent DICOM processing operations

## Risk Mitigation & Contingencies

### Technical Risks

#### Risk: Cornerstone.js Performance Issues
**Mitigation**: 
- Progressive enhancement approach - basic image viewing without Cornerstone
- Alternative canvas-based image rendering fallback
- Performance monitoring and optimization alerts

#### Risk: AI Analysis Accuracy for Medical Images  
**Mitigation**:
- Confidence scoring and uncertainty indicators
- Manual override capabilities for AI analysis results
- Continuous model improvement with user feedback
- External validation integration (Phase 4)

#### Risk: Large DICOM File Processing
**Mitigation**:
- Chunked file upload implementation
- Progressive image processing (thumbnails first)
- Memory usage monitoring and cleanup
- Configurable timeout and retry mechanisms

### Security Risks

#### Risk: DICOM Metadata Privacy Exposure
**Mitigation**:
- Client-side metadata scrubbing before AI analysis
- Comprehensive encryption of all DICOM components
- Audit logging for all DICOM access operations
- Regular security assessments and penetration testing

#### Risk: Encryption Key Management
**Mitigation**: 
- Multiple key backup strategies
- Key rotation procedures
- Hardware security module integration (future)
- Regular encryption validation testing

### Operational Risks

#### Risk: Medical Professional Workflow Disruption
**Mitigation**:
- Phased rollout with feature flags
- Comprehensive user training and documentation  
- 24/7 support during initial deployment
- Easy fallback to previous workflow if needed

#### Risk: Regulatory Compliance Issues
**Mitigation**:
- HIPAA compliance validation throughout implementation
- Medical device software regulations review
- Legal review of AI-generated medical analysis
- Audit trail implementation for all medical imaging operations

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating medical imaging capabilities into Mediqom's existing document import system. By leveraging the current LangGraph architecture and Universal Node Factory pattern, we can efficiently add DICOM support and AI-driven medical image analysis while maintaining system performance and reliability.

The phased approach ensures minimal disruption to existing workflows while providing powerful new capabilities for medical professionals. The focus on security, performance, and user experience ensures that the implementation will meet the demanding requirements of healthcare environments.

**Next Steps:**
1. Review and approve this implementation plan
2. Allocate development resources for Phase 1
3. Procure sample DICOM files for testing
4. Begin implementation with client-side DICOM processing foundation

---

**Document Version**: 1.0  
**Last Updated**: 2025-08-14  
**Status**: Ready for Implementation  
**Estimated Timeline**: 6 weeks  
**Resource Requirements**: 2-3 developers, medical imaging expertise, sample DICOM datasets