# AI Testing Strategy - Step-by-Step LangSmith Testing

## Overview

This document outlines the comprehensive testing strategy for the modernized AI document import system, focusing on step-by-step testing with LangSmith integration and file-based storage for rapid iteration and improvement.

## 📁 **File-Based Testing Strategy**

### **Repository Structure**

```
/test-data/
├── scenarios/                    # Test scenarios (committed to repo)
│   ├── lab-reports/
│   │   ├── scenario-001-basic-lab.json
│   │   ├── scenario-002-multi-page-lab.json
│   │   └── scenario-003-czech-lab.json
│   ├── imaging/
│   │   ├── scenario-001-xray-report.json
│   │   └── scenario-002-mri-findings.json
│   └── pathology/
│       ├── scenario-001-biopsy.json
│       └── scenario-002-cytology.json
├── checkpoints/                  # Intermediate states (gitignored)
│   ├── scenario-001/
│   │   ├── after-input-validation.json
│   │   ├── after-feature-detection.json
│   │   ├── after-medical-analysis.json
│   │   └── after-signal-processing.json
│   └── scenario-002/
├── results/                      # Test outputs (gitignored)
│   ├── scenario-001/
│   │   ├── baseline-results.json
│   │   ├── iteration-001-results.json
│   │   └── iteration-002-results.json
│   └── comparisons/
│       ├── feature-detection-comparison.json
│       └── medical-analysis-comparison.json
└── configs/                      # Test configurations (committed)
    ├── test-runner-config.json
    └── evaluation-metrics.json
```

### **Test Scenario Format**

```json
{
  "scenario": {
    "id": "lab-001-basic",
    "name": "Basic Lab Report - Czech",
    "description": "Single page Czech lab report with standard blood work",
    "tags": ["lab", "czech", "single-page", "blood-work"]
  },
  "input": {
    "images": ["./documents/lab-001-page1.jpg"],
    "text": null,
    "language": "cs",
    "metadata": {
      "documentType": "laboratory",
      "expectedSections": ["summary", "signals", "performer"]
    }
  },
  "expected": {
    "language": "cs",
    "isMedical": true,
    "sections": ["summary", "signals", "performer"],
    "signalCount": 15,
    "primaryDiagnosis": "Laboratorní vyšetření"
  }
}
```

### **Checkpoint Storage Format**

```json
{
  "checkpoint": {
    "scenarioId": "lab-001-basic",
    "stepName": "after-feature-detection",
    "timestamp": "2024-01-15T10:30:00Z",
    "langsmithRunId": "run_123456"
  },
  "state": {
    "images": ["..."],
    "text": "Extracted text...",
    "featureDetectionResults": {
      "hasSummary": true,
      "hasSignals": true,
      "language": "cs"
    },
    "tokenUsage": { "total": 1250 }
  }
}
```

## 🔧 **Internal Testing Endpoint**

### **Testing Mode API**

```typescript
// /src/routes/v1/testing/+server.ts
export async function POST({ request, url }) {
  const action = url.searchParams.get("action");
  const data = await request.json();

  switch (action) {
    case "run-scenario":
      return await runScenario(data.scenarioId, data.startFromStep);
    case "run-step":
      return await runSingleStep(data.scenarioId, data.stepName);
    case "load-checkpoint":
      return await loadCheckpoint(data.scenarioId, data.stepName);
    case "save-scenario":
      return await saveScenarioFromRun(data.runId, data.scenarioName);
    case "compare-results":
      return await compareResults(
        data.scenarioId,
        data.baselineRun,
        data.testRun,
      );
    case "list-scenarios":
      return await listAvailableScenarios();
    default:
      return error(400, "Invalid action");
  }
}
```

### **Testing Endpoints**

