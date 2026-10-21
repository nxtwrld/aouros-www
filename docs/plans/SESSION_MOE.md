# Session Mixture-of-Experts (QOM) — Design

> **Status:** Partial (mostly Pending) · **Type:** Plan · **Verified:** 2026-10-21
> **Built:** `src/lib/session/qom/`, `src/lib/config/qom-default.json`, `src/components/session/QOMVisualizer.svelte`, `src/components/session/SessionMoeVisualizer.svelte`, `src/lib/session/transport/sse-client.ts` · **Pending:** expert nodes, consensus merger, dynamic expert creation, parallel execution

> [!IMPORTANT]
> **Current reality (2026-10-21).** Most of this document is a design target, not a description of running code.
>
> - **Live analysis is single-pass, not MoE.** It runs through `src/lib/session-deprecated/analyzeConversation.ts` (`analyze()`), called directly from `src/routes/v1/med/session/+server.ts` and, via `analyzeTranscriptionRealtime()` in `src/lib/session-deprecated/realtime-analysis.ts`, from `src/routes/v1/session/[sessionId]/audio/+server.ts`. Final reports use `src/lib/session-deprecated/finalizeReport.ts`.
> - **Built QOM pieces are visualisation only:** `src/lib/session/qom/*` (event processor, transformer, dynamic layout engine, scripted simulation), the template `src/lib/config/qom-default.json`, `src/lib/session/stores/qom-execution-store.ts`, `src/components/session/QOMVisualizer.svelte`, `src/components/session/SessionMoeVisualizer.svelte` (plus `SankeyDiagram.svelte` and the sidebar tabs) and the dev-only `src/components/dev/QOMSimulationPanel.svelte`. The expert graph you see is driven by the simulation, not by real expert calls.
> - **Transport exists:** `src/lib/session/transport/sse-client.ts`, `src/lib/session/stores/unified-session-store.ts` (has `expertAnalyses` / `consensus` slots that nothing fills yet) and `src/routes/v1/session/[sessionId]/stream/+server.ts`.
> - **Not built:** expert node execution, consensus merger, dynamic (AI-generated) expert creation, parallel expert execution, the `universal_dag_models` section of `models.yaml`, and the LangGraph `dag-executor.ts`. QOM checklist: 6/22 (4 design items + 2 simulation-only items).

**Related:** [Transcription](../features/session/TRANSCRIPTION.md) · [Context management](../architecture/CONTEXT_MANAGEMENT.md)

This document merges the former `AI_SESSION_WORKFLOW.md` (session workflow, Part I) and `AI_SESSION_QOM.md` (Universal QOM expert framework, Part II).

# Part I — Session Workflow

## Overview

This document describes the complete workflow for AI-powered medical session analysis using a Universal QOM (Query-Oriented Model) Mixture of Experts architecture. The system processes real-time medical conversations through dynamically configured expert nodes, builds consensus through intelligent merging, and handles conflicts by presenting multiple perspectives to clinicians.

## Real-Time Continuous Assistant Nature

This system is designed as a **continuous, real-time assistant** that works alongside doctors during live patient consultations. Key characteristics:

- **Live Conversation Support**: The AI analyzes the ongoing doctor-patient dialogue as it happens, not as a post-consultation tool
- **Continuous Analysis Loop**: As new information emerges in the conversation, the AI continuously re-analyzes and updates its insights
- **Non-Intrusive Assistance**: Suggestions and insights are presented without interrupting the natural flow of conversation
- **Doctor-Driven Interaction**: The physician remains in full control, choosing which AI suggestions to explore or ignore
- **Progressive Refinement**: Each new patient response or symptom description triggers refined analysis, building a progressively clearer clinical picture
- **No "Final" State**: There is no concept of a "completed" analysis - the system provides ongoing support throughout the entire consultation

The workflow described below operates in a continuous loop, with each phase feeding back into the next as the conversation evolves.

## Session Workflow (Concise)

1. Patient and doctor converse; audio captured continuously.
2. Chunks sent to STT; transcript rebuilt server-side.
3. Client submits transcript to server with patient context and previous MoE analysis.
4. Symptoms extraction: AI extracts symptoms and physiologic signals as Symptom nodes.
5. Each symptom gets a stable unique ID; deduplication prevents duplicates across iterations.
6. Historical/contextual items (e.g., prior hypertension, family cardiac history) may be added as Symptom nodes labeled by origin (context vs transcript vs history).
7. If previous MoE generated questions, the transcript is scanned to detect answers and update statuses.
8. Newly discovered Symptoms and Answers stream to the client via SSE for display.
9. If neither Symptoms nor Answers changed, pause analysis and wait for new transcript.
10. If changed, run MoE to produce Diagnoses, Treatments, and new Questions (prove/disprove/redirect) with risk evaluation.
11. Each Diagnosis/Treatment gets a stable ID; build the map: [symptom] → [question] → [diagnosis] → [question] → [treatment] (1:N at each hop).
12. Treatments may be text recommendations, medications, and/or investigations to acquire new inputs (signals).
13. Nodes carry title, description, reasoning, priority, probability; links may include prioritized questions.
14. Return a Sankey-style JSON: column 1 Symptoms/Signals/History, column 2 Diagnoses, column 3 Treatments, with mid-path question nodes.
15. User actions: accept or suppress. Only one diagnosis and one treatment can be accepted at a time. Suppressed items are greyed and reprioritized using visible_priority = ai_priority / coefficient.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Input Layer"
        A[Audio Chunks] --> B[Speech-to-Text]
        B --> C[Transcript Builder with Medical Relevance Detection]
        C --> D[Transcript + Medical Relevance Metadata]
    end

    subgraph "Client-Side Decision"
        D --> Y[Client Receives Transcript]
        Y --> Z{Medical Content Detected?}
        Z -->|No: Small Talk| AA[Continue Monitoring]
        AA --> A
        Z -->|Yes: Medical Relevance| AB[Trigger MoE Analysis]
    end

    subgraph "Context Assembly System"
        AB --> E[Patient Documents]
        E --> F[Term-Based Search]
        G[Medical History] --> F
        H[Previous Analysis] --> F
        F --> I[Context Assembly]
        I --> J[Assembled Context]
    end

    subgraph "Enhanced Context Integration"
        J --> K[Input Extraction]
        K --> L{New Inputs?}
        L -->|No| M[Wait for Updates]
        L -->|Yes| N[Context-Aware Expert Analysis]
    end

    subgraph "Universal Multi-Layer QOM Pattern"
        N --> E[Expert Node]
        E --> D{Decision Point}
        D -->|Complete Analysis| O[Output: Symptoms + Diagnosis + Treatments + Questions]
        D -->|Needs Specialization| T[Trigger Additional Experts]
        T --> E2[Sub-Expert Node 1]
        T --> E3[Sub-Expert Node 2]
        E2 --> D2{Sub-Expert Decision}
        E3 --> D3{Sub-Expert Decision}
        D2 -->|Complete| O2[Sub-Analysis Output]
        D2 -->|More Specialization| T2[Trigger Deeper Experts]
        D3 -->|Complete| O3[Sub-Analysis Output]
        O --> M[Consensus Merger]
        O2 --> M
        O3 --> M
        M --> F[Final Medical Analysis]
    end

    subgraph "Concrete Example: Cardiology Case"
        N2 --> GP[GP Expert]
        GP --> GD{GP Decision}
        GD -->|Cardiac Symptoms Detected| CARD[Cardiology Expert]
        GD -->|Complete Primary Assessment| GPO[GP Analysis Output]
        CARD --> CD{Cardiology Decision}
        CD -->|Complex Arrhythmia| EP[Electrophysiology Expert]
        CD -->|Heart Failure| HF[Heart Failure Expert]
        CD -->|Standard Cardiac Analysis| CO[Cardiology Output]
        EP --> EPO[Electrophysiology Analysis]
        HF --> HFO[Heart Failure Analysis]
        GPO --> CM[Final Consensus Merger]
        CO --> CM
        EPO --> CM
        HFO --> CM
        CM --> FA[Final Analysis: All Symptoms + All Diagnoses + All Treatments + All Questions]
    end

    subgraph "Output Generation"
        T --> U[Unified Analysis]
        U --> V[Context-Enhanced Sankey]
        U --> W[SSE Updates]
        W --> X[Client UI]
    end
