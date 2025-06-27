<!-- Specialized Pathology Report Viewer Component -->
<!-- Displays pathological findings with enhanced visualization for medical professionals -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let data: any = {};
  export let confidence: number = 0;
  export let loading: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Extract pathology-specific data
  $: pathologyData = data?.enhancedFields?.pathologySpecificity || {};
  $: specimen = data?.specimen || {};
  $: grossDescription = data?.grossDescription || {};
  $: microscopicFindings = data?.microscopicFindings || {};
  $: immunohistochemistry = data?.immunohistochemistry || [];
  $: specialStains = data?.specialStains || [];
  $: molecularFindings = data?.molecularFindings || {};
  $: diagnosis = data?.diagnosis || {};
  
  // Format staining result with color coding
  function getStainResultColor(result: string): string {
    switch (result.toLowerCase()) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'equivocal': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }
  
  // Get grade severity color
  function getGradeColor(grade: string): string {
    if (!grade) return 'bg-gray-100 text-gray-800';
    
    const lowerGrade = grade.toLowerCase();
    if (lowerGrade.includes('high') || lowerGrade.includes('3') || lowerGrade.includes('poor')) {
      return 'bg-red-100 text-red-800';
    }
    if (lowerGrade.includes('moderate') || lowerGrade.includes('2')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (lowerGrade.includes('low') || lowerGrade.includes('1') || lowerGrade.includes('well')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  }
  
  // Format TNM staging display
  function formatTNM(stage: any): string {
    if (!stage) return 'Not staged';
    const parts = [];
    if (stage.t) parts.push(`T${stage.t}`);
    if (stage.n) parts.push(`N${stage.n}`);
    if (stage.m) parts.push(`M${stage.m}`);
    return parts.join(' ') || 'Not staged';
  }
  
  // Get margin status color
  function getMarginColor(status: string): string {
    switch (status) {
      case 'negative': return 'text-green-600';
      case 'positive': return 'text-red-600';
      case 'close': return 'text-yellow-600';
      case 'cannot_assess': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }
</script>

<div class="pathology-report-viewer bg-white rounded-lg shadow-sm border">
  <!-- Header -->
  <div class="border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Pathology Report Analysis</h3>
        <p class="text-sm text-gray-500">Enhanced histopathological findings extraction</p>
      </div>
      <div class="flex items-center space-x-2">
        {#if confidence > 0}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {Math.round(confidence * 100)}% confidence
          </span>
        {/if}
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Pathology Report
        </span>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="px-6 py-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Analyzing pathology report...</p>
    </div>
  {:else}
    <div class="px-6 py-4 space-y-6">
      
      <!-- Specimen Information -->
      {#if specimen.type || specimen.site}
        <div class="bg-green-50 rounded-lg p-4">
          <h4 class="font-semibold text-green-900 mb-3">Specimen Details</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {#if specimen.type}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">Type:</span>
                  <span class="text-sm text-green-800 ml-2">{specimen.type}</span>
                </div>
              {/if}
              {#if specimen.site}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">Site:</span>
                  <span class="text-sm text-green-800 ml-2">{specimen.site}</span>
                </div>
              {/if}
              {#if specimen.procedure}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">Procedure:</span>
                  <span class="text-sm text-green-800 ml-2">{specimen.procedure}</span>
                </div>
              {/if}
            </div>
            <div>
              {#if specimen.size}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">Size:</span>
                  <span class="text-sm text-green-800 ml-2">{specimen.size}</span>
                </div>
              {/if}
              {#if specimen.weight}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">Weight:</span>
                  <span class="text-sm text-green-800 ml-2">{specimen.weight}g</span>
                </div>
              {/if}
              {#if specimen.fixation}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">Fixation:</span>
                  <span class="text-sm text-green-800 ml-2">{specimen.fixation}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Gross Description -->
      {#if grossDescription.appearance || grossDescription.lesions?.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Gross Examination</h4>
          <div class="bg-blue-50 rounded-lg p-4 space-y-3">
            {#if grossDescription.appearance}
              <div>
                <span class="text-sm text-blue-700 font-medium">Appearance:</span>
                <p class="text-sm text-blue-800 mt-1">{grossDescription.appearance}</p>
              </div>
            {/if}
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#if grossDescription.color}
                <div>
                  <span class="text-sm text-blue-700 font-medium">Color:</span>
                  <span class="text-sm text-blue-800 ml-2">{grossDescription.color}</span>
                </div>
              {/if}
              {#if grossDescription.consistency}
                <div>
                  <span class="text-sm text-blue-700 font-medium">Consistency:</span>
                  <span class="text-sm text-blue-800 ml-2">{grossDescription.consistency}</span>
                </div>
              {/if}
            </div>

            {#if grossDescription.lesions?.length > 0}
              <div>
                <span class="text-sm text-blue-700 font-medium mb-2 block">Lesions:</span>
                <div class="space-y-2">
                  {#each grossDescription.lesions as lesion}
                    <div class="bg-white rounded p-3 border border-blue-200">
                      <p class="text-sm text-gray-900">{lesion.description}</p>
                      <div class="flex justify-between text-xs text-gray-600 mt-1">
                        {#if lesion.size}<span>Size: {lesion.size}</span>{/if}
                        {#if lesion.location}<span>Location: {lesion.location}</span>{/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Microscopic Findings -->
      {#if microscopicFindings.architecture || microscopicFindings.cellularFeatures}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Microscopic Examination</h4>
          <div class="bg-purple-50 rounded-lg p-4 space-y-3">
            {#if microscopicFindings.architecture}
              <div>
                <span class="text-sm text-purple-700 font-medium">Architecture:</span>
                <span class="text-sm text-purple-800 ml-2">{microscopicFindings.architecture}</span>
              </div>
            {/if}
            
            {#if microscopicFindings.cellularFeatures}
              <div>
                <span class="text-sm text-purple-700 font-medium mb-2 block">Cellular Features:</span>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#if microscopicFindings.cellularFeatures.cellType}
                    <div class="text-sm">
                      <span class="text-purple-600">Cell Type:</span>
                      <span class="text-purple-800 ml-2">{microscopicFindings.cellularFeatures.cellType}</span>
                    </div>
                  {/if}
                  {#if microscopicFindings.cellularFeatures.pleomorphism}
                    <div class="text-sm">
                      <span class="text-purple-600">Pleomorphism:</span>
                      <span class="text-purple-800 ml-2">{microscopicFindings.cellularFeatures.pleomorphism}</span>
                    </div>
                  {/if}
                  {#if microscopicFindings.cellularFeatures.mitoses}
                    <div class="text-sm">
                      <span class="text-purple-600">Mitoses:</span>
                      <span class="text-purple-800 ml-2">{microscopicFindings.cellularFeatures.mitoses}</span>
                    </div>
                  {/if}
                  {#if microscopicFindings.cellularFeatures.necrosis !== undefined}
                    <div class="text-sm">
                      <span class="text-purple-600">Necrosis:</span>
                      <span class="text-purple-800 ml-2">{microscopicFindings.cellularFeatures.necrosis ? 'Present' : 'Absent'}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Invasion status -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-purple-200">
              {#if microscopicFindings.vascularInvasion !== undefined}
                <div class="text-sm">
                  <span class="text-purple-600">Vascular Invasion:</span>
                  <span class="text-purple-800 ml-2 {microscopicFindings.vascularInvasion ? 'font-medium' : ''}">
                    {microscopicFindings.vascularInvasion ? 'Present' : 'Absent'}
                  </span>
                </div>
              {/if}
              {#if microscopicFindings.lymphaticInvasion !== undefined}
                <div class="text-sm">
                  <span class="text-purple-600">Lymphatic Invasion:</span>
                  <span class="text-purple-800 ml-2 {microscopicFindings.lymphaticInvasion ? 'font-medium' : ''}">
                    {microscopicFindings.lymphaticInvasion ? 'Present' : 'Absent'}
                  </span>
                </div>
              {/if}
              {#if microscopicFindings.perineural Invasion !== undefined}
                <div class="text-sm">
                  <span class="text-purple-600">Perineural Invasion:</span>
                  <span class="text-purple-800 ml-2 {microscopicFindings.perineural Invasion ? 'font-medium' : ''}">
                    {microscopicFindings.perineural Invasion ? 'Present' : 'Absent'}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Immunohistochemistry -->
      {#if immunohistochemistry.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Immunohistochemistry</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each immunohistochemistry as ihc}
              <div class="border border-gray-200 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-900">{ihc.marker}</span>
                  <span class="text-sm font-medium {getStainResultColor(ihc.result)}">
                    {ihc.result}
                  </span>
                </div>
                <div class="space-y-1">
                  {#if ihc.intensity}
                    <div class="text-xs text-gray-600">
                      Intensity: <span class="font-medium">{ihc.intensity}</span>
                    </div>
                  {/if}
                  {#if ihc.percentage}
                    <div class="text-xs text-gray-600">
                      Percentage: <span class="font-medium">{ihc.percentage}%</span>
                    </div>
                  {/if}
                  {#if ihc.interpretation}
                    <p class="text-xs text-gray-700 mt-2">{ihc.interpretation}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Molecular Findings -->
      {#if molecularFindings.mutations?.length > 0 || molecularFindings.msi}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Molecular Pathology</h4>
          <div class="space-y-3">
            
            {#if molecularFindings.mutations?.length > 0}
              <div class="bg-orange-50 rounded-lg p-4">
                <h5 class="text-sm font-medium text-orange-900 mb-3">Genetic Mutations</h5>
                <div class="space-y-2">
                  {#each molecularFindings.mutations as mutation}
                    <div class="bg-white rounded p-3 border border-orange-200">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-medium text-gray-900">{mutation.gene}</span>
                        <span class="text-xs text-orange-600">{mutation.status}</span>
                      </div>
                      <p class="text-sm text-gray-700">{mutation.mutation}</p>
                      {#if mutation.significance}
                        <p class="text-xs text-gray-600 mt-1">{mutation.significance}</p>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if molecularFindings.msi}
              <div class="bg-yellow-50 rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-yellow-900">Microsatellite Instability:</span>
                  <span class="text-sm font-medium text-yellow-800 capitalize">{molecularFindings.msi.replace('_', ' ')}</span>
                </div>
              </div>
            {/if}

            {#if molecularFindings.pdl1}
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-blue-900">PD-L1 Expression:</span>
                  <span class="text-sm font-medium text-blue-800">{molecularFindings.pdl1.score}%</span>
                </div>
                {#if molecularFindings.pdl1.interpretation}
                  <p class="text-sm text-blue-700 mt-1">{molecularFindings.pdl1.interpretation}</p>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Diagnosis -->
      {#if diagnosis.primary}
        <div class="bg-red-50 rounded-lg p-4">
          <h4 class="font-semibold text-red-900 mb-3">Diagnosis</h4>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-red-700 font-medium">Primary Diagnosis:</span>
              <p class="text-sm text-red-800 mt-1">{diagnosis.primary}</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#if diagnosis.histologicType}
                <div>
                  <span class="text-sm text-red-700 font-medium">Histologic Type:</span>
                  <span class="text-sm text-red-800 ml-2">{diagnosis.histologicType}</span>
                </div>
              {/if}
              {#if diagnosis.grade}
                <div class="flex items-center">
                  <span class="text-sm text-red-700 font-medium mr-2">Grade:</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getGradeColor(diagnosis.grade)}">
                    {diagnosis.grade}
                  </span>
                </div>
              {/if}
            </div>

            {#if diagnosis.stage}
              <div>
                <span class="text-sm text-red-700 font-medium">TNM Stage:</span>
                <span class="text-sm text-red-800 ml-2">{formatTNM(diagnosis.stage)}</span>
                {#if diagnosis.stage.overall}
                  <span class="text-sm text-red-800">({diagnosis.stage.overall})</span>
                {/if}
              </div>
            {/if}

            <!-- Margins -->
            {#if diagnosis.margins}
              <div>
                <span class="text-sm text-red-700 font-medium">Surgical Margins:</span>
                <span class="text-sm font-medium ml-2 {getMarginColor(diagnosis.margins.status)} capitalize">
                  {diagnosis.margins.status.replace('_', ' ')}
                </span>
                {#if diagnosis.margins.distance}
                  <span class="text-sm text-red-800">({diagnosis.margins.distance})</span>
                {/if}
              </div>
            {/if}

            <!-- Lymph Nodes -->
            {#if diagnosis.lymphNodes}
              <div>
                <span class="text-sm text-red-700 font-medium">Lymph Nodes:</span>
                <span class="text-sm text-red-800 ml-2">
                  {diagnosis.lymphNodes.positive || 0}/{diagnosis.lymphNodes.examined || 0} positive
                </span>
                {#if diagnosis.lymphNodes.extracapsularExtension}
                  <span class="text-sm text-red-600 ml-2">(Extracapsular extension present)</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button 
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          on:click={() => dispatch('export', { type: 'pathology', data })}
        >
          Export Report
        </button>
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          on:click={() => dispatch('viewDetails', { type: 'pathology', data })}
        >
          View Full Details
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .pathology-report-viewer {
    max-height: 80vh;
    overflow-y: auto;
  }
</style>