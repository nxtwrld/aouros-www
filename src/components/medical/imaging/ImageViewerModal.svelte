<!-- Image Viewer Modal Component -->
<!-- Modal wrapper for DICOM and medical image viewing with overlay controls -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DicomViewer from './DicomViewer.svelte';
  import { FEATURE_FLAGS } from '$lib/utils/feature-flags';
  
  export let isOpen: boolean = false;
  export let imageData: ArrayBuffer | null = null;
  export let imageUrl: string = '';
  export let imageType: 'dicom' | 'standard' = 'dicom';
  export let studyInfo: any = {};
  export let metadata: any = {};
  export let title: string = 'Medical Image Viewer';
  
  const dispatch = createEventDispatcher();
  
  let modalElement: HTMLElement;
  let standardImageElement: HTMLImageElement;
  let imageLoaded = false;
  let loading = false;
  let error: string | null = null;
  
  function closeModal() {
    isOpen = false;
    dispatch('close');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === modalElement) {
      closeModal();
    }
  }
  
  function handleImageLoaded(event: CustomEvent) {
    imageLoaded = true;
    dispatch('imageLoaded', event.detail);
  }
  
  function handleImageError(event: Event) {
    error = 'Failed to load image';
    loading = false;
  }
  
  function handleStandardImageLoad() {
    imageLoaded = true;
    loading = false;
    dispatch('imageLoaded', {
      width: standardImageElement.naturalWidth,
      height: standardImageElement.naturalHeight,
      type: 'standard'
    });
  }
  
  function handleExport(event: CustomEvent) {
    dispatch('export', event.detail);
  }
  
  function downloadImage() {
    if (imageType === 'standard' && imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `medical-image-${Date.now()}.jpg`;
      link.click();
    }
  }
  
  function printImage() {
    if (imageType === 'standard' && standardImageElement) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Medical Image</title>
              <style>
                body { margin: 0; padding: 20px; text-align: center; }
                img { max-width: 100%; height: auto; }
                .header { margin-bottom: 20px; font-family: Arial, sans-serif; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>${title}</h2>
                ${studyInfo.patientName ? `<p>Patient: ${studyInfo.patientName}</p>` : ''}
                ${studyInfo.studyDate ? `<p>Date: ${studyInfo.studyDate}</p>` : ''}
                ${studyInfo.modality ? `<p>Modality: ${studyInfo.modality}</p>` : ''}
              </div>
              <img src="${imageUrl}" alt="Medical Image" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }
  
  $: if (isOpen) {
    loading = imageType === 'standard' && imageUrl;
    error = null;
    imageLoaded = false;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div 
    class="fixed inset-0 z-50 overflow-y-auto"
    bind:this={modalElement}
    on:click={handleBackdropClick}
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-75 transition-opacity"></div>
    
    <!-- Modal -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
            <div class="flex items-center space-x-4 mt-1">
              {#if studyInfo.modality}
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {studyInfo.modality}
                </span>
              {/if}
              {#if studyInfo.studyDate}
                <span class="text-xs text-gray-500">Date: {studyInfo.studyDate}</span>
              {/if}
              {#if studyInfo.patientName}
                <span class="text-xs text-gray-500">Patient: {studyInfo.patientName}</span>
              {/if}
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            {#if imageType === 'standard'}
              <button
                class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                on:click={downloadImage}
                title="Download Image"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                on:click={printImage}
                title="Print Image"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
            {/if}
            <button
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              on:click={closeModal}
              title="Close"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 overflow-hidden">
          {#if imageType === 'dicom'}
            <DicomViewer
              {imageData}
              dicomUrl={imageUrl}
              {metadata}
              {studyInfo}
              width={800}
              height={600}
              on:imageLoaded={handleImageLoaded}
              on:export={handleExport}
            />
          {:else if imageType === 'standard'}
            <div class="h-full flex items-center justify-center bg-gray-50">
              {#if loading}
                <div class="text-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p class="mt-2 text-sm text-gray-500">Loading image...</p>
                </div>
              {:else if error}
                <div class="text-center text-red-600">
                  <svg class="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p class="text-sm">{error}</p>
                </div>
              {:else}
                <img
                  bind:this={standardImageElement}
                  src={imageUrl}
                  alt="Medical Image"
                  class="max-w-full max-h-full object-contain"
                  on:load={handleStandardImageLoad}
                  on:error={handleImageError}
                />
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Footer -->
        {#if imageLoaded && metadata && Object.keys(metadata).length > 0}
          <div class="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <h4 class="text-sm font-medium text-gray-900 mb-2">Image Information</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
              {#each Object.entries(metadata) as [key, value]}
                <div>
                  <span class="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span class="ml-1">{value}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure modal appears above other content */
  .fixed {
    position: fixed;
  }
</style>