```

## Universal QOM Architecture Principles

### Core Expert Node Behavior

Every expert node in the QOM follows a universal pattern with two possible outcomes:

#### 1. Complete Analysis Output

When an expert determines it can provide a complete analysis, it outputs:

- **Symptoms**: Identified symptoms with confidence scores and sources
- **Diagnosis**: Differential diagnoses with probabilities and reasoning
- **Treatments**: Treatment recommendations with risk assessments
- **Questions**: Follow-up questions to prove/disprove/redirect diagnoses

#### 2. Trigger Additional Expert Analysis

When an expert identifies the need for specialized knowledge, it can:

- **Activate Specialist Experts**: Trigger domain-specific experts (cardiology, neurology, etc.)
- **Activate Functional Experts**: Trigger role-specific experts (safety monitor, drug interaction checker)
- **Pass Enriched Context**: Provide its preliminary analysis as additional input to sub-experts

### Dynamic Expert Selection Logic

```
Expert Decision Framework:
IF (case_complexity > expert_capability_threshold) THEN
    trigger_specialist_experts(domain_indicators)
ELSE
    return_complete_analysis(symptoms, diagnosis, treatments, questions)
END IF
```

### Multi-Layer Consensus Building

#### Layer-by-Layer Merging

- Each layer of experts produces analysis outputs
- Layer consensus mergers combine outputs from experts at the same level
- Final merger combines all layer outputs into unified medical analysis

#### Weighted Integration

- **Specialty Relevance**: Weight expert opinions based on case relevance
- **Confidence Scoring**: Higher confidence experts have more influence
- **Evidence Quality**: Well-supported recommendations get priority

#### Conflict Handling

- **Consensus Detection**: When >75% agreement exists, boost probabilities
- **Conflict Publication**: When experts disagree, publish all perspectives with conflict alerts
- **No Resolution**: Present conflicting diagnoses/treatments to clinician for discussion

### Expert Triggering Mechanisms

#### Symptom-Based Triggers

```yaml
trigger_conditions:
  cardiology: ["chest_pain", "shortness_of_breath", "palpitations", "syncope"]
  neurology: ["headache", "confusion", "weakness", "seizure"]
  emergency: ["severe_pain", "vital_sign_abnormality", "altered_consciousness"]
```

#### Context-Based Triggers

```yaml
context_triggers:
  geriatrics: "patient_age > 65"
  pediatrics: "patient_age < 18"
  obstetrics: "pregnancy_status = true"
  critical_care: "severity_score > high_threshold"