```bash
# Run complete scenario
POST /v1/testing?action=run-scenario
{
  "scenarioId": "lab-001-basic",
  "startFromStep": "feature-detection" // optional
}

# Run single step from checkpoint
POST /v1/testing?action=run-step
{
  "scenarioId": "lab-001-basic",
  "stepName": "medical-analysis"
}

# Load checkpoint data
GET /v1/testing?action=load-checkpoint&scenarioId=lab-001-basic&stepName=after-feature-detection

# Save current run as new scenario
POST /v1/testing?action=save-scenario
{
  "runId": "run_123456",
  "scenarioName": "lab-002-complex",
  "description": "Multi-page Czech lab report with unusual formatting"
}

# Compare two results
POST /v1/testing?action=compare-results
{
  "scenarioId": "lab-001-basic",
  "baselineRun": "baseline",
  "testRun": "iteration-001"
}

# List available scenarios
GET /v1/testing?action=list-scenarios
```

### **Automatic Test Data Generation**

```typescript
// Testing middleware that captures data
export async function testingMiddleware(request: Request, context: any) {
  const isTestingMode = request.headers.get("X-Testing-Mode") === "true";

  if (isTestingMode) {
    // Wrap the original workflow to capture checkpoints
    const originalWorkflow = context.workflow;
    context.workflow = createTestingWorkflow(originalWorkflow, {
      scenarioId: request.headers.get("X-Scenario-Id"),
      captureCheckpoints: true,
      saveLangSmithTraces: true,
    });
  }

  return context;
}
```

### **Step-by-Step Debugging Interface**

```typescript
// Debug endpoint for step inspection
export async function GET({ url }) {
  const action = url.searchParams.get("debug");
  const scenarioId = url.searchParams.get("scenarioId");
  const stepName = url.searchParams.get("stepName");

  switch (action) {
    case "inspect-state":
      return await inspectStepState(scenarioId, stepName);
    case "replay-step":
      return await replayStep(scenarioId, stepName);
    case "modify-input":
      return await modifyStepInput(scenarioId, stepName, data);
    case "trace-execution":
      return await getExecutionTrace(scenarioId, stepName);
  }
}
```

## 🔧 **Test Runner Implementation**

### **Core Testing Class**

```typescript
// test-runner.ts
class StepByStepTestRunner {
  async runScenario(scenarioId: string, startFromStep?: string) {
    const scenario = await this.loadScenario(scenarioId);
    const checkpoint = startFromStep
      ? await this.loadCheckpoint(scenarioId, startFromStep)
      : null;

    const workflow = createDocumentProcessingWorkflow();
    const initialState = checkpoint?.state || scenario.input;

    const result = await workflow.invoke(initialState);
    await this.saveCheckpoints(scenarioId, result);
    return result;
  }

  async testSingleStep(scenarioId: string, stepName: string) {
    const checkpoint = await this.loadCheckpoint(
      scenarioId,
      `before-${stepName}`,
    );
    const result = await this.runSingleNode(stepName, checkpoint.state);
    await this.saveResult(scenarioId, stepName, result);
    return result;
  }

  async compareResults(
    scenarioId: string,
    baselineRun: string,
    testRun: string,
  ) {
    const baseline = await this.loadResult(scenarioId, baselineRun);
    const test = await this.loadResult(scenarioId, testRun);
    return this.generateComparison(baseline, test);
  }
}
```

### **Key Testing Methods**

```typescript
// File operations
async loadScenario(scenarioId: string): Promise<TestScenario>
async loadCheckpoint(scenarioId: string, stepName: string): Promise<Checkpoint>
async saveCheckpoints(scenarioId: string, result: any): Promise<void>
async saveResult(scenarioId: string, stepName: string, result: any): Promise<void>

// Testing operations
async runSingleNode(stepName: string, state: DocumentProcessingState): Promise<any>
async generateComparison(baseline: any, test: any): Promise<ComparisonResult>
async createScenarioFromDocument(documentPath: string): Promise<TestScenario>
```

## 📋 **Development Workflow**

### **Initial Setup**

1. **Create test scenario files** for different document types
2. **Run full workflow** to generate baseline checkpoints
3. **Commit scenario files** to repository (checkpoints/results gitignored)

