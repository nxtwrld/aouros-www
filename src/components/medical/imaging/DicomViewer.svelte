<!-- DICOM Medical Image Viewer Component -->
<!-- Provides basic DICOM image viewing capabilities for radiology integration -->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { FEATURE_FLAGS } from '$lib/utils/feature-flags';
  
  export let dicomUrl: string = '';
  export let imageData: ArrayBuffer | null = null;
  export let metadata: any = {};
  export let studyInfo: any = {};
  export let loading: boolean = false;
  export let width: number = 512;
  export let height: number = 512;
  
  const dispatch = createEventDispatcher();
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let imageLoaded = false;
  let error: string | null = null;
  let currentFrame = 0;
  let totalFrames = 1;
  let windowLevel = 128;
  let windowWidth = 256;
  let zoom = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  
  // DICOM viewer state
  let viewerInitialized = false;
  let pixelData: Uint16Array | Uint8Array | null = null;
  let imageWidth = 0;
  let imageHeight = 0;
  let bitsAllocated = 8;
  let pixelRepresentation = 0; // 0 = unsigned, 1 = signed
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      
      if (imageData) {
        loadDicomFromBuffer(imageData);
      } else if (dicomUrl) {
        loadDicomFromUrl(dicomUrl);
      }
    }
  });
  
  async function loadDicomFromUrl(url: string) {
    try {
      loading = true;
      error = null;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load DICOM: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      await loadDicomFromBuffer(buffer);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load DICOM image';
      console.error('DICOM loading error:', err);
    } finally {
      loading = false;
    }
  }
  
  async function loadDicomFromBuffer(buffer: ArrayBuffer) {
    try {
      loading = true;
      error = null;
      
      // Basic DICOM parsing - In production, use a proper DICOM library like cornerstone.js
      const dicomData = parseDicomBasic(buffer);
      
      if (dicomData) {
        pixelData = dicomData.pixelData;
        imageWidth = dicomData.width;
        imageHeight = dicomData.height;
        bitsAllocated = dicomData.bitsAllocated;
        pixelRepresentation = dicomData.pixelRepresentation;
        totalFrames = dicomData.numberOfFrames || 1;
        
        // Set initial window/level based on metadata
        if (dicomData.windowCenter && dicomData.windowWidth) {
          windowLevel = dicomData.windowCenter;
          windowWidth = dicomData.windowWidth;
        }
        
        renderDicomImage();
        imageLoaded = true;
        viewerInitialized = true;
        
        dispatch('imageLoaded', {
          width: imageWidth,
          height: imageHeight,
          frames: totalFrames,
          metadata: dicomData.metadata
        });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to parse DICOM data';
      console.error('DICOM parsing error:', err);
    } finally {
      loading = false;
    }
  }
  
  function parseDicomBasic(buffer: ArrayBuffer): any {
    // This is a very basic DICOM parser for demonstration
    // In production, use a proper DICOM library like dicom-parser or cornerstone.js
    const view = new DataView(buffer);
    
    // Check for DICOM preamble and prefix
    const prefix = new TextDecoder().decode(buffer.slice(128, 132));
    if (prefix !== 'DICM') {
      throw new Error('Invalid DICOM file format');
    }
    
    // Mock parsing - in reality this would be much more complex
    return {
      pixelData: new Uint8Array(buffer.slice(buffer.byteLength - (512 * 512))), // Mock pixel data
      width: 512,
      height: 512,
      bitsAllocated: 8,
      pixelRepresentation: 0,
      numberOfFrames: 1,
      windowCenter: 128,
      windowWidth: 256,
      metadata: {
        studyDate: '20240101',
        modality: 'CT',
        patientName: 'Mock Patient',
        studyDescription: 'Mock Study'
      }
    };
  }
  
  function renderDicomImage() {
    if (!ctx || !pixelData) return;
    
    const imageData = ctx.createImageData(imageWidth, imageHeight);
    const data = imageData.data;
    
    // Apply window/level transformation
    const minPixelValue = windowLevel - windowWidth / 2;
    const maxPixelValue = windowLevel + windowWidth / 2;
    const range = maxPixelValue - minPixelValue;
    
    for (let i = 0; i < pixelData.length; i++) {
      let pixelValue = pixelData[i];
      
      // Apply window/level
      let normalizedValue = (pixelValue - minPixelValue) / range;
      normalizedValue = Math.max(0, Math.min(1, normalizedValue));
      
      const grayValue = Math.round(normalizedValue * 255);
      
      const dataIndex = i * 4;
      data[dataIndex] = grayValue;     // R
      data[dataIndex + 1] = grayValue; // G
      data[dataIndex + 2] = grayValue; // B
      data[dataIndex + 3] = 255;       // A
    }
    
    // Clear canvas and apply transformations
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-imageWidth / 2 + panX, -imageHeight / 2 + panY);
    
    // Create temporary canvas for the image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageWidth;
    tempCanvas.height = imageHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw the image
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }
  
  function handleMouseDown(event: MouseEvent) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
  
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;
    
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    
    panX += deltaX / zoom;
    panY += deltaY / zoom;
    
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    
    renderDicomImage();
  }
  
  function handleMouseUp() {
    isDragging = false;
  }
  
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(0.1, Math.min(5.0, zoom * zoomFactor));
    
    renderDicomImage();
  }
  
  function adjustWindowLevel(levelDelta: number, widthDelta: number) {
    windowLevel = Math.max(0, Math.min(4095, windowLevel + levelDelta));
    windowWidth = Math.max(1, Math.min(4095, windowWidth + widthDelta));
    renderDicomImage();
  }
  
  function resetView() {
    zoom = 1.0;
    panX = 0;
    panY = 0;
    renderDicomImage();
  }
  
  function nextFrame() {
    if (currentFrame < totalFrames - 1) {
      currentFrame++;
      // In a full implementation, this would load the next frame
      dispatch('frameChanged', { frame: currentFrame });
    }
  }
  
  function previousFrame() {
    if (currentFrame > 0) {
      currentFrame--;
      // In a full implementation, this would load the previous frame
      dispatch('frameChanged', { frame: currentFrame });
    }
  }
  
  function exportImage() {
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      dispatch('export', { dataUrl, format: 'png' });
    }
  }