```

#### Dynamic Depth Control

- **Maximum Layers**: Prevent infinite expert recursion
- **Confidence Thresholds**: Only trigger sub-experts when needed
- **Cost Optimization**: Balance analysis depth with processing costs

## Detailed Workflow Steps

### Phase 1: Input Processing and Transcription

1. **Audio Capture and Chunking**

   - Patient-doctor conversation is captured in real-time
   - Audio is segmented into processable chunks
   - Voice Activity Detection (VAD) identifies speech segments

2. **Speech-to-Text Analysis**

   - Chunks are sent to transcription service (Whisper/AssemblyAI)
   - Speaker diarization identifies doctor vs patient
   - Timestamps and confidence scores are preserved

3. **Transcript Reconstruction with Medical Relevance Detection**

   - Individual chunks are assembled into coherent transcript
   - Speaker changes and pauses are marked
   - Medical terminology is validated and corrected
   - **Medical relevance classification** performed during assembly:
     - Lightweight ML model identifies medical content vs small talk
     - Relevance score (0-1) indicates medical significance
     - Categories detected: symptom_mention, medication_reference, medical_history, clinical_observation, small_talk
     - Trigger words/phrases extracted for client visibility
   - Transcript sent to client with medical relevance metadata for decision-making

3.5. **Transcript Output with Medical Relevance Metadata**

The reconstructed transcript is sent to the client with the following structure:

```json
{
  "sessionId": "session_id",
  "timestamp": "2024-03-15T14:25:00Z",
  "transcript": {
    "text": "Doctor: How are you feeling today?\nPatient: I've had a terrible headache for three days...",
    "speakers": ["doctor", "patient"],
    "duration": 120
  },
  "medicalRelevance": {
    "isRelevant": true,
    "confidence": 0.85,
    "categories": ["symptom_mention", "medication_reference"],
    "triggers": ["headache", "three days", "pain medication"],
    "requiresAnalysis": true
  }
}
```

4. **Client-Side Decision Point**

   - Client receives transcript with medical relevance metadata
   - If `medicalRelevance.isRelevant` is true and confidence > threshold:
     - Client triggers MoE analysis request
     - Proceeds to Context Integration (Step 5)
   - If small talk or low relevance:
     - Client continues transcript monitoring
     - MoE analysis is not triggered
     - Returns to Audio Capture (Step 1)

5. **Context Integration** (Triggered by Client)
   - Patient medical history is retrieved and attached
   - Previous MoE analyses from current session are included
   - Relevant medical records are incorporated
   - Family history and genetic factors are considered
   - Current medications and allergies are highlighted

### Phase 1.5: Intelligent Context Assembly (When Triggered by Client)

6. **Classification-Based Context Search**

   - Medical term extraction from current conversation content
   - Classification-based term matching using medical-expert-tools
   - Search across patient's encrypted medical documents using standardized medical terms
   - Identification of relevant historical consultations through term matching
   - Pattern recognition for recurring symptoms and treatment responses
   - Document categorization and relevance scoring without embeddings

   **Classification Approach Details:**

   - Uses `MedicalExpertTools.searchDocuments()` with extracted medical terms
   - Documents contain pre-classified medical terms arrays for efficient matching
   - Relevance calculated by term frequency and document type matching
   - No vector embeddings required - direct term-to-term comparison
   - Supports filtering by document types (lab-results, prescriptions, medical-records)
   - Returns structured results with relevance scores and metadata

7. **Context Assembly and Optimization**

   - Assembly of relevant medical context using ContextAssembler with term-based results
   - Document search using `searchDocumentsByTerms` method:
     - Medical terms extracted from conversation
     - Relevance scoring based on term matching frequency
     - Document type filtering (lab-results, medical-records, prescriptions, etc.)
     - Threshold-based filtering (default 0.6)
   - Extraction of key medical insights (findings, medications, procedures, risks)
   - Token optimization to fit within AI model limits (default 4000 tokens)
   - Confidence scoring for assembled context relevance
   - Structured sections: patient summary, relevant history, recent changes

8. **Context Enhancement with Medical Intelligence**
   - Clinical Data Platform (CDP) integration for structured medical data
   - Timeline construction of significant medical events
   - Risk factor analysis based on historical patterns
   - Treatment response patterns from previous consultations
   - Drug interaction and contraindication checks based on history

### Phase 2: Enhanced Analysis and Input Extraction

9. **Context-Aware Input Extraction**

   - LLM analyzes transcript enhanced with assembled context
   - Medical entities are identified with historical context awareness
   - Temporal patterns and severity indicators cross-referenced with history
   - Each input receives a unique ID to prevent duplicates
   - Context relevance scoring for each extracted input

10. **Input Enhancement with Assembled Context**

- Assembled context provides rich historical perspective
- Previous symptoms and treatments are automatically linked
- Chronic conditions and patterns are factored into analysis
- Historical inputs are clearly marked with origin tags:
  - `transcript`: Mentioned in current conversation
  - `history`: From medical records via context assembly
  - `context`: Inferred from semantic patterns
  - `previous`: From earlier in session
  - `assembled`: From context assembly system

11. **Question-Answer Evaluation with Context**

    - If MoE previously generated questions, scan for answers
    - Map patient responses to specific questions using context
    - Update question status (answered/pending/partial)
    - Extract follow-up information from answers
    - Context assembly informs question prioritization
    - Rephrased questions are matched to existing question nodes by semantic similarity; IDs persist and nodes are updated in place rather than recreated

12. **Real-time Client Updates with Context**
    - Send discovered inputs via SSE to client with context metadata
    - Update answer statuses in real-time
    - Provide context relevance indicators in UI
    - Stream context confidence scores

### Phase 3: Conditional MoE Analysis

13. **Change Detection with Context Awareness**

- Compare current inputs with previous analysis
- Check if answer set has changed
- Evaluate if new significant information emerged
- **Decision Point**:
  - No changes → Return to step 1 (wait for new transcript)
  - Changes detected → Proceed to MoE analysis

### Phase 4: QOM-Based Mixture of Experts Analysis

14. **Sequential Expert Node Execution**

    The system processes each transcript chunk through a query-oriented model (QOM) of specialized expert nodes. Each node receives the new transcript chunk plus the previous JSON output, enabling true conversational evolution.

    **Input**: New transcript chunk + Previous analysis JSON + Context
    **Output**: Enhanced JSON with incremental improvements and versioning

15. **Core Expert Node Definitions**

    **Node 1: transcript_parser**

    - **Role**: Parser and Structural Analyzer
    - **Input**: Raw transcript chunk with timestamps
    - **Processing**:
      - Extracts structured utterances with speaker identification
      - Preserves exact quotes with timestamps and confidence scores
      - Identifies speaker turns and conversation flow
      - Normalizes medical terminology and abbreviations
    - **Output**: Structured transcript segments ready for medical analysis
    - **Schema Impact**: Provides accurate quotes for symptom nodes

    **Node 2: symptom_extractor**

    - **Role**: Medical NER and Clinical Inference Engine
    - **Input**: Structured transcript + Previous symptoms + Context
    - **Processing**:
      - Identifies explicit symptoms and physiologic signals mentioned in conversation
      - Infers implied symptoms/signals from patient descriptions
      - Extracts severity indicators, duration, characteristics
      - Assigns stable unique IDs; deduplicates across iterations
      - Maps symptoms to appropriate source categories (transcript, medical_history/context, suspected)
      - Assigns confidence scores based on certainty of identification
    - **Output**: New SymptomNode entries with embedded metadata
    - **Schema Impact**: Populates nodes.symptoms array (signals are represented as SymptomNode items, optionally tagged via characteristics)

    **Node 3: diagnosis_mapper**

    - **Role**: Differential Diagnosis Engine
    - **Input**: Current symptoms + Previous diagnoses + Medical context
    - **Processing**:
      - Maps symptom constellations to possible diagnoses
      - Calculates probability scores using Bayesian reasoning
      - Considers epidemiological factors and patient demographics
      - Flags diagnoses for exclusion vs confirmation
      - Updates existing diagnosis probabilities based on new evidence
    - **Output**: Ranked differential diagnoses with reasoning
    - **Schema Impact**: Creates/updates nodes.diagnoses with probabilities and clinical reasoning

    **Node 4: treatment_recommender**

    - **Role**: Clinical Decision Support Engine
    - **Input**: Confirmed/probable diagnoses + Patient history + Previous treatments
    - **Processing**:
      - Suggests evidence-based treatments per diagnosis
      - Considers patient-specific factors (allergies, contraindications, preferences)
      - Ranks treatments by priority, effectiveness, and urgency
      - Evaluates treatment interactions and safety profiles
      - Accounts for previous treatment responses
    - **Output**: Prioritized treatment recommendations with detailed rationale
    - **Schema Impact**: Populates nodes.treatments with comprehensive treatment plans

    **Node 5: question_generator**

    - **Role**: Strategic Clinical Interrogator
    - **Input**: Current differential + Diagnostic uncertainty + Previous Q&A
    - **Processing**:
      - Generates targeted questions to disambiguate differential diagnoses
      - Creates confirmatory questions to strengthen high-probability diagnoses
      - Develops exclusionary questions to rule out serious conditions
      - Prioritizes questions by diagnostic yield and clinical impact
      - Avoids redundant questions from previous iterations
    - **Output**: Strategic questions with expected diagnostic impact
    - **Schema Impact**: Adds questions to nodes.actions with impact predictions

    **Node 6: warning_annotator**

    - **Role**: Clinical Risk and Safety Monitor
    - **Input**: Diagnoses + Treatments + Patient profile + Drug database
    - **Processing**:
      - Identifies drug interactions and contraindications
      - Flags red flag symptoms requiring immediate attention
      - Generates allergy and adverse reaction alerts
      - Monitors for critical condition development
      - Creates safety protocols and monitoring recommendations
    - **Output**: Prioritized safety alerts with action recommendations
    - **Schema Impact**: Adds safety alerts to nodes.actions with urgency levels

    **Node 7: relationship_builder**

    - **Role**: Semantic Graph Constructor
    - **Input**: All nodes from previous experts + Relationship ontology
    - **Processing**:
      - Creates semantic relationships between symptoms, diagnoses, and treatments
      - Assigns relationship types (supports, contradicts, treats, investigates, etc.)
      - Calculates relationship strength based on clinical evidence
      - Determines relationship direction (incoming/outgoing/bidirectional)
      - Provides clinical reasoning for each relationship
    - **Output**: Comprehensive relationship mappings
    - **Schema Impact**: Populates relationships arrays in all node types

    **Node 8: schema_merger**

    - **Role**: Version Control and Integration Engine
    - **Input**: New analysis + Previous JSON + Change tracking
    - **Processing**:
      - Merges new findings with existing schema structure
      - Updates confidence scores and probabilities
      - Tracks changes and increments analysisVersion
      - Maintains node ID consistency across iterations
      - Preserves user interactions and preferences
      - ID stability and minimal-diff updates (refinement-based, no semantic matching):
        - Generates/reuses stable IDs via canonicalization (normalize casing/units, lemmatize, strip stop-words) with anchor metadata (speaker, time window, category, ontology codes like ICD-10 when present)
        - For each existing node in previous analysis, the expert must output one explicit refinement action:
          - prove: increase confidence/priority, update reasoning/relationships
          - disprove: decrease confidence/priority, mark suppressed if appropriate
          - keep: preserve node unchanged
          - rephrase: update text/label without changing the node ID
          - remove: mark for removal; actual deletion deferred to cleaner hysteresis
        - Only explicit add creates a new node; otherwise update existing nodes in place to avoid visualization churn
        - Never delete immediately; mark suppressed/low-visibility and defer removal to cleaner hysteresis
    - **Output**: Integrated schema with version tracking
    - **Schema Impact**: Creates unified, versioned analysis output

    **Node 9: user_feedback_applier**

    - **Role**: Human-AI Interaction Processor
    - **Input**: Merged schema + User actions (suppress, accept, modify)
    - **Processing**:
      - Applies doctor's suppress/accept decisions to node visibility
      - Updates node states based on user feedback
      - Incorporates manual corrections and additions
      - Adjusts confidence scores based on clinical validation
      - Tracks user interaction patterns for learning
    - **Output**: User-validated analysis with interaction tracking
    - **Schema Impact**: Updates node states and userActions array

    **Node 10: node_cleaner**

    - **Role**: Relevance Filter and Optimization Engine
    - **Input**: User-validated schema + Relevance thresholds
    - **Processing**:
      - Removes obsolete or ruled-out diagnoses
      - Prunes low-confidence relationships
      - Eliminates duplicate or redundant suggestions
      - Optimizes schema size for visualization performance
      - Maintains critical information regardless of confidence
      - Hysteresis and anti-flap controls:
        - Confidence hysteresis (example: add above 0.55, remove below 0.45) to avoid churn
        - minRoundsToDelete: require a node to remain below thresholds for N consecutive iterations before removal
    - **Output**: Clean, optimized analysis ready for visualization
    - **Schema Impact**: Final pruned schema with optimal node set

    Additional execution utilities:

    - id_allocator_deduplicator: Generates stable IDs and removes duplicates across all node types.
    - change_detector_gate: Compares current Symptoms/Answers to the previous iteration and conditionally triggers MoE.

16. **QOM Execution Flow and Dependencies**

    **Sequential Dependencies:**

    ```
    transcript_parser → symptom_extractor → diagnosis_mapper
                                         ↓
    relationship_builder ← treatment_recommender
           ↓              ← question_generator
    schema_merger         ← warning_annotator
           ↓
    user_feedback_applier
           ↓
    node_cleaner → Enhanced JSON Output
    ```

    **Parallel Execution Opportunities:**

    - treatment_recommender, question_generator, and warning_annotator can run in parallel after diagnosis_mapper
    - relationship_builder waits for all parallel nodes to complete
    - Context assembly can run in parallel with transcript_parser

17. **Incremental Conversational Processing**

    **Version Control:**

    - Each iteration increments analysisVersion
    - Node IDs persist across conversations for tracking
    - Confidence scores evolve with new evidence
    - Relationship strengths adapt to clinical developments

    **Memory Management:**

    - Previous analysis provides conversational context
    - User actions influence subsequent reasoning
    - Clinical patterns learned from interaction history
    - Schema grows incrementally rather than rebuilding entirely

    **Real-time Adaptation:**

    - New symptoms modify existing diagnosis probabilities
    - Treatment recommendations adjust to patient responses
    - Questions evolve based on previous answers
    - Safety alerts adapt to changing clinical picture

    **Schema Integration:**

    - Node IDs persist across QOM executions for consistent tracking
    - relationships arrays populated by relationship_builder expert node
    - analysisVersion incremented by schema_merger for version control
    - userActions array maintained by user_feedback_applier expert node
    - Priority scale (1-10) consistent across all expert node outputs

### Phase 5: Structured Output Generation

18. **Schema-Driven Analysis Structure**

    - Each element receives a unique ID for tracking
    - All nodes contain embedded relationships arrays
    - Confidence scores and priorities are assigned using 1-10 scale

    **Unified Node Structure:**

    - All symptoms (current, historical, suspected) in single symptom array with source indicators:
      - `transcript`: From current conversation
      - `medical_history`: From patient records
      - `family_history`: From family medical history
      - `social_history`: From social/lifestyle factors
      - `medication_history`: From medication records
      - `suspected`: AI-suggested symptoms based on diagnoses
    - Questions and safety alerts unified in actions array with actionType field
    - Relationships embedded in each node with direction indicators
    - Priority scale: 1 (critical) to 10 (low) across all node types

    **a) Diagnosis Nodes**

    - Unique diagnosis ID (diag\_\*)
    - Short title (1-3 words)
    - Detailed description
    - Clinical reasoning
    - Priority level (1=critical to 10=low)
    - Probability score (0-1)
    - ICD-10 codes
    - Embedded relationships with other nodes

    **b) Treatment Nodes**

    - Unique treatment ID (treat\_\*)
    - Treatment type: medication, procedure, therapy, lifestyle, investigation, immediate
    - Treatment name and dosing details
    - Priority (1=critical to 10=low)
    - Risk assessment
    - Contraindications
    - Expected outcomes
    - Embedded relationships with diagnoses and symptoms

    **c) Action Nodes (Questions and Safety Alerts)**

    - Action ID (q*\* for questions, safety*\* for alerts)
    - Action text
    - Action type: "question" or "alert"
    - Category:
      - Questions: symptom_exploration, diagnostic_clarification, treatment_selection, risk_assessment
      - Alerts: drug_interaction, contraindication, allergy, warning, red_flag
    - Priority (1=critical to 10=low)
    - Status (pending/answered/acknowledged/skipped/resolved)
    - Expected impact on diagnosis probabilities
    - Embedded relationships with connected nodes

    Question semantics (aligns with ActionNode in visualization types):

    - actionType: "question"
    - category: symptom_exploration | diagnostic_clarification | treatment_selection | risk_assessment
    - displayPriority: numeric rank; only top items are expanded by default, others appear as small dots on the path until hovered/clicked
    - Answer handling (refinement-based):
      - The model receives previous questions with IDs and must choose one: prove, disprove, keep, rephrase, or remove
      - Updates are applied in place: set `status`, optional `answer`, and encode effects via `impact` and/or `relationships`
      - Prove/disprove effects: encode weight adjustments in `impact.yes/no` or `impact.diagnoses`
      - Redirect: add/update a relationship to the target node with `relationship: "investigates"`

19. **Embedded Relationship Mapping**

    - Each node contains its own relationships array with:
      - Target node ID
      - Relationship type (supports, contradicts, confirms, treats, etc.)
      - Direction (incoming/outgoing/bidirectional)
      - Strength/confidence score (0.0-1.0)
      - Clinical reasoning for relationship
    - Support complex diagnostic chains:
      ```
      [Symptom] ↔ [Action] ↔ [Diagnosis] ↔ [Action] ↔ [Treatment]
      ```
    - Track bidirectional evidence flows
    - No separate links array - all relationships embedded in nodes

20. **Risk and Safety Integration**
    - Evaluate treatment risks based on:
      - Patient medical history
      - Current medications
      - Allergies and adverse reactions
      - Age and demographics
      - Comorbidities
    - Flag high-risk combinations
    - Suggest safer alternatives
    - Include monitoring requirements

### Phase 6: Context-Enhanced Visualization and Delivery

21. **QOM-Enhanced Sankey Diagram Generation**

    - **Column 1**: Symptom nodes (current, historical, suspected) with source indicators
    - **Column 2**: Diagnosis nodes (sized by probability + context confidence)
    - **Column 3**: Treatment nodes (sized by priority + historical effectiveness)
    - **Between columns**: Action nodes (questions/alerts) for diagnostic chain modification

    **Context-Enhanced Visual Encoding**:

    - Node size: Reflects priority (1-10 scale) weighted by context relevance
    - Node color: Indicates urgency with context confidence overlay
      - Priority 1-2=red (critical), 3-4=orange (high), 5-6=yellow (medium), 7-10=green (low)
      - Context confidence shown as border thickness or pattern
    - Relationship visualization: Lines between nodes showing embedded relationships
      - Thickness shows relationship strength (0.0-1.0)
      - Style indicates direction (solid=bidirectional, arrow=directional)
    - Action nodes: Interactive elements showing questions and safety alerts
    - Suspected symptoms: Distinctive styling with "suspected" source indicator

22. **Progressive QOM Execution Streaming**

    - Stream individual expert node completions as they finish processing
    - Show real-time progress through the QOM execution pipeline:
      - transcript_parser → symptom_extractor → diagnosis_mapper (parallel) → relationship_builder → schema_merger → user_feedback_applier → node_cleaner
    - Update visualization incrementally as each expert contributes new nodes
    - Display loading states for pending expert nodes with estimated completion times
    - Prioritize critical findings (priority 1-2) for immediate streaming regardless of QOM position
    - Show dependency relationships visually while nodes are processing
    - Stream version updates (analysisVersion increments) with change highlights

23. **Interactive Features Enhanced with QOM Processing**
    - **Node Interaction with Expert Provenance:**
      - Click nodes to see which expert nodes contributed to their creation
      - View expert reasoning chain and confidence evolution across iterations
      - See QOM execution timestamps for each node's creation/modification
    - **Real-time QOM Execution Monitoring:**
      - Visual progress indicators showing current expert node processing
      - Hover over processing indicators to see expert node dependencies
      - Real-time updates as nodes flow through the QOM pipeline
    - **Enhanced Accept/Suppress with QOM Awareness:**
      - Accept: Triggers immediate re-processing through relevant expert nodes
      - Suppress: Updates node states and triggers downstream QOM re-evaluation
      - User actions influence subsequent QOM executions for incremental learning
      - Constraints: Only one diagnosis and one treatment can be accepted at a time
      - Suppression effect: visible_priority = ai_priority / coefficient (UI greys suppressed nodes and reduces size accordingly)
    - **Incremental Analysis Features:**
      - Version comparison: Compare analysisVersion iterations side-by-side
      - Change highlighting: Visual indicators for nodes modified in latest iteration
      - Conversation timeline: Scrub through analysis evolution over transcript chunks
    - **Advanced Relationship Exploration:**
      - Trace relationship creation back to specific expert nodes
      - Filter relationships by strength, direction, and expert provenance
      - Show relationship evolution over conversation iterations
    - **Expert Node Performance Metrics:**
      - Display processing time and confidence scores for each expert
      - Show expert node contribution statistics (nodes created/modified)
      - Performance optimization suggestions based on QOM execution patterns

## UI Design Implementation

### Layout Structure

1. **Two-Column Responsive Design**

   - Left panel (70%): Interactive Sankey diagram
   - Right panel (30%): Resizable sidebar
   - Mobile: Stacked layout with tabs

2. **Sidebar Tabs**

   - **Transcript Tab**:
     - Real-time conversation display
     - Speaker identification
     - Timestamp navigation
     - Answer highlighting
   - **Questions Tab**:
     - All generated questions listed
     - Priority sorting
     - Answer status indicators
     - Hover to highlight Sankey paths
     - Quick answer input
   - **Details Tab**:
     - Dynamic content based on selection
     - Node-specific information
     - Evidence chains
     - Expert reasoning
     - Medical references

3. **Real-time Updates**
   - SSE connection status indicator
   - Progressive expert completion badges
   - Animated transitions for new nodes
   - Toast notifications for critical findings

> **Implemented UI (2026-10-21):** `SessionMoeVisualizer.svelte` hosts `SankeyDiagram.svelte` and the `SessionSidebar` / `SessionTabs` with Transcript, Questions, Details, Symptoms, Diagnosis, Treatments and Legend tabs (`src/components/session/`). It renders the single-pass analysis output; `SessionMoeVisualizer` also embeds `QOMVisualizer` for the (simulated) expert graph.

# Part II — Universal QOM Expert Framework

The Universal QOM framework orchestrates multiple medical AI experts in a hierarchical, dynamically expanding structure. Any expert can either provide complete medical analysis (Symptoms, Diagnosis, Treatments, Questions) or trigger additional specialized experts for deeper analysis. The generic expert pattern, triggering rules and conflict handling are described in Part I ("Universal QOM Architecture Principles"); this part adds the AI-generated expert model, configuration and runtime sketches.

## Architecture Principles

1. **AI-by-AI Expert Generation**: Primary Analyzer uses AI logic to dynamically create specialized expert nodes via MCP tools
2. **Universal Statistical Output**: All nodes produce standardized statistical output for mathematical consensus building
3. **MCP Tool Integration**: Expert creation handled through Model Context Protocol tools with custom prompts and filtered context
4. **Dynamic QOM Structure**: Runtime QOM modification based on AI decisions, not predetermined flows
5. **Statistical Consensus Building**: Mathematical aggregation of expert outputs using probability weighting and confidence scores
6. **No Templates or Registries**: Purely AI-driven expert creation decisions based on case complexity

## AI-Generated Experts

### Enhanced Example: AI-Generated Expert Analysis QOM

```mermaid
graph TB
    subgraph "Layer 1: Primary Analysis"
        A[Transcript + Patient Context] --> B[GP Expert]
        B --> C{GP Decision}
        C -->|Generate Custom Experts| D["AI Creates:\n- Pediatric Cardio Expert\n- Drug Interaction Expert\n- Anxiety Assessment Expert"]
        C -->|Complete Primary Analysis| G[GP Analysis Output]
    end

    subgraph "Layer 2: AI-Generated Specialized Analysis"
        D --> E["Pediatric Cardiology Expert\n(Age 8, Heart Murmur Focus)"]
        D --> F["Polypharmacy Expert\n(12 Medications, Interactions)"]
        D --> H["Pediatric Anxiety Specialist\n(School-Age Mental Health)"]

        E --> I{Pediatric Cardio Decision}
        I -->|Needs Subspecialty| J["AI Creates:\nCongenital Heart Defect Expert\n(Custom: 8yo + murmur + family history)"]
        I -->|Standard Analysis| K[Pediatric Cardio Output]
    end

    subgraph "Layer 3: AI-Generated Sub-Specialty Analysis"
        J --> L["Congenital Heart Defect Expert:\nSymptoms + Diagnosis + Treatments + Questions"]
    end

    subgraph "Consensus Building"
        G --> M[Dynamic Consensus Merger]
        K --> M
        F --> M
        H --> M
        L --> M
        M --> N["Unified Analysis:\nAge-Appropriate Recommendations +\nDrug Safety Alerts +\nPsychosocial Considerations"]
    end
