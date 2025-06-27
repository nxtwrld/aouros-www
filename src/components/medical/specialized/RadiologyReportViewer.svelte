<!-- Specialized Radiology Report Viewer Component -->
<!-- Displays radiology findings with enhanced imaging study visualization -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ImageViewerModal, type StudyInfo } from '../imaging';
  
  export let data: any = {};
  export let confidence: number = 0;
  export let loading: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Extract radiology-specific data
  $: radiologyData = data?.enhancedFields?.radiologySpecificity || {};
  $: studyInformation = data?.studyInformation || {};
  $: findings = data?.findings || {};
  $: measurements = data?.measurements || [];
  $: comparison = data?.comparison || {};
  $: impression = data?.impression || {};
  $: recommendations = data?.recommendations || {};
  $: organSystemFindings = data?.organSystemFindings || {};
  $: technicalQuality = data?.technicalQuality || {};
  
  // Image viewer state
  let showImageViewer = false;
  let selectedImageUrl = '';
  let selectedStudyInfo: StudyInfo = {};
  
  // Get modality display color
  function getModalityColor(modality: string): string {
    switch (modality?.toLowerCase()) {
      case 'ct': return 'bg-blue-100 text-blue-800';
      case 'mri': return 'bg-purple-100 text-purple-800';
      case 'xray': return 'bg-gray-100 text-gray-800';
      case 'ultrasound': return 'bg-green-100 text-green-800';
      case 'mammography': return 'bg-pink-100 text-pink-800';
      case 'nuclear': return 'bg-yellow-100 text-yellow-800';
      case 'pet': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  // Get finding significance color
  function getSignificanceColor(significance: string): string {
    if (!significance) return 'text-gray-600';
    const s = significance.toLowerCase();
    if (s.includes('normal') || s.includes('unremarkable')) return 'text-green-600';
    if (s.includes('abnormal') || s.includes('suspicious')) return 'text-red-600';
    if (s.includes('borderline') || s.includes('uncertain')) return 'text-yellow-600';
    return 'text-gray-600';
  }
  
  // Get comparison change color
  function getChangeColor(change: string): string {
    switch (change?.toLowerCase()) {
      case 'new': return 'text-red-600';
      case 'resolved': return 'text-green-600';
      case 'improved': return 'text-green-600';
      case 'worsened': return 'text-red-600';
      case 'stable': return 'text-blue-600';
      case 'increased': return 'text-orange-600';
      case 'decreased': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }
  
  // Get image quality color
  function getQualityColor(quality: string): string {
    switch (quality?.toLowerCase()) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-green-600';
      case 'adequate': return 'text-yellow-600';
      case 'suboptimal': return 'text-orange-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
  
  // Format measurement display
  function formatMeasurement(measurement: any): string {
    return `${measurement.value} ${measurement.unit}`;
  }
  
  // Handle image viewing
  function viewImage(imageUrl: string, studyInfo: any) {
    selectedImageUrl = imageUrl;
    selectedStudyInfo = {
      modality: studyInformation.modality,
      studyDate: studyInformation.studyDate || studyInfo.date,
      patientName: studyInfo.patientName || 'Patient',
      studyDescription: studyInformation.studyType,
    };
    showImageViewer = true;
  }
  
  function closeImageViewer() {
    showImageViewer = false;
    selectedImageUrl = '';
  }
</script>

<div class="radiology-report-viewer bg-white rounded-lg shadow-sm border">
  <!-- Header -->
  <div class="border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Radiology Report Analysis</h3>
        <p class="text-sm text-gray-500">Enhanced imaging study extraction</p>
      </div>
      <div class="flex items-center space-x-2">
        {#if confidence > 0}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {Math.round(confidence * 100)}% confidence
          </span>
        {/if}
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          Radiology Report
        </span>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="px-6 py-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Analyzing radiology report...</p>
    </div>
  {:else}
    <div class="px-6 py-4 space-y-6">
      
      <!-- Study Information -->
      {#if studyInformation.modality}
        <div class="bg-indigo-50 rounded-lg p-4">
          <h4 class="font-semibold text-indigo-900 mb-3">Study Information</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="flex items-center">
                <span class="text-sm text-indigo-700 font-medium mr-2">Modality:</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getModalityColor(studyInformation.modality)}">
                  {studyInformation.modality.toUpperCase()}
                </span>
              </div>
              {#if studyInformation.anatomicalRegion}
                <div>
                  <span class="text-sm text-indigo-700 font-medium">Region:</span>
                  <span class="text-sm text-indigo-800 ml-2">{studyInformation.anatomicalRegion}</span>
                </div>
              {/if}
              {#if studyInformation.studyType}
                <div>
                  <span class="text-sm text-indigo-700 font-medium">Study Type:</span>
                  <span class="text-sm text-indigo-800 ml-2">{studyInformation.studyType}</span>
                </div>
              {/if}
            </div>
            
            <div class="space-y-2">
              {#if studyInformation.indication}
                <div>
                  <span class="text-sm text-indigo-700 font-medium">Indication:</span>
                  <p class="text-sm text-indigo-800 mt-1">{studyInformation.indication}</p>
                </div>
              {/if}
              {#if studyInformation.contrast?.used}
                <div>
                  <span class="text-sm text-indigo-700 font-medium">Contrast:</span>
                  <span class="text-sm text-indigo-800 ml-2">
                    {studyInformation.contrast.type} ({studyInformation.contrast.route})
                  </span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Primary Findings -->
      {#if findings.primary?.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Primary Findings</h4>
          <div class="space-y-3">
            {#each findings.primary as finding}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="font-medium text-gray-900">{finding.location}</span>
                    {#if finding.size}
                      <span class="text-sm text-gray-600 ml-2">({finding.size})</span>
                    {/if}
                  </div>
                  {#if finding.significance}
                    <span class="text-sm font-medium {getSignificanceColor(finding.significance)}">
                      {finding.significance}
                    </span>
                  {/if}
                </div>
                <p class="text-sm text-gray-700 mb-2">{finding.description}</p>
                {#if finding.characteristics}
                  <p class="text-xs text-gray-600">Characteristics: {finding.characteristics}</p>
                {/if}
                {#if finding.comparison}
                  <p class="text-xs text-gray-600 mt-1">Comparison: {finding.comparison}</p>
                {/if}
                
                <!-- Special scoring systems -->
                {#if finding.birads}
                  <div class="mt-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                      BI-RADS {finding.birads}
                    </span>
                  </div>
                {/if}
                {#if finding.tirads}
                  <div class="mt-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      TI-RADS {finding.tirads}
                    </span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Measurements -->
      {#if measurements.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Measurements</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each measurements as measurement}
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm font-medium text-gray-900">{measurement.structure}</span>
                  <span class="text-sm text-gray-700">{formatMeasurement(measurement)}</span>
                </div>
                {#if measurement.dimension}
                  <p class="text-xs text-gray-600">{measurement.dimension}</p>
                {/if}
                {#if measurement.reference}
                  <p class="text-xs text-gray-500 mt-1">Ref: {measurement.reference}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Comparison with Prior Studies -->
      {#if comparison.changes?.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Comparison with Prior Study</h4>
          <div class="bg-blue-50 rounded-lg p-4">
            {#if comparison.priorStudyDate}
              <div class="mb-3">
                <span class="text-sm text-blue-700 font-medium">Prior Study:</span>
                <span class="text-sm text-blue-800 ml-2">{comparison.priorStudyDate}</span>
                {#if comparison.interval}
                  <span class="text-sm text-blue-600 ml-2">({comparison.interval})</span>
                {/if}
              </div>
            {/if}
            
            <div class="space-y-2">
              {#each comparison.changes as change}
                <div class="flex items-start">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 {change.change === 'new' ? 'bg-red-100 text-red-800' : change.change === 'resolved' ? 'bg-green-100 text-green-800' : change.change === 'stable' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                    {change.change}
                  </span>
                  <div class="flex-1">
                    <span class="text-sm text-blue-900">{change.finding}</span>
                    {#if change.description}
                      <p class="text-xs text-blue-700 mt-1">{change.description}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
            
            {#if comparison.stability}
              <div class="mt-3 pt-3 border-t border-blue-200">
                <span class="text-sm text-blue-700 font-medium">Overall Assessment:</span>
                <span class="text-sm text-blue-800 ml-2">{comparison.stability}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Organ System Findings -->
      {#if Object.keys(organSystemFindings).length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Organ System Findings</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each Object.entries(organSystemFindings) as [system, systemFindings]}
              {#if systemFindings.length > 0}
                <div class="border border-gray-200 rounded-lg p-3">
                  <h5 class="text-sm font-medium text-gray-900 mb-2 capitalize">{system.replace(/([A-Z])/g, ' $1')}</h5>
                  <ul class="text-sm text-gray-700 space-y-1">
                    {#each systemFindings as finding}
                      <li class="flex items-start">
                        <span class="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {finding}
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <!-- Impression -->
      {#if impression.summary}
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-3">Impression</h4>
          <p class="text-sm text-gray-800 mb-3">{impression.summary}</p>
          
          {#if impression.diagnoses?.length > 0}
            <div>
              <span class="text-sm font-medium text-gray-900 mb-2 block">Diagnostic Impressions:</span>
              <div class="space-y-2">
                {#each impression.diagnoses as diagnosis}
                  <div class="flex items-start justify-between">
                    <span class="text-sm text-gray-700">{diagnosis.diagnosis}</span>
                    <span class="text-xs text-gray-500 ml-2 capitalize">
                      {diagnosis.confidence}
                    </span>
                  </div>
                  {#if diagnosis.differential?.length > 0}
                    <div class="ml-4 text-xs text-gray-600">
                      Differential: {diagnosis.differential.join(', ')}
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Recommendations -->
      {#if recommendations.followUpImaging?.length > 0 || recommendations.clinicalCorrelation}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Recommendations</h4>
          <div class="space-y-3">
            
            {#if recommendations.followUpImaging?.length > 0}
              <div class="bg-yellow-50 rounded-lg p-3">
                <h5 class="text-sm font-medium text-yellow-900 mb-2">Follow-up Imaging</h5>
                <div class="space-y-2">
                  {#each recommendations.followUpImaging as followUp}
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="text-sm text-yellow-800">{followUp.modality}</span>
                        {#if followUp.indication}
                          <span class="text-xs text-yellow-700 ml-2">({followUp.indication})</span>
                        {/if}
                      </div>
                      <div class="text-right">
                        <span class="text-sm text-yellow-800">{followUp.timing}</span>
                        {#if followUp.urgency}
                          <span class="text-xs text-yellow-600 block capitalize">{followUp.urgency}</span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if recommendations.clinicalCorrelation}
              <div class="bg-blue-50 rounded-lg p-3">
                <h5 class="text-sm font-medium text-blue-900 mb-1">Clinical Correlation</h5>
                <p class="text-sm text-blue-800">{recommendations.clinicalCorrelation}</p>
              </div>
            {/if}

            {#if recommendations.consultation?.length > 0}
              <div class="bg-green-50 rounded-lg p-3">
                <h5 class="text-sm font-medium text-green-900 mb-2">Specialist Consultations</h5>
                <ul class="text-sm text-green-800 space-y-1">
                  {#each recommendations.consultation as consult}
                    <li class="flex items-start">
                      <span class="inline-block w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {consult}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Technical Quality -->
      {#if technicalQuality.imageQuality}
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-3">Technical Assessment</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-700">Image Quality:</span>
                <span class="text-sm font-medium {getQualityColor(technicalQuality.imageQuality)} capitalize">
                  {technicalQuality.imageQuality}
                </span>
              </div>
              {#if technicalQuality.cooperation}
                <div class="flex justify-between mb-2">
                  <span class="text-sm text-gray-700">Patient Cooperation:</span>
                  <span class="text-sm text-gray-800">{technicalQuality.cooperation}</span>
                </div>
              {/if}
              {#if technicalQuality.motionArtifact !== undefined}
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">Motion Artifact:</span>
                  <span class="text-sm {technicalQuality.motionArtifact ? 'text-red-600' : 'text-green-600'}">
                    {technicalQuality.motionArtifact ? 'Present' : 'Absent'}
                  </span>
                </div>
              {/if}
            </div>
            
            {#if technicalQuality.limitations?.length > 0}
              <div>
                <span class="text-sm text-gray-700 font-medium mb-1 block">Limitations:</span>
                <ul class="text-sm text-gray-600 space-y-0.5">
                  {#each technicalQuality.limitations as limitation}
                    <li class="flex items-start">
                      <span class="inline-block w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {limitation}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button 
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          on:click={() => dispatch('export', { type: 'radiology', data })}
        >
          Export Report
        </button>
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          on:click={() => dispatch('viewDetails', { type: 'radiology', data })}
        >
          View Full Details
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Image Viewer Modal -->
<ImageViewerModal
  bind:isOpen={showImageViewer}
  imageUrl={selectedImageUrl}
  imageType="standard"
  studyInfo={selectedStudyInfo}
  title="Radiology Image Viewer"
  on:close={closeImageViewer}
/>

<style>
  .radiology-report-viewer {
    max-height: 80vh;
    overflow-y: auto;
  }
</style>