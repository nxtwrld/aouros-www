<!-- Specialized Cardiology Report Viewer Component -->
<!-- Displays cardiac evaluation findings with enhanced visualization -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let data: any = {};
  export let confidence: number = 0;
  export let loading: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Extract cardiology-specific data
  $: cardiologyData = data?.enhancedFields?.cardiologySpecificity || {};
  $: studyType = data?.studyType || 'unknown';
  $: ecgFindings = data?.ecgFindings || {};
  $: echoFindings = data?.echoFindings || {};
  $: stressTestResults = data?.stressTestResults || {};
  $: catheterizationFindings = data?.catheterizationFindings || {};
  $: diagnosis = data?.diagnosis || {};
  $: riskAssessment = data?.riskAssessment || {};
  
  // Get rhythm status color
  function getRhythmColor(rhythm: string): string {
    if (!rhythm) return 'text-gray-600';
    const normalRhythms = ['sinus', 'normal'];
    const abnormalRhythms = ['atrial fibrillation', 'afib', 'flutter', 'tachycardia', 'bradycardia'];
    
    if (normalRhythms.some(r => rhythm.toLowerCase().includes(r))) {
      return 'text-green-600';
    }
    if (abnormalRhythms.some(r => rhythm.toLowerCase().includes(r))) {
      return 'text-red-600';
    }
    return 'text-yellow-600';
  }
  
  // Get EF status color
  function getEFColor(ef: number): string {
    if (ef >= 55) return 'text-green-600';
    if (ef >= 40) return 'text-yellow-600';
    if (ef >= 30) return 'text-orange-600';
    return 'text-red-600';
  }
  
  // Get heart rate status
  function getHRStatus(rate: number): { color: string; status: string } {
    if (rate < 60) return { color: 'text-blue-600', status: 'Bradycardia' };
    if (rate > 100) return { color: 'text-red-600', status: 'Tachycardia' };
    return { color: 'text-green-600', status: 'Normal' };
  }
  
  // Format study type display
  function formatStudyType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Get valve severity color
  function getValveSeverityColor(severity: string): string {
    if (!severity) return 'text-gray-600';
    const s = severity.toLowerCase();
    if (s.includes('severe')) return 'text-red-600';
    if (s.includes('moderate')) return 'text-yellow-600';
    if (s.includes('mild')) return 'text-green-600';
    return 'text-gray-600';
  }
  
  // Get NYHA class color
  function getNYHAColor(nyhaClass: string): string {
    if (!nyhaClass) return 'text-gray-600';
    const classNum = nyhaClass.toLowerCase();
    if (classNum.includes('iv')) return 'text-red-600';
    if (classNum.includes('iii')) return 'text-orange-600';
    if (classNum.includes('ii')) return 'text-yellow-600';
    if (classNum.includes('i')) return 'text-green-600';
    return 'text-gray-600';
  }
</script>