```

### Expert Node Categories

| Category                         | Expert Types                                    | Triggering Logic                          | Output Format                                             |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| **Primary Analyzers**            | GP, Initial Assessment, Symptom Analyzer        | Always Active                             | Symptoms + Initial Diagnosis + Custom Expert Instructions |
| **Pre-Configured Specialists**   | Cardiology, Neurology, Emergency                | Symptom/Context-Based Dynamic Triggering  | Specialized Analysis + Sub-Expert Triggers                |
| **AI-Generated Specialists**     | Custom experts created by AI analysis           | AI Decision-Based Dynamic Creation        | Patient-Specific Specialized Analysis                     |
| **AI-Generated Sub-Specialists** | Custom sub-experts for complex cases            | Created by AI Specialists when needed     | Highly Targeted Analysis                                  |
| **Functional Experts**           | Safety Monitor, Drug Interaction, Risk Assessor | Always Active or AI-Triggered             | Warnings + Contraindications + Safety Questions           |
| **Dynamic Consensus Mergers**    | Layer Merger, Final Merger                      | After AI-Generated Expert Groups Complete | Unified Analysis + Conflict Resolution                    |

### AI-Generated Expert Examples

| Patient Context                 | AI-Generated Expert               | Custom Prompt                                                                                                  | Focus Areas                                                      |
| ------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 85yo, 12 medications, dizziness | "Geriatric Polypharmacy Expert"   | "You are a geriatrician specializing in medication management for elderly patients with complex drug regimens" | Drug interactions, fall risk, cognitive effects                  |
| 6mo infant, seizures, fever     | "Pediatric Emergency Neurologist" | "You are a pediatric neurologist specializing in infant seizure disorders and febrile seizures"                | Infantile spasms, febrile seizures, developmental impact         |
| 28yo pregnant, palpitations     | "Maternal Cardiology Specialist"  | "You are an obstetrician-cardiologist specializing in cardiac conditions during pregnancy"                     | Pregnancy-safe treatments, fetal impact, postpartum care         |
| 45yo diabetic, chest pain       | "Diabetic Cardiology Expert"      | "You are a cardiologist with expertise in diabetic cardiovascular complications"                               | Silent MI risk, diabetic cardiomyopathy, medication interactions |

### Universal Expert Interface

Every expert node, regardless of category, follows this interface:

```typescript
interface UniversalExpertNode {
  // Input Interface
  inputs: {
    transcript: string;
    patientContext: PatientContext;
    previousAnalysis?: MedicalAnalysis;
    triggerConditions?: string[];
  };

