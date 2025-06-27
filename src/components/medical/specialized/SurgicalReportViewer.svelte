<!-- Specialized Surgical Report Viewer Component -->
<!-- Displays surgical procedure information with enhanced visualization -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let data: any = {};
  export let confidence: number = 0;
  export let loading: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Extract surgical-specific data
  $: surgicalData = data?.enhancedFields?.surgicalSpecificity || {};
  $: procedure = data?.procedure || {};
  $: team = data?.surgicalTeam || [];
  $: findings = data?.operativeFindings || {};
  $: postOp = data?.postoperativeStatus || {};
  
  // Format procedure duration
  function formatDuration(minutes: number): string {
    if (!minutes) return 'Not specified';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
  
  // Get complexity badge color
  function getComplexityColor(complexity: string): string {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-orange-100 text-orange-800';
      case 'highly_complex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  // Get condition status color
  function getConditionColor(condition: string): string {
    switch (condition) {
      case 'stable': return 'text-green-600';
      case 'good': return 'text-green-600';
      case 'fair': return 'text-yellow-600';
      case 'guarded': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
</script>

<div class="surgical-report-viewer bg-white rounded-lg shadow-sm border">
  <!-- Header -->
  <div class="border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Surgical Report Analysis</h3>
        <p class="text-sm text-gray-500">Enhanced surgical procedure extraction</p>
      </div>
      <div class="flex items-center space-x-2">
        {#if confidence > 0}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {Math.round(confidence * 100)}% confidence
          </span>
        {/if}
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Surgical Report
        </span>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="px-6 py-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Analyzing surgical report...</p>
    </div>
  {:else}
    <div class="px-6 py-4 space-y-6">
      
      <!-- Procedure Information -->
      {#if procedure.name}
        <div class="bg-blue-50 rounded-lg p-4">
          <h4 class="font-semibold text-blue-900 mb-3">Primary Procedure</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="font-medium text-gray-900">{procedure.name}</p>
              {#if procedure.cptCode}
                <p class="text-sm text-gray-600">CPT: {procedure.cptCode}</p>
              {/if}
              {#if procedure.icd10Code}
                <p class="text-sm text-gray-600">ICD-10: {procedure.icd10Code}</p>
              {/if}
            </div>
            <div class="space-y-2">
              {#if procedure.duration}
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">Duration:</span>
                  <span class="text-sm font-medium">{formatDuration(procedure.duration)}</span>
                </div>
              {/if}
              {#if procedure.complexity}
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Complexity:</span>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getComplexityColor(procedure.complexity)}">
                    {procedure.complexity.replace('_', ' ')}
                  </span>
                </div>
              {/if}
            </div>
          </div>
          {#if procedure.technique}
            <div class="mt-3 pt-3 border-t border-blue-200">
              <p class="text-sm text-gray-600 mb-1">Technique:</p>
              <p class="text-sm">{procedure.technique}</p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Surgical Team -->
      {#if team.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Surgical Team</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each team as member}
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-900 capitalize">{member.role.replace('_', ' ')}</span>
                  {#if member.credentials}
                    <span class="text-xs text-gray-500">{member.credentials}</span>
                  {/if}
                </div>
                {#if member.name}
                  <p class="text-sm text-gray-700">{member.name}</p>
                {/if}
                {#if member.specialty}
                  <p class="text-xs text-gray-500">{member.specialty}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Operative Findings -->
      {#if findings.anatomicalFindings || findings.pathology || findings.complications}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Operative Findings</h4>
          <div class="space-y-3">
            
            {#if findings.anatomicalFindings?.length > 0}
              <div class="bg-green-50 rounded-lg p-3">
                <h5 class="text-sm font-medium text-green-900 mb-2">Anatomical Findings</h5>
                <ul class="text-sm text-green-800 space-y-1">
                  {#each findings.anatomicalFindings as finding}
                    <li class="flex items-start">
                      <span class="inline-block w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {finding}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if findings.pathology?.length > 0}
              <div class="bg-yellow-50 rounded-lg p-3">
                <h5 class="text-sm font-medium text-yellow-900 mb-2">Pathological Findings</h5>
                <ul class="text-sm text-yellow-800 space-y-1">
                  {#each findings.pathology as finding}
                    <li class="flex items-start">
                      <span class="inline-block w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {finding}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if findings.complications?.length > 0}
              <div class="bg-red-50 rounded-lg p-3">
                <h5 class="text-sm font-medium text-red-900 mb-2">Complications</h5>
                <ul class="text-sm text-red-800 space-y-1">
                  {#each findings.complications as complication}
                    <li class="flex items-start">
                      <span class="inline-block w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {complication}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Specimens -->
      {#if findings.specimens?.length > 0}
        <div>
          <h4 class="font-semibold text-gray-900 mb-3">Specimens Collected</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each findings.specimens as specimen}
              <div class="border border-gray-200 rounded-lg p-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-900">{specimen.type}</span>
                  {#if specimen.sentToPathology}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      To Pathology
                    </span>
                  {/if}
                </div>
                {#if specimen.description}
                  <p class="text-sm text-gray-600">{specimen.description}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Post-operative Status -->
      {#if postOp.condition}
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-3">Post-operative Status</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600">Patient Condition:</span>
                <span class="text-sm font-medium {getConditionColor(postOp.condition)} capitalize">
                  {postOp.condition}
                </span>
              </div>
              {#if postOp.destination}
                <div class="flex justify-between mb-2">
                  <span class="text-sm text-gray-600">Transferred to:</span>
                  <span class="text-sm font-medium capitalize">{postOp.destination.replace('_', ' ')}</span>
                </div>
              {/if}
            </div>
            <div>
              {#if postOp.bloodLoss}
                <div class="flex justify-between mb-2">
                  <span class="text-sm text-gray-600">Blood Loss:</span>
                  <span class="text-sm font-medium">{postOp.bloodLoss} mL</span>
                </div>
              {/if}
              {#if postOp.fluidsGiven}
                <div class="flex justify-between mb-2">
                  <span class="text-sm text-gray-600">IV Fluids:</span>
                  <span class="text-sm font-medium">{postOp.fluidsGiven} mL</span>
                </div>
              {/if}
            </div>
          </div>
          
          {#if postOp.complications?.length > 0}
            <div class="mt-3 pt-3 border-t border-gray-200">
              <h5 class="text-sm font-medium text-gray-900 mb-2">Post-operative Complications</h5>
              <ul class="text-sm text-red-600 space-y-1">
                {#each postOp.complications as complication}
                  <li class="flex items-start">
                    <span class="inline-block w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {complication}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button 
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          on:click={() => dispatch('export', { type: 'surgical', data })}
        >
          Export Report
        </button>
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          on:click={() => dispatch('viewDetails', { type: 'surgical', data })}
        >
          View Full Details
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .surgical-report-viewer {
    max-height: 80vh;
    overflow-y: auto;
  }
</style>