<div class="cardiology-report-viewer bg-white rounded-lg shadow-sm border">
  <!-- Header -->
  <div class="border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Cardiology Report Analysis</h3>
        <p class="text-sm text-gray-500">Enhanced cardiac evaluation extraction - {formatStudyType(studyType)}</p>
      </div>
      <div class="flex items-center space-x-2">
        {#if confidence > 0}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {Math.round(confidence * 100)}% confidence
          </span>
        {/if}
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Cardiology Report
        </span>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="px-6 py-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Analyzing cardiology report...</p>
    </div>
  {:else}
    <div class="px-6 py-4 space-y-6">
      
      <!-- ECG Findings -->
      {#if ecgFindings.rhythm || ecgFindings.rate}
        <div class="bg-red-50 rounded-lg p-4">
          <h4 class="font-semibold text-red-900 mb-3">ECG Findings</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              {#if ecgFindings.rhythm}
                <div class="flex justify-between items-center">
                  <span class="text-sm text-red-700">Rhythm:</span>
                  <span class="text-sm font-medium {getRhythmColor(ecgFindings.rhythm)} capitalize">
                    {ecgFindings.rhythm}
                  </span>
                </div>
              {/if}
              {#if ecgFindings.rate}
                <div class="flex justify-between items-center">
                  <span class="text-sm text-red-700">Heart Rate:</span>
                  <div class="text-right">
                    <span class="text-sm font-medium text-gray-900">{ecgFindings.rate} bpm</span>
                    <span class="text-xs {getHRStatus(ecgFindings.rate).color} block">
                      {getHRStatus(ecgFindings.rate).status}
                    </span>
                  </div>
                </div>
              {/if}
              {#if ecgFindings.axis}
                <div class="flex justify-between">
                  <span class="text-sm text-red-700">Axis:</span>
                  <span class="text-sm text-red-800 capitalize">{ecgFindings.axis}</span>
                </div>
              {/if}
            </div>
            
            {#if ecgFindings.intervals}
              <div>
                <span class="text-sm text-red-700 font-medium mb-2 block">Intervals:</span>
                <div class="space-y-1">
                  {#if ecgFindings.intervals.pr}
                    <div class="flex justify-between text-sm">
                      <span class="text-red-600">PR:</span>
                      <span class="text-red-800">{ecgFindings.intervals.pr} ms</span>
                    </div>
                  {/if}
                  {#if ecgFindings.intervals.qrs}
                    <div class="flex justify-between text-sm">
                      <span class="text-red-600">QRS:</span>
                      <span class="text-red-800">{ecgFindings.intervals.qrs} ms</span>
                    </div>
                  {/if}
                  {#if ecgFindings.intervals.qtc}
                    <div class="flex justify-between text-sm">
                      <span class="text-red-600">QTc:</span>
                      <span class="text-red-800">{ecgFindings.intervals.qtc} ms</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          {#if ecgFindings.abnormalities?.length > 0}
            <div class="mt-4 pt-3 border-t border-red-200">
              <span class="text-sm text-red-700 font-medium mb-2 block">Abnormalities:</span>
              <div class="space-y-2">
                {#each ecgFindings.abnormalities as abnormality}
                  <div class="bg-white rounded p-3 border border-red-200">
                    <div class="flex justify-between items-start mb-1">
                      <span class="text-sm font-medium text-gray-900">{abnormality.finding}</span>
                      {#if abnormality.severity}
                        <span class="text-xs text-red-600">{abnormality.severity}</span>
                      {/if}
                    </div>
                    {#if abnormality.location}
                      <p class="text-xs text-gray-600">Location: {abnormality.location}</p>
                    {/if}
                    {#if abnormality.clinical_significance}
                      <p class="text-xs text-gray-700 mt-1">{abnormality.clinical_significance}</p>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Echo Findings -->
      {#if echoFindings.leftVentricle || echoFindings.valves}
        <div class="bg-blue-50 rounded-lg p-4">
          <h4 class="font-semibold text-blue-900 mb-3">Echocardiogram Findings</h4>
          
          {#if echoFindings.leftVentricle}
            <div class="mb-4">
              <h5 class="text-sm font-medium text-blue-800 mb-2">Left Ventricular Function</h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {#if echoFindings.leftVentricle.ejectionFraction}
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm text-blue-700">Ejection Fraction:</span>
                      <span class="text-sm font-medium {getEFColor(echoFindings.leftVentricle.ejectionFraction)}">
                        {echoFindings.leftVentricle.ejectionFraction}%
                      </span>
                    </div>
                  {/if}
                  {#if echoFindings.leftVentricle.wallMotion}
                    <div class="flex justify-between mb-2">
                      <span class="text-sm text-blue-700">Wall Motion:</span>
                      <span class="text-sm text-blue-800">{echoFindings.leftVentricle.wallMotion}</span>
                    </div>
                  {/if}
                </div>
                
                {#if echoFindings.leftVentricle.dimensions}
                  <div>
                    <span class="text-sm text-blue-700 font-medium mb-1 block">Dimensions:</span>
                    <div class="space-y-1">
                      {#if echoFindings.leftVentricle.dimensions.lved}
                        <div class="flex justify-between text-xs">
                          <span class="text-blue-600">LVED:</span>
                          <span class="text-blue-800">{echoFindings.leftVentricle.dimensions.lved} cm</span>
                        </div>
                      {/if}
                      {#if echoFindings.leftVentricle.dimensions.lves}
                        <div class="flex justify-between text-xs">
                          <span class="text-blue-600">LVES:</span>
                          <span class="text-blue-800">{echoFindings.leftVentricle.dimensions.lves} cm</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Valves -->
          {#if echoFindings.valves?.length > 0}
            <div>
              <h5 class="text-sm font-medium text-blue-800 mb-2">Cardiac Valves</h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each echoFindings.valves as valve}
                  <div class="bg-white rounded p-3 border border-blue-200">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm font-medium text-gray-900 capitalize">{valve.valve} Valve</span>
                      <span class="text-xs text-blue-600">{valve.function}</span>
                    </div>
                    
                    {#if valve.stenosis?.present}
                      <div class="mb-1">
                        <span class="text-xs text-gray-600">Stenosis:</span>
                        <span class="text-xs font-medium {getValveSeverityColor(valve.stenosis.severity)} ml-1">
                          {valve.stenosis.severity}
                        </span>
                        {#if valve.stenosis.gradient}
                          <span class="text-xs text-gray-600">({valve.stenosis.gradient} mmHg)</span>
                        {/if}
                      </div>
                    {/if}
                    
                    {#if valve.regurgitation?.present}
                      <div>
                        <span class="text-xs text-gray-600">Regurgitation:</span>
                        <span class="text-xs font-medium {getValveSeverityColor(valve.regurgitation.severity)} ml-1">
                          {valve.regurgitation.severity}
                        </span>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Stress Test Results -->
      {#if stressTestResults.testType}
        <div class="bg-green-50 rounded-lg p-4">
          <h4 class="font-semibold text-green-900 mb-3">Stress Test Results</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-green-700">Test Type:</span>
                  <span class="text-sm text-green-800 capitalize">{stressTestResults.testType}</span>
                </div>
                {#if stressTestResults.maxHeartRate && stressTestResults.targetHeartRate}
                  <div class="flex justify-between">
                    <span class="text-sm text-green-700">Heart Rate:</span>
                    <span class="text-sm text-green-800">
                      {stressTestResults.maxHeartRate}/{stressTestResults.targetHeartRate} bpm
                    </span>
                  </div>
                {/if}
                {#if stressTestResults.functionalCapacity?.mets}
                  <div class="flex justify-between">
                    <span class="text-sm text-green-700">Functional Capacity:</span>
                    <span class="text-sm text-green-800">{stressTestResults.functionalCapacity.mets} METs</span>
                  </div>
                {/if}
              </div>
            </div>
            
            <div>
              {#if stressTestResults.ecgResponse}
                <div class="mb-2">
                  <span class="text-sm text-green-700 font-medium">ECG Response:</span>
                  <div class="text-xs space-y-1 mt-1">
                    <div class="flex justify-between">
                      <span>ST Changes:</span>
                      <span class="{stressTestResults.ecgResponse.stChanges ? 'text-red-600' : 'text-green-600'}">
                        {stressTestResults.ecgResponse.stChanges ? 'Present' : 'Absent'}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span>Arrhythmias:</span>
                      <span class="{stressTestResults.ecgResponse.arrhythmias ? 'text-red-600' : 'text-green-600'}">
                        {stressTestResults.ecgResponse.arrhythmias ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  </div>
                </div>
              {/if}
              
              {#if stressTestResults.symptoms?.length > 0}
                <div>
                  <span class="text-sm text-green-700 font-medium">Symptoms:</span>
                  <ul class="text-xs text-green-800 mt-1 space-y-0.5">
                    {#each stressTestResults.symptoms as symptom}
                      <li>• {symptom}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Risk Assessment -->
      {#if riskAssessment.riskFactors?.length > 0 || riskAssessment.functionalClass}
        <div class="bg-yellow-50 rounded-lg p-4">
          <h4 class="font-semibold text-yellow-900 mb-3">Risk Assessment</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {#if riskAssessment.functionalClass}
                <div class="mb-3">
                  <span class="text-sm text-yellow-700 font-medium">NYHA Class:</span>
                  <span class="text-sm font-medium ml-2 {getNYHAColor(riskAssessment.functionalClass)}">
                    {riskAssessment.functionalClass.toUpperCase()}
                  </span>
                </div>
              {/if}
              {#if riskAssessment.framinghamScore}
                <div class="mb-3">
                  <span class="text-sm text-yellow-700 font-medium">Framingham Score:</span>
                  <span class="text-sm text-yellow-800 ml-2">{riskAssessment.framinghamScore}%</span>
                </div>
              {/if}
            </div>
            
            {#if riskAssessment.riskFactors?.length > 0}
              <div>
                <span class="text-sm text-yellow-700 font-medium mb-2 block">Risk Factors:</span>
                <ul class="text-sm text-yellow-800 space-y-1">
                  {#each riskAssessment.riskFactors as factor}
                    <li class="flex items-start">
                      <span class="inline-block w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {factor}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Diagnosis -->
      {#if diagnosis.primary}
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-3">Cardiac Diagnosis</h4>
          <div>
            <span class="text-sm text-gray-700 font-medium">Primary Diagnosis:</span>
            <p class="text-sm text-gray-900 mt-1">{diagnosis.primary}</p>
          </div>
          
          {#if diagnosis.secondary?.length > 0}
            <div class="mt-3">
              <span class="text-sm text-gray-700 font-medium">Secondary Diagnoses:</span>
              <ul class="text-sm text-gray-800 mt-1 space-y-1">
                {#each diagnosis.secondary as secondary}
                  <li class="flex items-start">
                    <span class="inline-block w-1.5 h-1.5 bg-gray-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {secondary}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          
          <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
            {#if diagnosis.severity}
              <div>
                <span class="text-sm text-gray-600">Severity:</span>
                <span class="text-sm font-medium text-gray-900 ml-2">{diagnosis.severity}</span>
              </div>
            {/if}
            {#if diagnosis.acuity}
              <div>
                <span class="text-sm text-gray-600">Acuity:</span>
                <span class="text-sm font-medium text-gray-900 ml-2 capitalize">{diagnosis.acuity.replace('_', ' ')}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button 
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          on:click={() => dispatch('export', { type: 'cardiology', data })}
        >
          Export Report
        </button>
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          on:click={() => dispatch('viewDetails', { type: 'cardiology', data })}
        >
          View Full Details
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .cardiology-report-viewer {
    max-height: 80vh;
    overflow-y: auto;
  }
</style>