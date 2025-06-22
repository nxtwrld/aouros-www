# AI Document UI Revision Strategy

This document provides a comprehensive analysis of the current document UI structure and proposes revisions to support the new document types and enhanced signal processing described in [AI_IMPORT_README.md](./AI_IMPORT_README.md) and [AI_SIGNALS_IMPORT.md](./AI_SIGNALS_IMPORT.md).

> **Related Documentation**: 
> - [AI_IMPORT_README.md](./AI_IMPORT_README.md) - Document type extensions and processing workflow
> - [AI_SIGNALS_IMPORT.md](./AI_SIGNALS_IMPORT.md) - Enhanced signal processing and visualization

## Current UI Architecture Analysis

### Component Structure Overview

The existing document UI follows a well-designed modular architecture with clear separation of concerns:

```
/src/components/documents/
├── Core Components
│   ├── DocumentView.svelte           # Main orchestrator
│   ├── DocumentHeading.svelte        # Header with title/date/category
│   ├── DocumentTile.svelte           # Grid/list view card
│   ├── DocumentToolbar.svelte        # Basic toolbar functionality
│   └── Index.svelte                  # Document listing container
├── Content Sections
│   ├── SectionSummary.svelte         # Markdown-rendered summary
│   ├── SectionDiagnosis.svelte       # Diagnosis codes and descriptions
│   ├── SectionBody.svelte            # Anatomical body parts with 3D viewer
│   ├── SectionRecommendations.svelte # Urgency-sorted recommendations
│   ├── SectionSignals.svelte         # Vital signs and lab results container
│   ├── SectionText.svelte            # Original vs translated content
│   ├── SectionPerformer.svelte       # Healthcare provider information
│   ├── SectionLinks.svelte           # Related document links
│   └── SectionAttachments.svelte     # Encrypted file attachments
└── Signal Visualization
    ├── Signal.svelte                 # Individual lab result row
    ├── SignalDetail.svelte           # Detailed analysis with tabs
    ├── SignalHistory.svelte          # D3.js trend charts
    ├── SignalInfo.svelte             # Knowledge base information
    └── SignalTips.svelte             # Health recommendations
```

### Current Strengths

#### 1. **Modular Architecture**
- Clean separation of concerns with section-based components
- Consistent props interface across components
- Easy to extend with new section types

#### 2. **Medical Data Integration**
- FHIR-compliant document structure
- Sophisticated signal processing with reference ranges
- Multi-language support for medical terminology

#### 3. **Security Features**
- Multi-layer encryption for attachments
- Document keys for access control
- Secure file handling and decryption

#### 4. **Signal Visualization**
- D3.js-powered trend charts
- Urgency-based color coding (1-5 scale)
- Reference range visualization
- Knowledge base integration

### Current Limitations

#### 1. **Missing DICOM/Medical Imaging Support**
- No specialized DICOM viewer component
- No image annotation or measurement tools
- Basic attachment display only shows thumbnails
- No multi-frame or 3D medical image support

#### 2. **Limited Document Type Specialization**
- Generic section rendering for all document types
- No specialized components for pathology, surgical, or cardiology reports
- Missing waveform displays for ECG/EEG data
- No genomics or molecular data visualization

#### 3. **Signal Processing Limitations**
- Only basic line charts for trends
- No real-time signal streaming components
- Limited to single-value lab results
- No signal correlation or relationship visualization

#### 4. **Attachment System Constraints**
- Simple download-only interface
- No in-browser viewing for medical files
- Limited file type support beyond basic images
- No annotation or markup capabilities

## Proposed UI Architecture Revision

### Enhanced Component Structure