  // Decision Logic - Enhanced for AI-Generated Experts
  decision:
    | "complete_analysis"
    | "trigger_sub_experts"
    | "generate_custom_experts";

  // Output Interface (when complete_analysis)
  outputs?: {
    symptoms: SymptomNode[];
    diagnoses: DiagnosisNode[];
    treatments: TreatmentNode[];
    questions: QuestionNode[];
    confidence: number;
    reasoning: string;
  };

  // Sub-Expert Triggering (when trigger_sub_experts) - Pre-configured experts
  triggers?: {
    subExperts: string[]; // Pre-defined expert types: 'cardiology', 'neurology'
    triggerConditions: string[];
    enrichedContext: any;
  };

  // AI-Generated Expert Creation (when generate_custom_experts)
  customExperts?: {
    experts: CustomExpertDefinition[];
    reasoning: string;
    parallelExecution: boolean;
  };
}

// NEW: AI-Generated Expert Definition
interface CustomExpertDefinition {
  id: string; // Generated unique ID: 'pediatric_cardio_expert_001'
  name: string; // Human-readable: 'Pediatric Cardiology Expert'
  expertPrompt: string; // Custom AI prompt: 'You are a pediatric cardiologist specializing in...'
  specialization: string; // Domain: 'pediatric_cardiology', 'geriatric_pharmacology'
  focusAreas: string[]; // ['congenital_heart_defects', 'pediatric_arrhythmia']
  contextInstructions: string; // 'Focus on age-appropriate assessment for 8-year-old patient'
  patientSpecificContext: any; // Filtered patient data relevant to this expert
  priority: "low" | "medium" | "high" | "critical";
  expectedOutputs: string[]; // ['risk_assessment', 'treatment_recommendations', 'follow_up_questions']
  parentExpert: string; // Which expert created this one
  creationReasoning: string; // Why this expert was deemed necessary
}
```

## Configuration Structure

> **Reality check:** the `universal_dag_models` section below was never added to `src/lib/config/models.yaml`. The expert template that exists is `src/lib/config/qom-default.json` (id `universal_medical_qom_v1`), and it is only consumed by the visualisation/simulation. Model names such as `gpt4` / `gpt3_5` are illustrative.

### Proposed Universal QOM Configuration (models.yaml)

```yaml
# models.yaml - Universal QOM Configuration Framework
universal_dag_models:
  # Define reusable expert node templates
  expert_templates:
    quorum_manager:
      type: "primary"
      execution: "always_active"
      outputs: ["symptoms", "diagnoses", "trigger_conditions"]
      decision_logic: "complexity_threshold_check"

    specialist_expert:
      type: "specialist"
      execution: "trigger_based"
      outputs: ["symptoms", "diagnoses", "treatments", "questions"]
      decision_logic: "specialization_depth_check"

    functional_expert:
      type: "functional"
      execution: "conditional"
      outputs: ["alerts", "contraindications", "safety_questions"]
      decision_logic: "safety_completeness_check"

    consensus_merger:
      type: "merger"
      execution: "after_layer_complete"
      outputs: ["unified_analysis", "conflict_alerts"]
      logic: "weighted_consensus_building"

  # Concrete QOM Model Examples
  dag_models:
    chest_pain_assessment:
      id: "chest_pain_dag_v1"
      description: "Multi-layer chest pain differential diagnosis"

      # Layer 1: Primary Analysis
      primary_layer:
        gp_expert:
          template: "quorum_manager"
          provider: "openai"
          model: "gpt4"
          triggers:
            cardiology: ["chest_pain", "shortness_of_breath", "palpitations"]
            pulmonology: ["cough", "chest_tightness", "breathing_difficulty"]
            emergency:
              ["severe_chest_pain", "crushing_pain", "radiation_to_arm"]
          complexity_threshold: 0.7

      # Layer 2: Specialist Analysis
      specialist_layer:
        cardiology_expert:
          template: "specialist_expert"
          provider: "openai"
          model: "gpt4"
          parent: "gp_expert"
          trigger_conditions: ["cardiology"]
          sub_expert_triggers:
            electrophysiology: ["arrhythmia", "palpitations", "syncope"]
            heart_failure: ["shortness_of_breath", "edema", "fatigue"]
            interventional: ["st_elevation", "acute_mi", "unstable_angina"]
          specialization_threshold: 0.8

        pulmonology_expert:
          template: "specialist_expert"
          provider: "openai"
          model: "gpt4"
          parent: "gp_expert"
          trigger_conditions: ["pulmonology"]
          sub_expert_triggers: {}

        emergency_expert:
          template: "specialist_expert"
          provider: "openai"
          model: "gpt4"
          parent: "gp_expert"
          trigger_conditions: ["emergency"]
          priority: "critical"

      # Layer 3: Sub-Specialist Analysis
      sub_specialist_layer:
        electrophysiology_expert:
          template: "specialist_expert"
          provider: "openai"
          model: "gpt4"
          parent: "cardiology_expert"
          trigger_conditions: ["electrophysiology"]

        heart_failure_expert:
          template: "specialist_expert"
          provider: "openai"
          model: "gpt4"
          parent: "cardiology_expert"
          trigger_conditions: ["heart_failure"]

      # Always Active Functional Experts
      functional_layer:
        safety_monitor:
          template: "functional_expert"
          provider: "openai"
          model: "gpt4"
          execution: "always_active"
          priority: "critical"

      # Consensus Building
      consensus_layer:
        layer_merger:
          template: "consensus_merger"
          provider: "openai"
          model: "gpt4_turbo"
          inputs: ["all_specialist_outputs", "all_functional_outputs"]
          weight_calculation:
            specialty_relevance: 0.4
            confidence_score: 0.3
            evidence_quality: 0.3
          consensus_threshold: 0.75
          conflict_threshold: 0.4

  # Dynamic Behavior Configuration
  behavior_rules:
    triggering_logic:
      symptom_mapping:
        chest_pain: ["cardiology", "emergency", "pulmonology"]
        headache: ["neurology", "emergency"]
        abdominal_pain: ["gastroenterology", "surgery", "emergency"]

      context_mapping:
        age_over_65: ["geriatrics"]
        age_under_18: ["pediatrics"]
        pregnancy: ["obstetrics"]
        multiple_medications: ["clinical_pharmacology"]

    consensus_rules:
      agreement_boost: 0.15 # Boost probability when consensus exists
      conflict_alert_threshold: 0.4 # Generate alert when disagreement > 40%
      max_layer_depth: 4 # Prevent infinite recursion

    cost_optimization:
      simple_cases_model: "gpt3_5" # Use cheaper model for straightforward cases
      complex_cases_model: "gpt4" # Use premium model for complex analysis
      critical_safety_model: "gpt4" # Always use best model for safety