### **API-Based Testing Process**

1. **Upload document to testing endpoint** with `X-Testing-Mode: true` header
2. **Auto-generate scenario** from real processing run
3. **Test specific step**: `POST /v1/testing?action=run-step`
4. **Compare results**: `POST /v1/testing?action=compare-results`
5. **Iterate prompt**: Modify prompt, re-test single step via API
6. **Full validation**: Run complete workflow when satisfied

### **Traditional CLI Process** (Alternative)

1. **Select scenario**: `npm run test:scenario lab-001-basic`
2. **Test specific step**: `npm run test:step lab-001-basic medical-analysis`
3. **Compare results**: `npm run test:compare lab-001-basic baseline iteration-001`
4. **Iterate prompt**: Modify prompt, re-test single step
5. **Full validation**: Run complete workflow when satisfied

### **API Testing Interface**

```bash
# Upload document in testing mode (auto-generates scenario)
curl -X POST /v1/import/extract \
  -H "X-Testing-Mode: true" \
  -H "X-Scenario-Id: lab-001-basic" \
  -d '{"images": ["base64..."]}'

# Run scenario from specific step
curl -X POST /v1/testing?action=run-scenario \
  -d '{"scenarioId": "lab-001-basic", "startFromStep": "medical-analysis"}'

# Test single step
curl -X POST /v1/testing?action=run-step \
  -d '{"scenarioId": "lab-001-basic", "stepName": "feature-detection"}'

# Compare results
curl -X POST /v1/testing?action=compare-results \
  -d '{"scenarioId": "lab-001-basic", "baselineRun": "baseline", "testRun": "iteration-001"}'

# Load checkpoint for inspection
curl -X GET /v1/testing?action=load-checkpoint&scenarioId=lab-001-basic&stepName=after-feature-detection

# Debug step execution
curl -X GET /v1/testing?debug=inspect-state&scenarioId=lab-001-basic&stepName=medical-analysis
```

### **Command Interface** (Alternative)

```bash
# Run full scenario
npm run test:scenario lab-001-basic

# Test single step from checkpoint
npm run test:step lab-001-basic medical-analysis

# Compare two results
npm run test:compare lab-001-basic baseline iteration-001

# Create new scenario from existing document
npm run test:create-scenario ./documents/new-lab.pdf

# Batch test all scenarios
npm run test:all-scenarios

# Clean up old checkpoints
npm run test:cleanup --older-than=7d
```

## 🎯 **Testing Phases**

### **Phase 1: Individual Step Testing**

- Test each LangGraph node in isolation
- Optimize prompts for each step
- Validate step outputs against expected results
- Build baseline performance metrics

### **Phase 2: Integration Testing**

- Test complete workflows end-to-end
- Validate step-to-step data flow
- Test error handling and recovery
- Validate multi-language support

### **Phase 3: Regression Testing**

- Run all scenarios after each change
- Compare results against baseline
- Identify performance regressions
- Validate ACI score maintenance

### **Phase 4: Performance Testing**

- Test under load with multiple scenarios
- Validate SSE streaming performance
- Test concurrent processing
- Measure actual vs projected improvements

## 📊 **Evaluation Metrics**

### **Step-Level Metrics**

```json
{
  "stepName": "feature-detection",
  "metrics": {
    "accuracy": 0.95,
    "processing_time": 1.2,
    "token_usage": 850,
    "confidence": 0.92,
    "detected_sections": ["summary", "signals", "performer"]
  }
}
```

### **End-to-End Metrics**

```json
{
  "scenario": "lab-001-basic",
  "metrics": {
    "total_processing_time": 4.5,
    "total_token_usage": 3200,
    "accuracy": 0.94,
    "sections_extracted": 8,
    "signals_found": 15,
    "aci_score": 0.87
  }
}
```

## 🔄 **LangSmith Integration**

### **Trace Correlation**

- Each test run creates LangSmith trace
- Checkpoint files include `langsmithRunId`
- Easy navigation from file results to LangSmith traces
- Prompt version tracking through LangSmith