```
/src/components/documents/
├── Core Components (Enhanced)
│   ├── DocumentView.svelte           # Enhanced with dynamic section loading
│   ├── DocumentViewer.svelte         # NEW: Advanced document viewer with tabs
│   ├── DocumentHeading.svelte        # Enhanced with progress indicators
│   ├── DocumentToolbar.svelte        # Enhanced with export/share options
│   └── DocumentWorkflow.svelte       # NEW: Processing workflow visualization
├── Document Type Specialized Components
│   ├── discharge/
│   │   ├── DischargeView.svelte      # Hospital discharge summary
│   │   ├── MedicationReconciliation.svelte
│   │   └── FollowUpPlan.svelte
│   ├── surgical/
│   │   ├── SurgicalView.svelte       # Operative notes
│   │   ├── ProcedureTimeline.svelte
│   │   ├── SurgicalTeam.svelte
│   │   └── ImplantsDevices.svelte
│   ├── pathology/
│   │   ├── PathologyView.svelte      # Tissue analysis reports
│   │   ├── SpecimenViewer.svelte
│   │   ├── MicroscopicViewer.svelte
│   │   └── MolecularFindings.svelte
│   ├── cardiology/
│   │   ├── CardiologyView.svelte     # Cardiac testing reports
│   │   ├── ECGWaveform.svelte
│   │   ├── EchoMeasurements.svelte
│   │   └── CoronaryAnatomy.svelte
│   ├── radiology/
│   │   ├── RadiologyView.svelte      # Advanced imaging reports
│   │   ├── DICOMViewer.svelte        # Cornerstone3D integration
│   │   ├── ImageAnnotations.svelte
│   │   └── RadiologicFindings.svelte
│   ├── emergency/
│   │   ├── EmergencyView.svelte      # ED visit documentation
│   │   ├── TriageAssessment.svelte
│   │   └── EmergencyTreatments.svelte
│   ├── consultation/
│   │   ├── ConsultationView.svelte   # Specialist consultations
│   │   └── RecommendationsPlan.svelte
│   └── progress/
│       ├── ProgressView.svelte       # Follow-up notes
│       └── SOAPNote.svelte
├── Enhanced Signal Components
│   ├── signal-processing/
│   │   ├── SignalProcessor.svelte    # Real-time signal processing
│   │   ├── SignalValidator.svelte    # External validation display
│   │   ├── SignalRelationships.svelte # Signal correlation visualization
│   │   └── DerivedSignals.svelte     # Calculated values display
│   ├── visualization/
│   │   ├── WaveformViewer.svelte     # ECG/EEG waveform display
│   │   ├── SpectralAnalysis.svelte   # Frequency domain analysis
│   │   ├── SignalCorrelation.svelte  # Multi-signal correlation
│   │   └── TrendPrediction.svelte    # Predictive analytics
│   └── time-series/
│       ├── TimeSeriesChart.svelte    # Advanced trend visualization
│       ├── SeasonalPatterns.svelte   # Pattern recognition
│       └── AnomalyDetection.svelte   # Outlier visualization
├── Medical Imaging Components
│   ├── dicom/
│   │   ├── DICOMViewer.svelte        # Cornerstone3D integration
│   │   ├── ImageToolbar.svelte       # Image manipulation tools
│   │   ├── ViewportManager.svelte    # Multi-viewport handling
│   │   ├── ImageAnnotations.svelte   # Measurement and markup tools
│   │   ├── StudyNavigator.svelte     # Series and image navigation
│   │   └── HangingProtocols.svelte   # Display protocol management
│   ├── 3d-rendering/
│   │   ├── Volume3DViewer.svelte     # 3D volume rendering
│   │   ├── MPRViewer.svelte          # Multiplanar reconstruction
│   │   └── SurfaceRenderer.svelte    # Surface rendering
│   └── analysis/
│       ├── ImageMeasurements.svelte  # Quantitative analysis
│       ├── ROIAnalysis.svelte        # Region of interest analysis
│       └── CADIntegration.svelte     # Computer-aided diagnosis
├── Advanced Attachments
│   ├── FileViewer.svelte             # Universal file viewer
│   ├── PDFViewer.svelte              # In-browser PDF viewing
│   ├── VideoPlayer.svelte            # Medical video playback
│   └── AnnotationTools.svelte        # File markup and annotations
└── Workflow Components
    ├── ProcessingProgress.svelte     # Real-time processing visualization
    ├── ValidationStatus.svelte       # External validation indicators
    ├── QualityAssurance.svelte       # Quality metrics display
    └── HumanReview.svelte            # Human-in-the-loop interface
```

## DICOM Viewer Integration with Cornerstone3D

### Cornerstone3D Implementation Strategy

#### 1. **Core DICOM Viewer Component**