```

## Runtime Interfaces (proposed)

### TypeScript Runtime Interfaces

```typescript
// Universal QOM runtime configuration
interface UniversalQOMRuntime {
  dagModel: QOMModel;
  expertTemplates: Map<string, ExpertTemplate>;
  behaviorRules: BehaviorRules;
  executionState: QOMExecutionState;
}

interface QOMModel {
  id: string;
  description: string;
  layers: Map<string, ExpertLayer>;
  dependencies: Map<string, string[]>;
  consensusStrategy: ConsensusStrategy;
}

interface ExpertTemplate {
  type: "primary" | "specialist" | "functional" | "merger";
  execution:
    | "always_active"
    | "trigger_based"
    | "conditional"
    | "after_layer_complete";
  outputs: string[];
  decisionLogic: string;
  modelConfig: ModelConfiguration;
}

interface ExpertNode {
  id: string;
  template: string;
  parent?: string;
  triggerConditions: string[];
  subExpertTriggers: Map<string, string[]>;
  thresholds: {
    complexity?: number;
    specialization?: number;
    confidence?: number;
  };
}

interface MedicalAnalysisOutput {
  symptoms: SymptomNode[];
  diagnoses: DiagnosisNode[];
  treatments: TreatmentNode[];
  questions: QuestionNode[];
  confidence: number;
  reasoning: string;
  expertId: string;
  layer: number;
}