### **Evaluation Setup**

```typescript
// LangSmith evaluator integration
const evaluator = new LangSmithEvaluator({
  evaluatorName: "medical-analysis-accuracy",
  criteria: {
    accuracy: "How accurate is the medical data extraction?",
    completeness: "Are all expected sections extracted?",
    consistency: "Is the data internally consistent?",
  },
});
```

## 🚀 **Benefits**

### **Fast Iteration**

- Skip expensive OCR/feature detection steps
- Focus on the step you're improving
- Instant comparison with previous results

### **Team Collaboration**

- Shared test scenarios in repository
- Consistent test data across team
- Easy to reproduce issues

### **Version Control**

- Test scenarios version controlled
- Compare improvements over time
- Rollback to previous working versions

### **Cost Effective**

- Reuse expensive processing steps
- Only run what you need to test
- Minimal LangSmith usage during development

## 📁 **File Management**

### **Gitignore Configuration**

```gitignore
# Test data (keep scenarios, ignore results)
/test-data/checkpoints/
/test-data/results/
/test-data/documents/*.pdf
/test-data/documents/*.jpg
/test-data/documents/*.png

# Keep scenario definitions
!/test-data/scenarios/
!/test-data/configs/
```

### **Cleanup Strategy**

- Automatic cleanup of old checkpoints (>7 days)
- Result archival for important baselines
- Checkpoint compression for storage efficiency

## 🖥️ **Testing UI Interface**

### **Testing Dashboard Route**

```
/testing - Main testing dashboard (dev-only)
├── /testing/scenarios - Scenario management
├── /testing/runs - Test run history
├── /testing/compare - Result comparison
└── /testing/debug - Step-by-step debugging
```

### **Main Testing Dashboard**

```svelte
<!-- src/routes/testing/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import ScenarioSelector from '$lib/components/testing/ScenarioSelector.svelte';
  import StepDebugger from '$lib/components/testing/StepDebugger.svelte';
  import ResultComparison from '$lib/components/testing/ResultComparison.svelte';

  let scenarios = [];
  let selectedScenario = null;
  let currentStep = null;
  let testResults = [];

  onMount(async () => {
    scenarios = await fetch('/v1/testing?action=list-scenarios').then(r => r.json());
  });
</script>

<div class="testing-dashboard">
  <header>
    <h1>AI Document Processing - Testing Dashboard</h1>
    <div class="actions">
      <button on:click={uploadDocument}>Upload Test Document</button>
      <button on:click={createScenario}>Create New Scenario</button>
    </div>
  </header>

  <div class="dashboard-grid">
    <div class="scenario-panel">
      <ScenarioSelector bind:scenarios bind:selectedScenario />
    </div>

    <div class="step-panel">
      <StepDebugger {selectedScenario} bind:currentStep />
    </div>

    <div class="results-panel">
      <ResultComparison {selectedScenario} {testResults} />
    </div>
  </div>
</div>
```

### **Scenario Management Component**