```typescript
// src/components/documents/dicom/DICOMViewer.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { init as csInit } from '@cornerstonejs/core';
  import { init as csTools3dInit } from '@cornerstonejs/tools';
  import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
  import dicomParser from 'dicom-parser';

  interface Props {
    studyInstanceUID: string;
    seriesInstanceUID: string;
    imageIds: string[];
    metadata?: DICOMMetadata;
  }

  let { studyInstanceUID, seriesInstanceUID, imageIds, metadata }: Props = $props();

  let viewportElement: HTMLDivElement;
  let renderingEngine: any;
  let viewport: any;

  const viewportId = 'DICOM_VIEWPORT';
  const renderingEngineId = 'DICOM_RENDERING_ENGINE';

  onMount(async () => {
    // Initialize Cornerstone3D
    await csInit();
    await csTools3dInit();
    
    // Configure DICOM Image Loader
    cornerstoneDICOMImageLoader.external.cornerstone = cornerstoneCore;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    
    // Initialize rendering engine
    renderingEngine = new cornerstoneCore.RenderingEngine(renderingEngineId);
    
    // Create viewport
    const viewportInput = {
      viewportId,
      element: viewportElement,
      type: cornerstoneCore.Enums.ViewportType.STACK,
    };
    
    renderingEngine.enableElement(viewportInput);
    viewport = renderingEngine.getViewport(viewportId);
    
    // Load and display images
    await loadAndDisplayImages();
    
    // Setup tools
    setupImageTools();
  });

  async function loadAndDisplayImages() {
    const stack = {
      imageIds: imageIds,
      currentImageIdIndex: 0,
    };
    
    await viewport.setStack(stack);
    viewport.render();
  }

  function setupImageTools() {
    // Add measurement tools
    const { LengthTool, PanTool, ZoomTool, WindowLevelTool } = cornerstoneTools;
    
    cornerstoneTools.addTool(LengthTool);
    cornerstoneTools.addTool(PanTool);
    cornerstoneTools.addTool(ZoomTool);
    cornerstoneTools.addTool(WindowLevelTool);
    
    // Set tool modes
    cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
    cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 });
    cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
    cornerstoneTools.setToolActive('WindowLevel', { mouseButtonMask: 1 });
  }
</script>

<div class="dicom-viewer">
  <div class="dicom-toolbar">
    <ImageToolbar {viewport} {metadata} />
  </div>
  
  <div class="dicom-viewport" bind:this={viewportElement}>
    <!-- Cornerstone3D renders here -->
  </div>
  
  <div class="dicom-navigator">
    <StudyNavigator {studyInstanceUID} {seriesInstanceUID} />
  </div>
</div>

<style>
  .dicom-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #000;
  }
  
  .dicom-viewport {
    flex: 1;
    min-height: 400px;
    position: relative;
  }
  
  .dicom-toolbar,
  .dicom-navigator {
    background: #1a1a1a;
    padding: 0.5rem;
    border: 1px solid #333;
  }
</style>
```

#### 2. **Image Toolbar Component**

```typescript
// src/components/documents/dicom/ImageToolbar.svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  interface Props {
    viewport: any;
    metadata?: DICOMMetadata;
  }
  
  let { viewport, metadata }: Props = $props();
  
  const dispatch = createEventDispatcher();
  
  function resetView() {
    viewport.resetCamera();
    viewport.render();
  }
  
  function toggleInvert() {
    const properties = viewport.getProperties();
    viewport.setProperties({
      ...properties,
      invert: !properties.invert
    });
    viewport.render();
  }
  
  function adjustWindowLevel(window: number, level: number) {
    viewport.setProperties({
      voiRange: { lower: level - window/2, upper: level + window/2 }
    });
    viewport.render();
  }
</script>

<div class="image-toolbar">
  <div class="tool-group">
    <button onclick={resetView} title="Reset View">
      <svg><use href="/icons.svg#reset"></use></svg>
    </button>
    
    <button onclick={toggleInvert} title="Invert Colors">
      <svg><use href="/icons.svg#invert"></use></svg>
    </button>
  </div>
  
  <div class="tool-group">
    <label>Window/Level:</label>
    <button onclick={() => adjustWindowLevel(400, 40)} title="Soft Tissue">
      Soft Tissue
    </button>
    <button onclick={() => adjustWindowLevel(1500, 300)} title="Bone">
      Bone
    </button>
    <button onclick={() => adjustWindowLevel(2000, -500)} title="Lung">
      Lung
    </button>
  </div>
  
  {#if metadata}
  <div class="metadata-info">
    <span>Patient: {metadata.patientName}</span>
    <span>Study Date: {metadata.studyDate}</span>
    <span>Modality: {metadata.modality}</span>
  </div>
  {/if}
</div>

<style>
  .image-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: #2a2a2a;
    color: white;
    font-size: 0.9rem;
  }
  
  .tool-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .tool-group button {
    padding: 0.25rem 0.5rem;
    background: #444;
    color: white;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .tool-group button:hover {
    background: #555;
  }
  
  .metadata-info {
    margin-left: auto;
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: #ccc;
  }
</style>
```

