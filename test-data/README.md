# Test Data Directory

This directory contains test data for the AI document processing system.

## Directory Structure

```
test-data/
├── extractions/     # OCR/extraction test results (gitignored)
├── analyses/        # AI analysis test results (gitignored)
├── workflows/       # Complete workflow recordings (gitignored)
├── results/         # Final processing results (gitignored)
└── README.md        # This file
```

## Testing Workflow

### 1. Extract Testing

Control via `DEBUG_EXTRACTOR` environment variable:

- **`DEBUG_EXTRACTOR="false"`** - Normal operation (real OCR/extraction)
- **`DEBUG_EXTRACTOR="true"`** - Save mode: Run real extraction and save results
- **`DEBUG_EXTRACTOR="path/to/file.json"`** - Test mode: Load saved data

#### Example Workflow:

1. **Capture real data:**

   ```bash
   # Set in .env.development.local
   DEBUG_EXTRACTOR="true"

   # Run extraction - this will save results to test-data/extractions/
   # File will be named: extraction-result-YYYY-MM-DDTHH-MM-SS-sssZ.json
   ```

2. **Use saved data for testing:**

   ```bash
   # Set in .env.development.local
   DEBUG_EXTRACTOR="test-data/extractions/extraction-result-2024-01-15T10-30-45-123Z.json"

   # Now extraction will load from file instead of doing real OCR
   ```

3. **Return to normal operation:**
   ```bash
   DEBUG_EXTRACTOR="false"
   ```

### 2. Analysis Testing

Control via `DEBUG_ANALYZER` environment variable:

- **`DEBUG_ANALYZER="false"`** - Normal operation (real AI analysis)
- **`DEBUG_ANALYZER="true"`** - Returns mock test data

### 3. LangGraph Workflow Testing

Control via `DEBUG_ANALYSIS` environment variable for comprehensive workflow debugging:

- **`DEBUG_ANALYSIS="false"`** - Normal operation (real LangGraph analysis)
- **`DEBUG_ANALYSIS="true"`** - Save mode: Run real analysis and save complete workflow
- **`DEBUG_ANALYSIS="path/to/file.json"`** - Replay mode: Load and replay saved workflow

#### Workflow Recording Features:

1. **Complete State Capture:** Records input state, output state, and metadata for each workflow step
2. **AI Request Logging:** Captures all AI requests/responses with timing and token usage
3. **Error Tracking:** Records any errors encountered during processing
4. **Performance Metrics:** Tracks duration and resource usage for each step

#### Example Workflow:

1. **Record a workflow:**

   ```bash
   # Set in .env.development.local
   DEBUG_ANALYSIS="true"

   # Run analysis - saves complete workflow to test-data/workflows/
   # File: workflow-analysis-YYYY-MM-DDTHH-MM-SS-sssZ.json
   ```

2. **Replay saved workflow:**

   ```bash
   # Set in .env.development.local
   DEBUG_ANALYSIS="test-data/workflows/workflow-analysis-2025-01-15T10-30-45-123Z.json"

   # Analysis will replay from recording step by step
   ```

3. **Workflow CLI Tools:**

   ```bash
   # List available recordings
   npx ts-node src/lib/debug/workflow-cli.ts list

   # Show workflow details
   npx ts-node src/lib/debug/workflow-cli.ts info --file my-workflow.json

   # Replay with verbose output
   npx ts-node src/lib/debug/workflow-cli.ts replay --file my-workflow.json --verbose

   # Extract specific step data
   npx ts-node src/lib/debug/workflow-cli.ts extract --file my-workflow.json --step feature_detection

   # Compare two workflows
   npx ts-node src/lib/debug/workflow-cli.ts compare --file workflow1.json --compare workflow2.json

   # Performance analysis
   npx ts-node src/lib/debug/workflow-cli.ts analyze --file my-workflow.json
   ```

## File Formats

### Extraction Test Data

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "input": {
    "imagesCount": 2,
    "hasText": false,
    "language": "cs"
  },
  "result": {
    "documents": [...],
    "pages": [...],
    "tokenUsage": {...}
  }
}
```

### Analysis Test Data

Analysis test data is built into the code as mock data arrays.

### Workflow Recording Data

```json
{
  "recordingId": "workflow-analysis-2025-01-15T10-30-45-123Z",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "phase": "analysis",
  "input": {
    "images": ["base64..."],
    "text": "extracted text",
    "language": "cs"
  },
  "steps": [
    {
      "stepId": "1-feature_detection",
      "stepName": "feature_detection",
      "timestamp": "2025-01-15T10:30:45.200Z",
      "inputState": { ... },
      "outputState": { ... },
      "duration": 1250,
      "tokenUsage": { "total": 150 },
      "aiRequests": [
        {
          "provider": "enhanced-openai",
          "model": "gpt-4o-2024-08-06",
          "timestamp": "2025-01-15T10:30:45.201Z",
          "request": { ... },
          "response": { ... },
          "tokenUsage": { "total": 150 },
          "duration": 1200
        }
      ],
      "errors": [],
      "metadata": {
        "provider": "enhanced-openai",
        "flowType": "feature_detection",
        "confidence": 0.9,
        "documentType": "clinical_report"
      }
    }
  ],
  "finalResult": { ... },
  "totalDuration": 5000,
  "totalTokenUsage": { "total": 500 },
  "version": "1.0"
}
```

## Benefits

- **Fast iteration**: Skip expensive OCR/AI calls during development
- **Consistent testing**: Use same data across different test runs
- **Debugging**: Isolate issues to specific processing steps
- **Cost effective**: Reduce API usage during development
- **Step-by-step analysis**: Replay workflows to understand exact execution flow
- **Performance optimization**: Analyze bottlenecks and optimize specific steps
- **Regression testing**: Compare workflows across different code versions
- **AI request debugging**: Inspect exact requests/responses sent to AI providers