```svelte
<!-- src/lib/components/testing/ScenarioSelector.svelte -->
<script lang="ts">
  export let scenarios = [];
  export let selectedScenario = null;

  let uploadedFile = null;
  let newScenarioName = '';

  async function uploadDocument() {
    if (!uploadedFile) return;

    const formData = new FormData();
    formData.append('file', uploadedFile);

    const response = await fetch('/v1/import/extract', {
      method: 'POST',
      headers: {
        'X-Testing-Mode': 'true',
        'X-Scenario-Id': newScenarioName || 'auto-generated'
      },
      body: formData
    });

    if (response.ok) {
      // Refresh scenarios list
      scenarios = await fetch('/v1/testing?action=list-scenarios').then(r => r.json());
    }
  }

  async function runScenario(scenarioId, startFromStep = null) {
    const response = await fetch('/v1/testing?action=run-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, startFromStep })
    });

    return response.json();
  }
</script>

<div class="scenario-selector">
  <h3>Test Scenarios</h3>

  <!-- Upload new document -->
  <div class="upload-section">
    <input type="file" bind:files={uploadedFile} accept=".pdf,.jpg,.png" />
    <input type="text" placeholder="Scenario name" bind:value={newScenarioName} />
    <button on:click={uploadDocument}>Upload & Create Scenario</button>
  </div>

  <!-- Scenario list -->
  <div class="scenario-list">
    {#each scenarios as scenario}
      <div class="scenario-item" class:selected={selectedScenario?.id === scenario.id}>
        <div class="scenario-header" on:click={() => selectedScenario = scenario}>
          <h4>{scenario.name}</h4>
          <span class="scenario-tags">
            {#each scenario.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </span>
        </div>

        <div class="scenario-actions">
          <button on:click={() => runScenario(scenario.id)}>Run Full</button>
          <button on:click={() => runScenario(scenario.id, 'feature-detection')}>Run From Step</button>
          <button>Clone</button>
          <button>Delete</button>
        </div>
      </div>
    {/each}
  </div>
</div>
```

### **Step Debugger Component**

```svelte
<!-- src/lib/components/testing/StepDebugger.svelte -->
<script lang="ts">
  export let selectedScenario = null;
  export let currentStep = null;

  let stepState = null;
  let stepOutput = null;
  let availableSteps = [
    'input-validation',
    'feature-detection',
    'medical-analysis',
    'signal-processing',
    'quality-gate'
  ];

  async function inspectStep(stepName) {
    if (!selectedScenario) return;

    const response = await fetch(`/v1/testing?debug=inspect-state&scenarioId=${selectedScenario.id}&stepName=${stepName}`);
    stepState = await response.json();
    currentStep = stepName;
  }

  async function runStep(stepName) {
    if (!selectedScenario) return;

    const response = await fetch('/v1/testing?action=run-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: selectedScenario.id,
        stepName
      })
    });

    stepOutput = await response.json();
  }

  async function replayStep(stepName) {
    const response = await fetch(`/v1/testing?debug=replay-step&scenarioId=${selectedScenario.id}&stepName=${stepName}`);
    stepOutput = await response.json();
  }
</script>

<div class="step-debugger">
  <h3>Step-by-Step Debugging</h3>

  {#if selectedScenario}
    <div class="step-controls">
      <h4>Scenario: {selectedScenario.name}</h4>

      <div class="step-buttons">
        {#each availableSteps as step}
          <button
            class:active={currentStep === step}
            on:click={() => inspectStep(step)}
          >
            {step}
          </button>
        {/each}
      </div>
    </div>

    {#if currentStep}
      <div class="step-details">
        <div class="step-actions">
          <button on:click={() => runStep(currentStep)}>Run Step</button>
          <button on:click={() => replayStep(currentStep)}>Replay Step</button>
          <button>Modify Input</button>
          <button>View Trace</button>
        </div>

        <div class="step-data">
          <div class="input-panel">
            <h4>Step Input</h4>
            <pre>{JSON.stringify(stepState?.input, null, 2)}</pre>
          </div>

          <div class="output-panel">
            <h4>Step Output</h4>
            <pre>{JSON.stringify(stepOutput, null, 2)}</pre>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <p>Select a scenario to begin debugging</p>
  {/if}
</div>
```

### **Result Comparison Component**