#### 3. **Enhanced Attachment Section for DICOM**

```typescript
// src/components/documents/SectionAttachments.svelte (Enhanced)
<script lang="ts">
  import DICOMViewer from './dicom/DICOMViewer.svelte';
  import PDFViewer from './attachments/PDFViewer.svelte';
  import VideoPlayer from './attachments/VideoPlayer.svelte';
  
  // ... existing props and logic
  
  function getAttachmentComponent(attachment: Attachment) {
    if (attachment.type === 'application/dicom') {
      return DICOMViewer;
    } else if (attachment.type === 'application/pdf') {
      return PDFViewer;
    } else if (attachment.type.startsWith('video/')) {
      return VideoPlayer;
    }
    return null;
  }
  
  function canPreviewInBrowser(attachment: Attachment): boolean {
    return ['application/dicom', 'application/pdf', 'image/', 'video/'].some(
      type => attachment.type.startsWith(type)
    );
  }
</script>

<div class="attachments-enhanced">
  {#each data as attachment}
    <div class="attachment-container">
      {#if canPreviewInBrowser(attachment)}
        <div class="attachment-preview">
          {#if attachment.type === 'application/dicom'}
            <DICOMViewer 
              studyInstanceUID={attachment.studyInstanceUID}
              seriesInstanceUID={attachment.seriesInstanceUID}
              imageIds={attachment.imageIds}
              metadata={attachment.metadata}
            />
          {:else if attachment.type === 'application/pdf'}
            <PDFViewer src={attachment.url} />
          {:else if attachment.type.startsWith('video/')}
            <VideoPlayer src={attachment.url} />
          {:else if attachment.type.startsWith('image/')}
            <img src={attachment.url} alt={attachment.name} />
          {/if}
        </div>
      {:else}
        <div class="attachment-download">
          <button onclick={() => downloadAttachment(attachment)}>
            <div class="file-icon">
              <svg><use href="/icons.svg#file"></use></svg>
            </div>
            <div class="file-info">
              <h4>{attachment.name}</h4>
              <p>{attachment.type} • {formatFileSize(attachment.size)}</p>
            </div>
          </button>
        </div>
      {/if}
    </div>
  {/each}
</div>
```

## Enhanced Signal Visualization Components

### Advanced Signal Processing UI

#### 1. **Real-time Signal Processing Display**