// Question nodes align to UI ActionNode (actionType='question'); answers deduced from transcript iterations
interface QuestionNode {
  id: string; // q_*
  text: string;
  actionType: "question";
  category:
    | "symptom_exploration"
    | "diagnostic_clarification"
    | "treatment_selection"
    | "risk_assessment";
  priority: number; // displayPriority
  status: "pending" | "answered" | "acknowledged" | "skipped" | "resolved";
  relationships?: Relationship[];
  impact?: {
    diagnoses?: Record<string, number>;
    yes?: Record<string, number>;
    no?: Record<string, number>;
  };
  answer?: string;
  // Optional internal hint for runtime behavior
  qType?: "prove" | "disprove" | "redirect";
}

interface Relationship {
  nodeId: string;
  type: "supports" | "contradicts" | "confirms" | "treats" | "investigates";
  direction: "incoming" | "outgoing" | "bidirectional";
  strength: number; // 0.0-1.0
  reasoning?: string;
}

interface ConsensusResult {
  unifiedAnalysis: MedicalAnalysisOutput;
  consensusItems: ConsensusItem[];
  conflictAlerts: ConflictAlert[];
  participatingExperts: string[];
  agreementScore: number;
}

interface ConflictAlert {
  type:
    | "diagnosis_conflict"
    | "treatment_conflict"
    | "question_priority_conflict";
  conflictingExperts: string[];
  conflictingItems: any[];
  severity: "low" | "medium" | "high";
  recommendedAction: string;
}

// Dynamic QOM execution engine
export class UniversalQOMExecutor {
  async executeQOM(
    transcript: string,
    patientContext: PatientContext,
    dagModelId: string,
    previousAnalysis?: MedicalAnalysisOutput,
  ): Promise<ConsensusResult> {
    const dagModel = this.loadQOMModel(dagModelId);
    const executionPlan = this.buildExecutionPlan(dagModel);

    let layerResults = new Map<string, MedicalAnalysisOutput[]>();

    // Execute layers sequentially, experts within layers in parallel
    for (const layer of executionPlan.layers) {
      const layerOutputs = await this.executeLayer(
        layer,
        transcript,
        patientContext,
        previousAnalysis,
        layerResults,
      );
      layerResults.set(layer.id, layerOutputs);
    }

    // Build final consensus
    return this.buildConsensus(layerResults, dagModel.consensusStrategy);
  }

  private async executeLayer(
    layer: ExpertLayer,
    transcript: string,
    patientContext: PatientContext,
    previousAnalysis?: MedicalAnalysisOutput,
    previousLayers?: Map<string, MedicalAnalysisOutput[]>,
  ): Promise<MedicalAnalysisOutput[]> {
    const activeExperts = this.determineActiveExperts(layer, previousLayers);
    const expertPromises = activeExperts.map((expert) =>
      this.executeExpert(expert, transcript, patientContext, previousAnalysis),
    );

    return Promise.all(expertPromises);
  }

  private async executeExpert(
    expert: ExpertNode,
    transcript: string,
    patientContext: PatientContext,
    previousAnalysis?: MedicalAnalysisOutput,
  ): Promise<MedicalAnalysisOutput> {
    // Execute expert analysis
    const analysis = await this.runExpertAnalysis(expert, {
      transcript,
      patientContext,
      previousAnalysis,
    });

    // Check if expert wants to trigger sub-experts
    if (analysis.decision === "trigger_sub_experts") {
      const subExperts = this.getTriggeredSubExperts(expert, analysis);
      const subAnalyses = await this.executeSubExperts(subExperts, {
        transcript,
        patientContext,
        parentAnalysis: analysis,
      });

      // Merge parent and sub-expert analyses
      return this.mergeAnalyses([analysis, ...subAnalyses]);
    }

    return analysis;
  }
}
```

### LangGraph Integration (proposed, not built)

```typescript
// dag-executor.ts - Execute QOM using LangGraph

import { StateGraph } from "@langchain/langgraph";
import { EnhancedAIProvider } from "$lib/ai/providers/enhanced-abstraction";
import { buildQOMRuntime } from "./dag-runtime";

export async function executeQOM(
  sessionId: string,
  transcript: string,
  context?: any,
) {
  const dag = buildQOMRuntime();

  // Change gate: skip MoE when Symptoms/Answers unchanged
  if (!(await shouldAnalyze(sessionId, transcript, context))) {
    return { skipped: true, reason: "no_changes" } as any;
  }
  const workflow = new StateGraph<QOMState>({
    channels: createStateChannels(dag),
  });

  // Add nodes dynamically from configuration
  dag.nodes.forEach((nodeConfig, nodeId) => {
    workflow.addNode(nodeId, createNodeExecutor(nodeConfig));
  });

  // Add edges based on dependencies
  dag.nodes.forEach((nodeConfig, nodeId) => {
    if (nodeConfig.dependencies.length === 0) {
      workflow.addEdge("__start__", nodeId);
    } else {
      nodeConfig.dependencies.forEach((depId) => {
        workflow.addEdge(depId, nodeId);
      });
    }
  });

  // Execute workflow
  const result = await workflow.compile().invoke({
    sessionId,
    transcript,
    context,
  });

  return result;
}

function createNodeExecutor(nodeConfig: QOMNode) {
  return async (state: QOMState) => {
    const startTime = Date.now();

    // Emit node started event
    emitSSE({
      type: "node_started",
      nodeId: nodeConfig.id,
      model: nodeConfig.model,
      provider: nodeConfig.provider,
    });

    try {
      // Execute with configured model
      const provider = EnhancedAIProvider.getInstance();
      const result = await provider.executeWithModel(
        nodeConfig.provider,
        nodeConfig.model,
        {
          temperature: nodeConfig.modelConfig.temperature,
          maxTokens: nodeConfig.modelConfig.maxTokens,
          timeoutMs: nodeConfig.modelConfig.timeoutMs,
        },
        state[nodeConfig.id + "_input"],
      );

      // Emit completion
      emitSSE({
        type: "node_completed",
        nodeId: nodeConfig.id,
        duration: Date.now() - startTime,
        cost: result.cost,
      });

      return {
        [nodeConfig.id + "_output"]: result.data,
      };
    } catch (error) {
      // Handle fallback
      if (nodeConfig.fallbackChain.length > 0) {
        return executeWithFallback(nodeConfig, state);
      }
      throw error;
    }
  };
}
```

### SSE Event System (proposed)

#### Simple Event Types

```typescript
// sse-events.ts - Minimal SSE event definitions

