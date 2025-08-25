<script lang="ts">
  // Development-only DAG Simulation Panel
  // Use this component in development environments to test DAG simulation
  
  import { simulateRealisticMedicalDAG, SAMPLE_BASED_EXPERT_GENERATION } from '$lib/session/dag/dag-simulation';
  import { dagActions, dagMetrics } from '$lib/session/stores/dag-execution-store';
  
  interface Props {
    sessionId?: string;
    autoStart?: boolean;
  }
  
  let { 
    sessionId = 'dev-simulation-session',
    autoStart = false 
  }: Props = $props();
  
  let isRunning = $state(false);
  let simulationSpeed = $state(2500); // milliseconds between events
  let currentSimulation: (() => void) | null = null;
  let showExpertDetails = $state(false);
  
  // Reactive metrics for display
  const metrics = $derived($dagMetrics);
  
  function startSimulation() {
    if (isRunning) {
      console.warn('🚫 Simulation already running');
      return;
    }
    
    console.log('🏥 Starting realistic medical DAG simulation from dev panel');
    
    // Initialize DAG first
    dagActions.initialize(sessionId);
    
    // Start simulation with smart timing (simulationSpeed parameter ignored)
    isRunning = true;
    currentSimulation = simulateRealisticMedicalDAG(sessionId);
    
    // Auto-stop when simulation completes (smart timing uses variable delays)
    setTimeout(() => {
      isRunning = false;
      currentSimulation = null;
    }, 25000); // Estimated total duration for smart timing
  }
  
  function stopSimulation() {
    if (currentSimulation) {
      currentSimulation();
      currentSimulation = null;
    }
    isRunning = false;
    console.log('🛑 DAG simulation stopped');
  }
  
  function resetDAG() {
    stopSimulation();
    dagActions.initialize(sessionId);
    console.log('🔄 DAG reset');
  }
  
  // Auto-start if requested
  if (autoStart && typeof window !== 'undefined') {
    setTimeout(() => {
      startSimulation();
    }, 1000);
  }
</script>

<!-- Only show in development -->
{#if typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))}
  <div class="dag-simulation-panel">
    <div class="controls-section">
      <!--div class="control-group">
        <label for="session-id">Session ID:</label>
        <input 
          id="session-id"
          type="text" 
          bind:value={sessionId} 
          disabled={isRunning}
          placeholder="dev-simulation-session"
        />
      </div>
      
      <div class="control-group">
        <label for="speed">Event Interval (ms):</label>
        <input 
          id="speed"
          type="number" 
          bind:value={simulationSpeed} 
          disabled={isRunning}
          min="500"
          max="10000"
          step="500"
        />
      </div-->
      
      <div class="action-buttons">
        <button 
          class="btn btn-primary"
          onclick={startSimulation}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : '🏥 Start Medical Simulation'}
        </button>
        
        <button 
          class="btn btn-secondary"
          onclick={stopSimulation}
          disabled={!isRunning}
        >
          🛑 Stop
        </button>
        
        <button 
          class="btn btn-secondary"
          onclick={resetDAG}
          disabled={isRunning}
        >
          🔄 Reset
        </button>
      </div>
    </div>
    <!--
    {#if metrics}
      <div class="metrics-section">
        <h4>📊 Current Metrics</h4>
        <div class="metrics-grid">
          <div class="metric">
            <span class="label">Status:</span>
            <span class="value status-{metrics.status}">{metrics.status}</span>
          </div>
          <div class="metric">
            <span class="label">Nodes:</span>
            <span class="value">{metrics.completedNodes}/{metrics.totalNodes}</span>
          </div>
          <div class="metric">
            <span class="label">Cost:</span>
            <span class="value">${metrics.totalCost.toFixed(4)}</span>
          </div>
          <div class="metric">
            <span class="label">Duration:</span>
            <span class="value">{(metrics.totalDuration / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    {/if}
    
    <div class="expert-details">
      <button 
        class="btn btn-ghost"
        onclick={() => showExpertDetails = !showExpertDetails}
      >
        {showExpertDetails ? '▼' : '▶'} Expert Generation Details
      </button>
      
      {#if showExpertDetails}
        <div class="expert-list">
          <p class="description">
            Based on sample.analysis.1.json findings, the simulation will probabilistically generate these medical experts:
          </p>
          
          {#each Object.entries(SAMPLE_BASED_EXPERT_GENERATION) as [key, expert]}
            <div class="expert-card">
              <div class="expert-header">
                <strong>{expert.name}</strong>
                <span class="probability">{(expert.triggerProbability * 100).toFixed(0)}% chance</span>
              </div>
              <div class="expert-focus">
                <strong>Focus:</strong> {expert.investigationFocus}
              </div>
              <div class="expert-context">
                <strong>Context:</strong> {expert.filteredContext.symptoms?.join(', ') || 'General assessment'}
              </div>
              <div class="expert-prompt">
                <strong>Custom Prompt:</strong> 
                <em>"{expert.customPrompt.substring(0, 100)}..."</em>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <div class="usage-note">
      <p><strong>💡 Usage:</strong> This panel demonstrates AI-by-AI expert generation based on realistic medical cases. 
      Each simulation run may generate different experts based on probabilistic triggering.</p>
    </div>-->
  </div>
{/if}

<style>
  .dag-simulation-panel {
    position: fixed;
    top: 50px;
    right: 20px;
    background: #f8fafc;
    border: 2px dashed #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    margin: 20px;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 100000;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .panel-header h3 {
    margin: 0;
    color: #1f2937;
    font-size: 18px;
  }
  
  .dev-badge {
    background: #fef3c7;
    color: #92400e;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .controls-section {
    margin-bottom: 20px;
  }
  
  .control-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .control-group label {
    min-width: 120px;
    font-weight: 500;
    color: #374151;
  }
  
  .control-group input {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 15px;
  }
  
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }
  
  .btn-secondary {
    background: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #4b5563;
  }
  
  .btn-ghost {
    background: transparent;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  
  .btn-ghost:hover {
    background: #f3f4f6;
  }
  
  .metrics-section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .metrics-section h4 {
    margin: 0 0 10px 0;
    color: #1f2937;
    font-size: 16px;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }
  
  .metric {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
  }
  
  .metric .label {
    color: #6b7280;
    font-weight: 500;
  }
  
  .metric .value {
    font-weight: 600;
    color: #1f2937;
  }
  
  .value.status-running {
    color: #f59e0b;
  }
  
  .value.status-completed {
    color: #10b981;
  }
  
  .value.status-failed {
    color: #ef4444;
  }
  
  .expert-details {
    margin-bottom: 20px;
  }
  
  .expert-list {
    margin-top: 15px;
  }
  
  .description {
    color: #6b7280;
    font-style: italic;
    margin-bottom: 15px;
  }
  
  .expert-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 10px;
  }
  
  .expert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .probability {
    background: #dbeafe;
    color: #1d4ed8;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .expert-focus,
  .expert-context,
  .expert-prompt {
    margin-bottom: 6px;
    font-size: 13px;
    color: #374151;
  }
  
  .expert-prompt em {
    color: #6b7280;
  }
  
  .usage-note {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 12px;
    font-size: 14px;
    color: #1e40af;
  }
  
  .usage-note strong {
    color: #1d4ed8;
  }
</style>