```typescript
// src/components/documents/signal-processing/SignalProcessor.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { EnhancedSignal, SignalValidation } from '$lib/types';
  
  interface Props {
    signals: EnhancedSignal[];
    processingStatus: 'pending' | 'processing' | 'completed' | 'error';
    validationResults?: Map<string, SignalValidation>;
  }
  
  let { signals, processingStatus, validationResults }: Props = $props();
  
  onMount(() => {
    // Connect to SSE for real-time updates
    const eventSource = new EventSource('/v1/signals/stream');
    
    eventSource.addEventListener('signal_validated', (event) => {
      const data = JSON.parse(event.data);
      updateSignalValidation(data.signal, data.validation);
    });
    
    eventSource.addEventListener('signal_relationship', (event) => {
      const data = JSON.parse(event.data);
      updateSignalRelationships(data.relationships);
    });
  });
</script>

<div class="signal-processor">
  <div class="processing-header">
    <h3>Signal Processing Status</h3>
    <div class="status-indicator status-{processingStatus}">
      {processingStatus}
    </div>
  </div>
  
  <div class="signal-grid">
    {#each signals as signal}
      <div class="signal-card">
        <div class="signal-header">
          <h4>{signal.signal}</h4>
          <div class="confidence-score">
            {Math.round(signal.validation?.confidence * 100)}% confidence
          </div>
        </div>
        
        <div class="signal-value">
          <span class="value">{signal.value}</span>
          <span class="unit">{signal.unit}</span>
        </div>
        
        <div class="validation-status">
          {#if signal.validation}
            <div class="validation-{signal.validation.status}">
              {signal.validation.status}
            </div>
            {#if signal.validation.warnings?.length > 0}
              <div class="warnings">
                {#each signal.validation.warnings as warning}
                  <span class="warning">{warning}</span>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
        
        {#if signal.relationships?.length > 0}
          <div class="relationships">
            <h5>Related Signals</h5>
            {#each signal.relationships as rel}
              <div class="relationship">
                <span class="target">{rel.targetSignal}</span>
                <span class="type">{rel.type}</span>
                <span class="strength">{Math.round(rel.strength * 100)}%</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
```

#### 2. **Waveform Viewer for ECG/EEG Data**

```typescript
// src/components/documents/visualization/WaveformViewer.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  
  interface Props {
    waveformData: WaveformSignal[];
    samplingRate: number;
    duration: number;
    annotations?: ECGAnnotation[];
  }
  
  let { waveformData, samplingRate, duration, annotations }: Props = $props();
  
  let svgElement: SVGElement;
  let containerWidth = 800;
  let containerHeight = 400;
  
  onMount(() => {
    renderWaveform();
  });
  
  function renderWaveform() {
    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();
    
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    const xScale = d3.scaleLinear()
      .domain([0, duration])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(waveformData, d => d.amplitude))
      .range([height, 0]);
    
    const line = d3.line<WaveformSignal>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.amplitude))
      .curve(d3.curveLinear);
    
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add grid
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
      );
    
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat("")
      );
    
    // Add waveform
    g.append("path")
      .datum(waveformData)
      .attr("class", "waveform")
      .attr("d", line);
    
    // Add annotations (e.g., QRS complexes, P waves)
    if (annotations) {
      annotations.forEach(annotation => {
        g.append("circle")
          .attr("cx", xScale(annotation.time))
          .attr("cy", yScale(annotation.amplitude))
          .attr("r", 3)
          .attr("class", `annotation annotation-${annotation.type}`);
        
        g.append("text")
          .attr("x", xScale(annotation.time))
          .attr("y", yScale(annotation.amplitude) - 10)
          .attr("text-anchor", "middle")
          .attr("class", "annotation-label")
          .text(annotation.label);
      });
    }
    
    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    g.append("g")
      .call(d3.axisLeft(yScale));
  }
</script>

<div class="waveform-viewer">
  <div class="waveform-controls">
    <button onclick={() => zoomIn()}>Zoom In</button>
    <button onclick={() => zoomOut()}>Zoom Out</button>
    <button onclick={() => resetZoom()}>Reset</button>
    
    <div class="measurements">
      <span>Heart Rate: {calculateHeartRate()} BPM</span>
      <span>QRS Duration: {calculateQRSDuration()} ms</span>
    </div>
  </div>
  
  <div class="waveform-container" bind:clientWidth={containerWidth}>
    <svg bind:this={svgElement} width={containerWidth} height={containerHeight}></svg>
  </div>
</div>

<style>
  .waveform-viewer {
    background: #000;
    color: #0f0;
    padding: 1rem;
    border-radius: 8px;
  }
  
  .waveform-container :global(.waveform) {
    fill: none;
    stroke: #0f0;
    stroke-width: 1.5px;
  }
  
  .waveform-container :global(.grid line) {
    stroke: #333;
    stroke-width: 0.5px;
  }
  
  .waveform-container :global(.annotation) {
    fill: #ff0;
  }
  
  .waveform-container :global(.annotation-label) {
    fill: #ff0;
    font-size: 10px;
  }
</style>
```

#### 3. **Signal Correlation Matrix**