type QOMEvent =
  | NodeStartedEvent
  | NodeProgressEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | ModelSwitchedEvent
  | QOMCompletedEvent;

interface NodeStartedEvent {
  type: "node_started";
  nodeId: string;
  nodeName: string;
  model: string;
  provider: string;
  timestamp: number;
}

interface NodeProgressEvent {
  type: "node_progress";
  nodeId: string;
  percent: number;
  message?: string;
}

interface NodeCompletedEvent {
  type: "node_completed";
  nodeId: string;
  duration: number;
  cost: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

interface NodeFailedEvent {
  type: "node_failed";
  nodeId: string;
  error: string;
  willRetry: boolean;
  fallbackModel?: string;
}

interface ModelSwitchedEvent {
  type: "model_switched";
  nodeId: string;
  fromModel: string;
  toModel: string;
  reason: string;
}

interface QOMCompletedEvent {
  type: "dag_completed";
  totalDuration: number;
  totalCost: number;
  nodeCount: number;
  successCount: number;
  failureCount: number;
}

// SSE emitter
export function emitSSE(event: QOMEvent) {
  const sseClient = getSSEClient();
  sseClient.send(JSON.stringify(event));
}
```

## Visualisation

The originally proposed hand-written D3 component and `dag-visualization.json` were superseded by the implemented `src/components/session/QOMVisualizer.svelte`, which renders D3 nodes/links from `d3QOMData` in `src/lib/session/stores/qom-execution-store.ts`, fed by `src/lib/session/qom/qom-event-processor.ts` and laid out by `dynamic-layout-engine.ts`. QOM event and D3 node types live in `src/components/session/types/qom.d.ts`.

### D3 Force-Directed Bidirectional Visualization (target)

The Universal QOM will be visualized using **D3 force-directed graphs** to show the bidirectional nature of expert collaboration:

- **Forward Flow**: Experts trigger sub-experts (blue solid links with animated particles)
- **Reverse Flow**: Sub-experts refine parent analysis (red dashed links with reverse particles)
- **Interactive Exploration**: Hover nodes to highlight bidirectional relationships and trace information flow
- **Real-Time Updates**: Nodes pulse and change color as QOM executes, showing expert triggering and refinement cycles
- **Natural Clustering**: Force simulation groups experts by specialty with automatic layout adjustment as new experts spawn

Example: GP Expert → triggers → Cardiology Expert → triggers → Electrophysiology Expert → refines back → Cardiology → refines back → GP → all contribute → Consensus Merger with bidirectional feedback loops.

## MCP Tool Integration and Statistical Consensus (proposed)

### Core Philosophy: AI-by-AI Expert Generation

The fundamental breakthrough in this architecture is **AI systems creating other AI systems** based on analytical need rather than predetermined templates. The Primary Analyzer doesn't follow a registry of possible experts - it intelligently determines what expertise the case requires and dynamically creates custom expert nodes.

**Key Principles:**

1. **Intelligence Creates Intelligence**: AI analyzes case complexity and generates specialized AI experts with custom prompts, context, and focus areas
2. **Patient-Specific Expertise**: Every expert is tailored to the unique combination of patient factors (age, conditions, medications, history)
3. **No Predetermined Limits**: System can create any combination of medical expertise (e.g., "Pediatric Diabetic Cardiologist for 8-year-old with Type 1 diabetes")
4. **Transparent Reasoning**: Each expert creation includes clear reasoning for why this specific expertise was deemed necessary

### MCP Tool Philosophy

Model Context Protocol (MCP) tools enable the Primary Analyzer to:

- **Create Custom Expert Nodes**: Generate new QOM nodes with specialized prompts and filtered context
- **Design Expert Interactions**: Define how new experts connect to existing analysis flow
- **Optimize Resource Usage**: Create only the experts needed, with appropriate model selection and cost estimation

### Universal Statistical Output for Consensus Building

All experts (pre-configured and AI-generated) produce standardized statistical output enabling mathematical consensus building:

**Statistical Foundation:**

- Every medical finding includes probability distributions and confidence intervals
- Uncertainty quantification across all analysis dimensions
- Evidence quality scoring for consensus weighting
- Temporal relevance and scope coverage metrics

**Consensus Mathematics:**

- Bayesian probability fusion across multiple expert perspectives
- Dempster-Shafer evidence theory for conflict resolution
- Dynamic expert weighting based on relevance, confidence, and evidence quality
- Automated conflict detection and resolution strategies

### Benefits of AI-Generated Expert Architecture

**Adaptive Intelligence:**

- System learns optimal expert combinations from each case
- No static limits on medical specialization depth
- Intelligent resource allocation based on case complexity

**Medical Accuracy:**

- Multiple specialized perspectives reduce diagnostic blind spots
- Conflict resolution through mathematical consensus building
- Transparent reasoning and evidence weighting

**Scalability:**

- New medical domains automatically supported through AI generation
- Cost-efficient expert creation only when genuinely needed
- Self-improving system through expert generation pattern learning

### Example: Primary Analyzer Output

```typescript
const primaryAnalyzerOutput = {
  decision: 'generate_custom_experts',
  reasoning: 'Complex pediatric case requiring specialized expertise',
  customExperts: [
    {
      id: 'pediatric_cardio_expert_001',
      name: 'Pediatric Cardiology Expert',
      expertPrompt: 'You are a pediatric cardiologist with 20+ years experience. Focus on innocent vs pathological murmurs in school-age children. Consider family history and physical exam findings.',
      specialization: 'pediatric_cardiology',
      focusAreas: ['innocent_murmurs', 'congenital_heart_disease', 'family_history_assessment'],
      contextInstructions: 'Patient is 8 years old with grade 2/6 systolic murmur detected during school physical. No symptoms reported.',
      priority: 'medium',
      creationReasoning: 'Pediatric heart murmur requires age-specific expertise for proper assessment'
    }
  ]
};
```

## Implementation Checklist

> Annotated 2026-10-21. "Simulation only" means the behaviour is scripted in `src/lib/session/qom/qom-simulation.ts` for the visualiser; no real AI experts run.

### Phase 1: AI-Generated Expert System ✅

- [x] Define Universal Expert Interface with custom expert generation
- [x] Create CustomExpertDefinition interface
- [x] Design AI-generated expert examples
- [x] Update QOM visualization concept for dynamic experts

### Phase 2: Dynamic Expert Creation Engine

- [ ] Implement AI expert generation logic in Primary Analyzer
- [ ] Create custom expert prompt construction system
- [ ] Build patient-specific context filtering
- [ ] Add dynamic expert ID and naming system

### Phase 3: Enhanced Simulation & Visualization

- [x] Update simulation to demonstrate AI-generated experts (simulation only: `qom-simulation.ts`)
- [x] Create dynamic QOM layout for emerging expert nodes (`dynamic-layout-engine.ts`)
- [ ] Implement real-time expert creation visualization
- [ ] Add expert creation reasoning display

### Phase 4: Advanced Multi-Expert Consensus Building

- [ ] Build parallel expert execution engine
- [ ] Implement multiple perspective consensus algorithms
- [ ] Create expert disagreement analysis and resolution
- [ ] Add confidence scoring based on expert agreement
- [ ] Develop risk-stratified consensus strategies
- [ ] Implement tie-breaking mechanisms for expert conflicts

### Phase 5: Production Integration

- [ ] Integrate with EnhancedAIProvider for custom expert execution (provider exists: `src/lib/ai/providers/enhanced-abstraction.ts`)
- [ ] Add cost tracking for dynamic expert creation
- [ ] Implement expert creation audit logging
- [ ] Performance optimization for parallel AI-generated experts