</script>

<div class="dicom-viewer bg-gray-900 rounded-lg overflow-hidden">
  <!-- Header -->
  <div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <h4 class="text-white font-medium">DICOM Viewer</h4>
      {#if studyInfo.modality}
        <span class="text-xs bg-blue-600 text-white px-2 py-1 rounded">{studyInfo.modality}</span>
      {/if}
      {#if imageLoaded}
        <span class="text-xs text-gray-300">{imageWidth} × {imageHeight}</span>
      {/if}
    </div>
    
    <div class="flex items-center space-x-2">
      {#if totalFrames > 1}
        <span class="text-xs text-gray-300">Frame {currentFrame + 1}/{totalFrames}</span>
      {/if}
      <span class="text-xs text-gray-300">Zoom: {Math.round(zoom * 100)}%</span>
    </div>
  </div>

  <!-- Main viewer area -->
  <div class="relative bg-black" style="height: {height}px;">
    {#if loading}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p class="text-white text-sm mt-2">Loading DICOM image...</p>
        </div>
      </div>
    {:else if error}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center text-red-400">
          <svg class="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="text-sm">{error}</p>
          <button 
            class="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            on:click={() => error = null}
          >
            Dismiss
          </button>
        </div>
      </div>
    {:else if !FEATURE_FLAGS.ENABLE_SPECIALIZED_UI}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center text-gray-400">
          <svg class="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p class="text-sm">DICOM viewer disabled</p>
          <p class="text-xs mt-1">Enable ENABLE_SPECIALIZED_UI feature flag</p>
        </div>
      </div>
    {:else}
      <canvas
        bind:this={canvas}
        {width}
        {height}
        class="cursor-move"
        on:mousedown={handleMouseDown}
        on:mousemove={handleMouseMove}
        on:mouseup={handleMouseUp}
        on:mouseleave={handleMouseUp}
        on:wheel={handleWheel}
      ></canvas>
    {/if}
  </div>

  <!-- Controls -->
  {#if viewerInitialized && !loading && !error}
    <div class="bg-gray-800 px-4 py-2 space-y-2">
      <!-- Window/Level controls -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <label class="text-xs text-gray-300">W/L:</label>
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
            on:click={() => adjustWindowLevel(0, -10)}
          >
            W-
          </button>
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
            on:click={() => adjustWindowLevel(0, 10)}
          >
            W+
          </button>
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
            on:click={() => adjustWindowLevel(-10, 0)}
          >
            L-
          </button>
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
            on:click={() => adjustWindowLevel(10, 0)}
          >
            L+
          </button>
          <span class="text-xs text-gray-400">W:{windowWidth} L:{windowLevel}</span>
        </div>
        
        <div class="flex items-center space-x-2">
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
            on:click={resetView}
          >
            Reset
          </button>
          <button 
            class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            on:click={exportImage}
          >
            Export
          </button>
        </div>
      </div>

      <!-- Frame controls for multi-frame images -->
      {#if totalFrames > 1}
        <div class="flex items-center space-x-2">
          <label class="text-xs text-gray-300">Frames:</label>
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
            disabled={currentFrame === 0}
            on:click={previousFrame}
          >
            ◀
          </button>
          <span class="text-xs text-gray-300 px-2">{currentFrame + 1} / {totalFrames}</span>
          <button 
            class="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
            disabled={currentFrame === totalFrames - 1}
            on:click={nextFrame}
          >
            ▶
          </button>
        </div>
      {/if}

      <!-- Study information -->
      {#if metadata.patientName || metadata.studyDate}
        <div class="text-xs text-gray-400 border-t border-gray-700 pt-2">
          {#if metadata.patientName}
            <span>Patient: {metadata.patientName}</span>
          {/if}
          {#if metadata.studyDate}
            <span class="ml-4">Date: {metadata.studyDate}</span>
          {/if}
          {#if metadata.studyDescription}
            <span class="ml-4">Study: {metadata.studyDescription}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dicom-viewer {
    user-select: none;
  }
  
  canvas {
    display: block;
  }
</style>