```typescript
// src/components/documents/visualization/SignalCorrelation.svelte
<script lang="ts">
  import * as d3 from 'd3';
  import type { SignalRelationship } from '$lib/types';
  
  interface Props {
    signals: string[];
    correlationMatrix: number[][];
    relationships: SignalRelationship[];
  }
  
  let { signals, correlationMatrix, relationships }: Props = $props();
  
  let svgElement: SVGElement;
  
  onMount(() => {
    renderCorrelationMatrix();
  });
  
  function renderCorrelationMatrix() {
    const svg = d3.select(svgElement);
    const size = 300;
    const cellSize = size / signals.length;
    
    const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
      .domain([-1, 1]);
    
    const g = svg.append("g");
    
    // Create correlation heatmap
    for (let i = 0; i < signals.length; i++) {
      for (let j = 0; j < signals.length; j++) {
        const correlation = correlationMatrix[i][j];
        
        g.append("rect")
          .attr("x", j * cellSize)
          .attr("y", i * cellSize)
          .attr("width", cellSize)
          .attr("height", cellSize)
          .attr("fill", colorScale(correlation))
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
        
        g.append("text")
          .attr("x", j * cellSize + cellSize / 2)
          .attr("y", i * cellSize + cellSize / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", Math.abs(correlation) > 0.5 ? "#fff" : "#000")
          .style("font-size", "10px")
          .text(correlation.toFixed(2));
      }
    }
    
    // Add signal labels
    g.selectAll(".row-label")
      .data(signals)
      .enter()
      .append("text")
      .attr("class", "row-label")
      .attr("x", -5)
      .attr("y", (d, i) => i * cellSize + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .text(d => d);
    
    g.selectAll(".col-label")
      .data(signals)
      .enter()
      .append("text")
      .attr("class", "col-label")
      .attr("x", (d, i) => i * cellSize + cellSize / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "text-top")
      .style("font-size", "12px")
      .attr("transform", (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -5)`)
      .text(d => d);
  }
</script>

