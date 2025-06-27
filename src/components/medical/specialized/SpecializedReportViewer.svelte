<!-- Specialized Report Viewer Router Component -->
<!-- Dynamically renders the appropriate specialized viewer based on document type -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SurgicalReportViewer from './SurgicalReportViewer.svelte';
  import PathologyReportViewer from './PathologyReportViewer.svelte';
  import CardiologyReportViewer from './CardiologyReportViewer.svelte';
  import RadiologyReportViewer from './RadiologyReportViewer.svelte';
  import { FEATURE_FLAGS } from '$lib/utils/feature-flags';
  
  export let data: any = {};
  export let documentType: string | null = null;
  export let confidence: number = 0;
  export let loading: boolean = false;
  export let showFallback: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  // Determine which specialized viewer to show
  $: selectedViewer = getViewerComponent(documentType, data);
  $: hasEnhancedData = data?.enhancedFields || data?.documentType;
  $: isSpecializedViewEnabled = FEATURE_FLAGS.ENABLE_SPECIALIZED_UI;
  
  function getViewerComponent(docType: string | null, reportData: any) {
    // Check if specialized UI is enabled
    if (!isSpecializedViewEnabled) {
      return null;
    }
    
    // First try to use the detected document type
    if (docType) {
      switch (docType.toLowerCase()) {
        case 'surgical':
          return SurgicalReportViewer;
        case 'pathology':
          return PathologyReportViewer;
        case 'cardiology':
          return CardiologyReportViewer;
        case 'radiology':
          return RadiologyReportViewer;
        // Add more viewers as they're implemented
        case 'oncology':
          return null; // Will fall back to standard viewer
        default:
          return null;
      }
    }
    
    // Fallback: try to detect from enhanced data
    if (reportData?.documentType) {
      return getViewerComponent(reportData.documentType, reportData);
    }
    
    return null;
  }
  
  function handleViewerEvent(event: CustomEvent) {
    // Forward events from specialized viewers
    dispatch(event.type, event.detail);
  }
  
  function handleFallbackView() {
    dispatch('useFallback', { documentType, data });
  }
</script>

<div class="specialized-report-viewer">
  {#if loading}
    <!-- Loading state for all viewers -->
    <div class="bg-white rounded-lg shadow-sm border px-6 py-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">
        {#if documentType}
          Analyzing {documentType} report with specialized extraction...
        {:else}
          Detecting document type and analyzing content...
        {/if}
      </p>
    </div>
  {:else if selectedViewer}
    <!-- Render the appropriate specialized viewer -->
    <svelte:component 
      this={selectedViewer} 
      {data} 
      {confidence} 
      {loading}
      on:export={handleViewerEvent}
      on:viewDetails={handleViewerEvent}
    />
  {:else if showFallback}
    <!-- Fallback UI for unsupported document types or when specialized UI is disabled -->
    <div class="bg-white rounded-lg shadow-sm border">
      <!-- Header -->
      <div class="border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Medical Report Analysis</h3>
            <p class="text-sm text-gray-500">
              {#if documentType && !isSpecializedViewEnabled}
                {documentType.charAt(0).toUpperCase() + documentType.slice(1)} report (specialized view disabled)
              {:else if documentType}
                {documentType.charAt(0).toUpperCase() + documentType.slice(1)} report (specialized view coming soon)
              {:else}
                Standard medical report analysis
              {/if}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            {#if confidence > 0}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Math.round(confidence * 100)}% confidence
              </span>
            {/if}
            {#if documentType}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                {documentType} Report
              </span>
            {/if}
            {#if !isSpecializedViewEnabled}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Standard View
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4">
        {#if !isSpecializedViewEnabled}
          <!-- Feature disabled message -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-yellow-800">Specialized UI Disabled</h4>
                <p class="text-sm text-yellow-700 mt-1">
                  Enhanced document-specific visualization is currently disabled. Enable ENABLE_SPECIALIZED_UI feature flag to see specialized {documentType || 'medical'} report views.
                </p>
              </div>
            </div>
          </div>
        {:else if documentType}
          <!-- Coming soon message for unimplemented viewers -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-blue-800">Specialized Viewer Coming Soon</h4>
                <p class="text-sm text-blue-700 mt-1">
                  A specialized viewer for {documentType} reports is being developed. For now, you can view the analysis results below.
                </p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Enhanced data display when available -->
        {#if hasEnhancedData}
          <div class="space-y-4">
            {#if data.documentType}
              <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-sm font-medium text-gray-900">Detected Document Type:</span>
                <span class="text-sm text-gray-700 ml-2 capitalize">{data.documentType}</span>
              </div>
            {/if}
            
            {#if data.schemaUsed}
              <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-sm font-medium text-gray-900">Processing Schema:</span>
                <span class="text-sm text-gray-700 ml-2">{data.schemaUsed}</span>
              </div>
            {/if}
            
            {#if data.enhancedFields}
              <div class="bg-gray-50 rounded-lg p-3">
                <span class="text-sm font-medium text-gray-900 mb-2 block">Enhanced Analysis Available:</span>
                <div class="text-sm text-gray-700">
                  <p>Specialized {data.enhancedFields.extractionMethod} processing completed with enhanced medical field extraction.</p>
                  {#if data.enhancedFields.documentType}
                    <p class="mt-1">Document classification: {data.enhancedFields.documentType}</p>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Standard analysis message -->
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Standard Analysis</h3>
            <p class="mt-1 text-sm text-gray-500">
              This document was processed using standard medical analysis. Enhanced document-specific extraction is not available for this content.
            </p>
          </div>
        {/if}

        <!-- Action buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
          <button 
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            on:click={() => dispatch('export', { type: documentType || 'standard', data })}
          >
            Export Analysis
          </button>
          <button 
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            on:click={handleFallbackView}
          >
            View Raw Analysis
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- No viewer and no fallback -->
    <div class="bg-white rounded-lg shadow-sm border px-6 py-8 text-center">
      <p class="text-sm text-gray-500">No specialized viewer available for this content.</p>
    </div>
  {/if}
</div>

<style>
  .specialized-report-viewer {
    width: 100%;
  }
</style>