```svelte
<!-- src/lib/components/testing/ResultComparison.svelte -->
<script lang="ts">
  export let selectedScenario = null;
  export let testResults = [];

  let baselineRun = null;
  let compareRun = null;
  let comparisonResult = null;

  async function compareResults() {
    if (!selectedScenario || !baselineRun || !compareRun) return;

    const response = await fetch('/v1/testing?action=compare-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: selectedScenario.id,
        baselineRun: baselineRun.id,
        testRun: compareRun.id
      })
    });

    comparisonResult = await response.json();
  }

  async function loadResults() {
    if (!selectedScenario) return;

    const response = await fetch(`/v1/testing?action=list-results&scenarioId=${selectedScenario.id}`);
    testResults = await response.json();
  }
</script>

<div class="result-comparison">
  <h3>Result Comparison</h3>

  {#if selectedScenario}
    <div class="comparison-controls">
      <div class="run-selectors">
        <div class="baseline-selector">
          <label>Baseline Run:</label>
          <select bind:value={baselineRun}>
            <option value={null}>Select baseline...</option>
            {#each testResults as result}
              <option value={result}>{result.name} - {result.timestamp}</option>
            {/each}
          </select>
        </div>

        <div class="compare-selector">
          <label>Compare Run:</label>
          <select bind:value={compareRun}>
            <option value={null}>Select run to compare...</option>
            {#each testResults as result}
              <option value={result}>{result.name} - {result.timestamp}</option>
            {/each}
          </select>
        </div>
      </div>

      <button on:click={compareResults} disabled={!baselineRun || !compareRun}>
        Compare Results
      </button>
    </div>

    {#if comparisonResult}
      <div class="comparison-results">
        <div class="metrics-comparison">
          <h4>Performance Metrics</h4>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Test</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Processing Time</td>
                <td>{comparisonResult.baseline.processingTime}s</td>
                <td>{comparisonResult.test.processingTime}s</td>
                <td class:improvement={comparisonResult.diff.processingTime < 0}>
                  {comparisonResult.diff.processingTime}s
                </td>
              </tr>
              <tr>
                <td>Token Usage</td>
                <td>{comparisonResult.baseline.tokenUsage}</td>
                <td>{comparisonResult.test.tokenUsage}</td>
                <td class:improvement={comparisonResult.diff.tokenUsage < 0}>
                  {comparisonResult.diff.tokenUsage}
                </td>
              </tr>
              <tr>
                <td>Accuracy</td>
                <td>{comparisonResult.baseline.accuracy}%</td>
                <td>{comparisonResult.test.accuracy}%</td>
                <td class:improvement={comparisonResult.diff.accuracy > 0}>
                  {comparisonResult.diff.accuracy}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="content-diff">
          <h4>Content Differences</h4>
          <pre>{JSON.stringify(comparisonResult.contentDiff, null, 2)}</pre>
        </div>
      </div>
    {/if}
  {/if}
</div>
```

### **Testing Dashboard CSS**

```css
/* src/routes/testing/testing.css */
.testing-dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

.scenario-panel,
.step-panel,
.results-panel {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.scenario-item {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 1rem;
  padding: 1rem;
}

.scenario-item.selected {
  border-color: #007bff;
  background-color: #e7f3ff;
}

.step-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.step-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.step-buttons button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.step-data {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input-panel,
.output-panel {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.input-panel pre,
.output-panel pre {
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.875rem;
}

.improvement {
  color: #28a745;
  font-weight: bold;
}

.tag {
  background: #6c757d;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-right: 0.5rem;
}
```

## 🔧 **Implementation Requirements**

### **Required Files**

- `src/routes/testing/+page.svelte` - Main testing dashboard
- `src/routes/testing/+layout.svelte` - Testing layout with navigation
- `src/lib/components/testing/ScenarioSelector.svelte` - Scenario management
- `src/lib/components/testing/StepDebugger.svelte` - Step debugging interface
- `src/lib/components/testing/ResultComparison.svelte` - Result comparison tool
- `src/routes/v1/testing/+server.ts` - Testing API endpoint
- `src/lib/testing/test-runner.ts` - Main test runner class
- `src/lib/testing/scenario-loader.ts` - Scenario file handling
- `src/lib/testing/checkpoint-manager.ts` - Checkpoint storage/retrieval
- `src/lib/testing/result-comparison.ts` - Result comparison logic

### **Configuration**

- Test runner configuration
- Evaluation metrics definitions
- Scenario templates
- LangSmith integration settings
- Development-only route protection

---

This testing strategy provides maximum flexibility for rapid iteration while maintaining comprehensive coverage and team collaboration capabilities.