<div class="correlation-analysis">
  <h4>Signal Correlations</h4>
  <div class="correlation-matrix">
    <svg bind:this={svgElement} width="350" height="350"></svg>
  </div>
  
  <div class="relationship-list">
    <h5>Detected Relationships</h5>
    {#each relationships as rel}
      <div class="relationship-item relationship-{rel.type}">
        <span class="signals">{rel.targetSignal}</span>
        <span class="type">{rel.type.replace('_', ' ')}</span>
        <span class="strength">{Math.round(rel.strength * 100)}%</span>
        {#if rel.formula}
          <span class="formula">{rel.formula}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>
```

## Document Type-Specific UI Components

### 1. **Surgical Report Component**

```typescript
// src/components/documents/surgical/SurgicalView.svelte
<script lang="ts">
  import type { SurgicalSchema } from '$lib/types';
  
  interface Props {
    data: SurgicalSchema;
  }
  
  let { data }: Props = $props();
</script>

<div class="surgical-report">
  <div class="procedure-overview">
    <h3>{data.procedure.name}</h3>
    <div class="procedure-details">
      <span>CPT Code: {data.procedure.cptCode}</span>
      <span>Duration: {data.procedure.duration} minutes</span>
      <span>Technique: {data.procedure.technique}</span>
    </div>
  </div>
  
  <div class="diagnoses">
    <div class="diagnosis-section">
      <h4>Pre-operative Diagnosis</h4>
      {#each data.preOperativeDiagnosis as diagnosis}
        <div class="diagnosis">{diagnosis.description} ({diagnosis.code})</div>
      {/each}
    </div>
    
    <div class="diagnosis-section">
      <h4>Post-operative Diagnosis</h4>
      {#each data.postOperativeDiagnosis as diagnosis}
        <div class="diagnosis">{diagnosis.description} ({diagnosis.code})</div>
      {/each}
    </div>
  </div>
  
  <div class="surgical-team">
    <h4>Surgical Team</h4>
    <div class="team-grid">
      {#each data.surgicalTeam as member}
        <div class="team-member">
          <div class="role">{member.role}</div>
          <div class="name">{member.name}</div>
          <div class="credentials">{member.credentials}</div>
        </div>
      {/each}
    </div>
  </div>
  
  <div class="anesthesia-info">
    <h4>Anesthesia</h4>
    <div class="anesthesia-details">
      <span>Type: {data.anesthesia.type}</span>
      <span>Duration: {data.anesthesia.duration} minutes</span>
      <span>Provider: {data.anesthesia.provider.name}</span>
    </div>
  </div>
  
  <div class="operative-findings">
    <h4>Operative Findings</h4>
    <div class="findings-text">{data.findings}</div>
  </div>
  
  {#if data.complications?.length > 0}
    <div class="complications">
      <h4>Complications</h4>
      {#each data.complications as complication}
        <div class="complication">{complication}</div>
      {/each}
    </div>
  {/if}
  
  <div class="blood-loss">
    <h4>Estimated Blood Loss</h4>
    <span class="blood-loss-value">{data.estimatedBloodLoss} mL</span>
  </div>
  
  {#if data.implants?.length > 0}
    <div class="implants">
      <h4>Implants & Devices</h4>
      {#each data.implants as implant}
        <div class="implant">
          <span class="name">{implant.name}</span>
          <span class="manufacturer">{implant.manufacturer}</span>
          <span class="model">{implant.model}</span>
          <span class="serial">{implant.serialNumber}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

### 2. **Pathology Report Component**

```typescript
// src/components/documents/pathology/PathologyView.svelte
<script lang="ts">
  import type { PathologySchema } from '$lib/types';
  
  interface Props {
    data: PathologySchema;
  }
  
  let { data }: Props = $props();
</script>

<div class="pathology-report">
  <div class="specimen-info">
    <h3>Specimen Information</h3>
    <div class="specimen-details">
      <div class="detail">
        <label>Type:</label>
        <span>{data.specimen.type}</span>
      </div>
      <div class="detail">
        <label>Collection Date:</label>
        <span>{data.specimen.collectionDate}</span>
      </div>
      <div class="detail">
        <label>Collection Method:</label>
        <span>{data.specimen.collectionMethod}</span>
      </div>
    </div>
  </div>
  
  <div class="gross-description">
    <h4>Gross Description</h4>
    <div class="description-text">{data.grossDescription}</div>
  </div>
  
  <div class="microscopic-description">
    <h4>Microscopic Description</h4>
    <div class="description-text">{data.microscopicDescription}</div>
  </div>
  
  {#if data.specialStains?.length > 0}
    <div class="special-stains">
      <h4>Special Stains & Immunohistochemistry</h4>
      <div class="stains-grid">
        {#each data.specialStains as stain}
          <div class="stain">
            <div class="stain-name">{stain.name}</div>
            <div class="stain-result">{stain.result}</div>
            <div class="stain-interpretation">{stain.interpretation}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <div class="diagnosis">
    <h4>Diagnosis</h4>
    <div class="primary-diagnosis">
      <strong>Primary:</strong> {data.diagnosis.primary}
    </div>
    {#if data.diagnosis.secondary?.length > 0}
      <div class="secondary-diagnoses">
        <strong>Secondary:</strong>
        <ul>
          {#each data.diagnosis.secondary as secondary}
            <li>{secondary}</li>
          {/each}
        </ul>
      </div>
    {/if}
    
    {#if data.diagnosis.staging}
      <div class="staging">
        <h5>Cancer Staging</h5>
        <div class="staging-details">
          <span>T: {data.diagnosis.staging.T}</span>
          <span>N: {data.diagnosis.staging.N}</span>
          <span>M: {data.diagnosis.staging.M}</span>
          <span>Grade: {data.diagnosis.staging.grade}</span>
          <span>Stage: {data.diagnosis.staging.overallStage}</span>
        </div>
      </div>
    {/if}
  </div>
  
  {#if data.molecularFindings?.length > 0}
    <div class="molecular-findings">
      <h4>Molecular/Genetic Findings</h4>
      {#each data.molecularFindings as finding}
        <div class="molecular-test">
          <div class="test-name">{finding.testName}</div>
          <div class="test-result">{finding.result}</div>
          <div class="test-interpretation">{finding.interpretation}</div>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if data.synopticReport}
    <div class="synoptic-report">
      <h4>Synoptic Report</h4>
      <div class="synoptic-data">
        {#each Object.entries(data.synopticReport) as [key, value]}
          <div class="synoptic-item">
            <label>{key}:</label>
            <span>{value}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
```

## Implementation Strategy

### Phase 1: Foundation Enhancement (Weeks 1-3)
- [ ] **Component Architecture Revision**
  - Implement dynamic section loading in DocumentView
  - Create base classes for document type components
  - Enhance DocumentToolbar with export/share functionality

- [ ] **DICOM Viewer Integration**
  - Install and configure Cornerstone3D
  - Implement core DICOMViewer component
  - Create ImageToolbar with basic tools
  - Add DICOM metadata display

### Phase 2: Signal Processing UI (Weeks 4-6)
- [ ] **Enhanced Signal Components**
  - Implement real-time SignalProcessor component
  - Create WaveformViewer for ECG/EEG data
  - Add SignalCorrelation visualization
  - Implement advanced time series analysis

- [ ] **External Validation UI**
  - Create validation status indicators
  - Add confidence scoring displays
  - Implement warning and error handling
  - Add human review interface

### Phase 3: Document Type Specialization (Weeks 7-10)
- [ ] **Surgical Report Components**
  - Implement SurgicalView with procedure timeline
  - Add surgical team visualization
  - Create implants and devices tracking

- [ ] **Pathology Report Components**
  - Implement PathologyView with specimen tracking
  - Add special stains visualization
  - Create cancer staging display
  - Add molecular findings section

- [ ] **Cardiology Components**
  - Implement ECG waveform display
  - Add echocardiogram measurements
  - Create coronary anatomy visualization

### Phase 4: Advanced Features (Weeks 11-12)
- [ ] **3D Medical Imaging**
  - Implement volume rendering capabilities
  - Add multiplanar reconstruction (MPR)
  - Create surface rendering for 3D models

- [ ] **Workflow Integration**
  - Add processing progress visualization
  - Implement quality assurance metrics
  - Create human-in-the-loop interfaces

## Benefits of Enhanced UI Architecture

### 1. **Comprehensive Medical Data Support**
- Full support for all proposed document types
- Specialized visualization for each medical specialty
- Advanced signal processing and analysis

### 2. **Professional Medical Imaging**
- Industry-standard DICOM viewing with Cornerstone3D
- Advanced image manipulation and measurement tools
- Multi-viewport and hanging protocol support

### 3. **Enhanced User Experience**
- Real-time processing feedback
- Interactive data exploration
- Mobile-responsive design for all components

### 4. **Clinical Decision Support**
- Signal correlation and relationship visualization
- External validation and confidence scoring
- Trend analysis and predictive analytics

### 5. **Extensible Architecture**
- Plugin-based system for new document types
- Modular component design for easy maintenance
- Consistent theming and accessibility support

## Migration Strategy

### 1. **Backward Compatibility**
- Existing components remain functional during transition
- Gradual migration path for each document type
- Fallback to basic display for unsupported features

### 2. **Progressive Enhancement**
- Basic functionality works without advanced features
- Enhanced features load progressively
- Graceful degradation for older browsers

### 3. **Testing Strategy**
- Component-level testing for all new UI elements
- Integration testing with real medical data
- Accessibility testing for compliance with healthcare standards

This comprehensive UI revision positions Mediqom as a state-of-the-art medical documentation platform with professional-grade visualization capabilities while maintaining the modularity and security of the existing architecture.

## Cross-References & Integration Points

### Related Documentation
- **[AI_IMPORT_README.md](./AI_IMPORT_README.md)**: Document processing workflow and type extensions
- **[AI_SIGNALS_IMPORT.md](./AI_SIGNALS_IMPORT.md)**: Enhanced signal processing and validation

### Key Integration Areas

#### 1. **Workflow Visualization**
- Real-time processing progress display
- Integration with LangGraph workflow steps
- SSE streaming for live updates

#### 2. **Signal Processing UI**
- Enhanced signal visualization components
- Real-time validation status display
- Dynamic signal discovery interface

#### 3. **Document Type Rendering**
- Specialized components for each new document type
- Consistent theming and navigation
- Shared utility functions and data processing

#### 4. **External Validation Display**
- MCP validation results visualization
- Confidence scoring and warning systems
- External database integration status