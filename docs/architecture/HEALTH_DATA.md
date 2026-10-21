# Health Data Platform: Flat Meta-History Entries with Hybrid Time-Series Storage

> **Status:** Partial · **Type:** Spec · **Verified:** 2026-10-21
> **Built:** `src/lib/health/meta-history-types.ts`, `src/lib/health/meta-history-storage.ts`, `src/lib/health/signals.ts` (`processHealthData`), called from `src/lib/import/finalizer.ts` · **Pending:** device/wearable time-series ingestion, query filters beyond entry type, time-series querying and compression, clinical intelligence, LangGraph aggregate phases, MoE expert access

This document merges the former `META_HISTORIES.md` and `docs/CLINICAL_DATA_PLATFORM.md` (the "Clinical Data Platform", CDP). Both described the same system. Part I covers what is built. Part II covers the design that is still pending.

## Overview

Mediqom treats all medical information as **discrete, timestamped events with clinical context** (meta-history entries). It stores them in a **flat, filterable structure** that sits alongside the existing health-signals system (`src/lib/health/`). A hybrid storage strategy covers both discrete medical events and high-frequency device data.

**What the unified model enables:**

- **Comprehensive timeline**: the complete medical history in chronological order
- **Cross-domain analysis**: correlations between medications, labs, vitals and outcomes
- **Real-time integration**: continuous monitoring devices (pending)
- **Clinical intelligence**: pattern detection and predictive analytics (pending)

**Key objectives:**

1. A flat, filterable structure for all medical data types
2. Hybrid storage for high-frequency time-series data (medical devices, wearables)
3. Efficient querying and analysis across all patient data
4. Real-time medical device integration with intelligent archival
5. Compatibility with the existing encryption, sharing and migration systems
6. Integration with LangGraph report generation and MoE expert systems

---

# Part I: Implemented Core

## Code Map

```
src/lib/health/
├── meta-history-types.ts      # Entry types, documents, thresholds, query interface
├── meta-history-storage.ts    # insertMetaHistoryEntries(), queryMetaHistory()
├── signals.ts                 # processHealthData() (alias updateSignals): ingestion + legacy signals
├── definitions.json           # Signal definitions and mappings
└── properties.json            # Display and localization
```

Tests: `src/lib/health/meta-history-storage.test.ts`, `src/lib/health/signals.test.ts`.

## Flat Entry Model

All medical data is stored as individual entries with flexible categorization. The interface below matches `MetaHistoryEntry` and `MetaHistoryEntryType` in `src/lib/health/meta-history-types.ts`.

```typescript
// Core Meta History Entry Structure
interface MetaHistoryEntry {
  // Core identifiers
  entryId: string;
  patientId: string;
  entryType: MetaHistoryEntryType;

  // Temporal data
  timestamp: string;
  timeRange?: { start: string; end: string };

  // The actual data (varies by type)
  data: any; // Type-specific medical data

  // Metadata for filtering and searching
  tags: string[];
  category: string;
  subcategory?: string;

  // Clinical metadata
  clinicalSignificance?: "critical" | "high" | "medium" | "low";
  confidence: number; // 0-1 scale

  // Relationships and references
  relatedEntries?: string[]; // IDs of related entries
  sourceDocumentIds: string[];

  // Search and analysis
  searchableText?: string;
  embedding?: number[]; // Unused: embeddings were dropped (see ../plans/CONTEXT_ROADMAP.md)
}

// Comprehensive Entry Types
enum MetaHistoryEntryType {
  // Medications
  MEDICATION_CURRENT = "medication_current",
  MEDICATION_HISTORICAL = "medication_historical",
  MEDICATION_ADHERENCE = "medication_adherence",
  MEDICATION_EFFECTIVENESS = "medication_effectiveness",
  ADVERSE_REACTION = "adverse_reaction",

  // Unified Measurements (all physiological measurements)
  MEASUREMENT_VITAL = "measurement_vital", // BP, HR, temp, etc.
  MEASUREMENT_LAB = "measurement_lab", // Blood tests, urinalysis
  MEASUREMENT_POC = "measurement_poc", // Point-of-care tests
  MEASUREMENT_DEVICE = "measurement_device", // Wearable/smart device data
  MEASUREMENT_PATIENT = "measurement_patient", // Patient-reported measures

  // Clinical events
  DIAGNOSIS = "diagnosis",
  PROCEDURE = "procedure",
  SYMPTOM = "symptom",
  CLINICAL_EVENT = "clinical_event",

  // Risk and patterns
  RISK_FACTOR = "risk_factor",
  CLINICAL_PATTERN = "clinical_pattern",
  CORRELATION = "correlation",

  // Allergies and reactions
  ALLERGY = "allergy",

  // Social and behavioral
  SOCIAL_DETERMINANT = "social_determinant",
  BEHAVIORAL_FACTOR = "behavioral_factor",

  // Preventive care
  SCREENING = "screening",
  VACCINATION = "vaccination",
  PREVENTION_RECOMMENDATION = "prevention_recommendation",
}
```

**Entry types actually produced today** (`convertExtractedDataToMetaEntries()` in `signals.ts`): `medication_current`, `medication_historical`, `adverse_reaction`, `measurement_lab`, `measurement_vital`, `diagnosis`, `allergy`, `procedure`. The other types are defined but nothing writes them yet.

## Storage: Three Tiers on Encrypted Documents

Meta-history data has no separate database. It reuses the **existing encrypted document store** (`addDocument` / `updateDocument` from `$lib/documents`). Every tier is therefore AES-encrypted and shareable through the normal document and key-sharing system. Documents are `DocumentType.internal` and are told apart by `metadata.category`:

| Tier | `metadata.category` | Content | Notes |
| --- | --- | --- | --- |
| 1. Active entries | `meta_history_entries` | One document per profile holding the `entries[]` array | New entries are appended. Medications, diagnoses, allergies and procedures land here |
| 2. Current data (hot) | `meta_history_current` | One document per profile and measurement type: recent `rawPoints`, `statistics` (last/mean/min/max/stdDev/trend) | Used only when the measurement type has an entry in `MEASUREMENT_THRESHOLDS` |
| 3. Historical archives | `meta_history_archive` | Older points split off when `maxPoints` or `maxAge` is exceeded (the current tier keeps 70% of `maxPoints`) | Multi-resolution `compressedData` is a stub (see Known Gaps) |

**Routing:** `insertMetaHistoryEntries()` splits entries by type. Anything whose `entryType` starts with `measurement_` goes to the time-series path, keyed by `data.measurementType` or the normalized `data.test` name. Everything else goes to the entries document. `MEASUREMENT_THRESHOLDS` currently defines only `heart_rate`, `blood_glucose` and `daily_weight`. A measurement with no threshold (most lab tests) falls back to the regular entries document.

### Hybrid Storage Types

These interfaces live in `meta-history-types.ts`. The storage code fills the current-data `statistics` and `rawPoints`. Anomalies, summaries and preserved clinical features are defined but not populated yet.

```typescript
// Current Document (Hot Data) - Recent high-resolution data
interface CurrentDataDocument {
  patientId: string;
  measurementType: string; // e.g., "heart_rate", "blood_glucose", "stress_level"

  // Recent raw data with configurable thresholds
  currentData: {
    rawPoints: TimeSeriesPoint[];

    // Real-time statistics
    statistics: {
      last: number;
      mean: number;
      min: number;
      max: number;
      stdDev: number;
      trend: "rising" | "falling" | "stable";
    };

    // Detected anomalies in current window
    anomalies: Anomaly[];
  };

  // Archival configuration
  thresholds: MeasurementThreshold;

  // Quick-access summaries
  recentSummaries: {
    hourly: SummaryPoint[]; // Last 24 hours
    daily: SummaryPoint[]; // Last 30 days
  };

  // References to archived data
  historicalReferences: HistoryReference[];
}

// Historical Document (Archived Data) - Compressed older data
interface HistoricalDataDocument {
  documentId: string;
  patientId: string;
  measurementType: string;
  timeRange: { start: string; end: string };

  // Multi-resolution compressed data
  compressedData: {
    // Raw data (if preserved for clinical significance)
    raw?: CompressedTimeSeries;

    // Downsampled summaries
    minutely?: SummaryPoint[];
    fiveMinute?: SummaryPoint[];
    hourly: SummaryPoint[];
    daily: SummaryPoint[];
  };

  // Preserved clinical features
  preservedFeatures: {
    anomalies: Anomaly[];
    patterns: ClinicalPattern[];
    clinicalEvents: ClinicalEvent[];
  };
}

// Configurable thresholds per measurement type
interface MeasurementThreshold {
  measurementType: string;

  // When to archive current data
  archivalTriggers: {
    maxPoints: number; // e.g., 2,016 for glucose, 86,400 for heart rate
    maxAge: string; // e.g., "24h", "48h", "7d"
    maxSizeBytes: number; // e.g., 1MB, 5MB
  };

  // Sampling strategy
  sampling: {
    rawFrequency: string; // Original device frequency
    archiveFrequency: string; // Downsampled frequency for archive
    preserveRules: string[]; // ["anomalies", "clinical_events", "peaks"]
  };

  // Clinical context rules
  clinicalPreservation: {
    medicationEvents: { before: string; after: string }; // "30min", "2h"
    symptomOnset: { before: string; after: string }; // "1h", "1h"
    exercisePeriods: { before: string; after: string }; // "15min", "30min"
  };
}
```

Configured thresholds (`MEASUREMENT_THRESHOLDS`):

| Measurement | maxPoints | maxAge | Raw → archive frequency | Preserve |
| --- | --- | --- | --- | --- |
| `heart_rate` | 86,400 (24h at 1 Hz) | 24h | 1s → 1m | anomalies, clinical events, exercise periods |
| `blood_glucose` | 2,016 (1 week at 5 min) | 7d | 5m → 15m | all |
| `daily_weight` | 365 | 365d | 1d → 1d | all |

## Ingestion Pipeline

```
import finalizer (src/lib/import/finalizer.ts)
  → addDocument(document)
  → processHealthData(content, profileId, documentId)       // src/lib/health/signals.ts
       ├─ legacy Signal[] input      → profile health signals only
       └─ extracted document content →
            convertExtractedDataToMetaEntries()            // medications (new/current/discontinued/changes),
                                                            // adverse reactions, labs, vitals,
                                                            // diagnoses, allergies, procedures
            insertMetaHistoryEntries()                     // meta-history-storage.ts
            syncCurrentMedicationsAndAllergies()           // profile storage, separate from meta-history
            + legacy signals kept in sync for backward compatibility
```

`updateSignals` is exported as an alias of `processHealthData`. Tags (`generateMedicationTags`, `generateLabTags`, …) and `determineClinicalSignificance()` are assigned during conversion.

**Readers:** `getDashboardData(profileId)` in `signals.ts` calls `queryMetaHistory()` for recent medication events, clinical trends and significant changes. The context system imports the `MetaHistoryEntry` type (`src/lib/context/types.ts`). The MCP tools (`getPatientTimeline`, `queryMedicalHistory`) still read **documents**, not meta-history entries.

## Querying (current capability)

`queryMetaHistory(query: MetaHistoryQuery)` loads the profile's entries document and applies:

- the `entryTypes` filter (**the only filter implemented**)
- sorting by `timestamp`, `confidence` or `clinicalSignificance`, with `orderDirection`
- `offset` / `limit` pagination

The full `MetaHistoryQuery` interface also declares categories, tags, timeRange, clinicalSignificance, minConfidence and relatedTo filters. Those are pending (see [Advanced Querying](#advanced-querying-and-compression)). Requests for measurement types also call `queryTimeSeriesData()`, which currently returns `[]`.

## Known Gaps in the Implemented Code

From the TODOs in `meta-history-storage.ts`:

- `filterEntries()` filters by `entryTypes` only
- `queryTimeSeriesData()` returns no data (current and archive documents aren't read back)
- `compressTimeSeriesData()` returns empty `hourly` / `daily` summaries
- Anomaly detection, `recentSummaries` and `preservedFeatures` aren't populated
- The entries document's content is labelled `documentType: "meta_history_current"`, even though its category is `meta_history_entries`

## Privacy & Security (implemented)

1. **Encryption at rest**: every tier is a normal encrypted document (AES-GCM content, with keys wrapped by the user's RSA key)
2. **Key management**: user-controlled RSA key pairs, the same as for all documents
3. **Access control and sharing**: document-level, through the existing vault and sharing system
4. **Audit trail**: document access is covered by the HIPAA audit logging (`src/lib/audit/index.server.ts`)

See [CRYPTOGRAPHY.md](../security/CRYPTOGRAPHY.md).

## Backward Compatibility

- Legacy signal APIs keep working, and `processHealthData()` still accepts `Signal[]`
- Dual storage: extracted documents update both meta-history entries and the legacy profile signals
- No breaking changes for existing callers
- Historical data hasn't been migrated: entries exist only for documents imported since meta-history ingestion was added

---

# Part II: Pending Design

Nothing in this part is implemented unless it says so. Pseudo-code shows the intended design. Function names such as `processHighFrequencyDeviceData`, `detectAnomalies` and `aggregate…` don't exist yet.

## Device / Wearable Time-Series

**Today:** device data from Apple HealthKit and Google Health Connect is synced by `src/lib/capacitor/health.ts` (via `health-normalize.ts`, with hourly aggregation). It goes into the **legacy profile Signal system** (`addSignalEntriesBatch` in `src/lib/health/signal-crud.ts`), **not** into meta-history `measurement_device` entries or the current/archive tiers.

**Planned:** route high-frequency device data through the hybrid storage tiers, so that statistics, anomaly detection and archival follow the `MEASUREMENT_THRESHOLDS` rules and a `measurement_device` entry references the current and historical documents:

```typescript
async function processHighFrequencyDeviceData(
  deviceData: any[],
  patientId: string,
  documentId: string,
): Promise<void> {
  for (const device of deviceData) {
    const measurementType = device.measurementType;
    const threshold = MEASUREMENT_THRESHOLDS[measurementType];

    if (!threshold) {
      // Handle as regular entry for unknown device types
      await insertMetaHistoryEntries([
        convertDeviceDataToEntry(device, patientId, documentId),
      ]);
      continue;
    }

    // Get or create current document
    const currentDoc =
      (await getCurrentDataDocument(patientId, measurementType)) ||
      createCurrentDataDocument(patientId, measurementType, threshold);

    // Add new data points
    currentDoc.currentData.rawPoints.push(...device.dataPoints);

    // Update statistics
    updateCurrentDataStatistics(currentDoc);

    // Check for anomalies
    const anomalies = detectAnomalies(device.dataPoints, currentDoc);
    currentDoc.currentData.anomalies.push(...anomalies);

    // Check if archival is needed
    if (shouldArchiveCurrentData(currentDoc, threshold)) {
      await archiveCurrentData(currentDoc, threshold);
    }

    // Save updated current document
    await saveCurrentDataDocument(currentDoc);

    // Create META_HISTORY entry referencing the current/historical documents
    const entry: MetaHistoryEntry = {
      entryId: generateUniqueId(),
      patientId,
      entryType: "measurement_device",
      timestamp: device.timestamp,
      timeRange: device.timeRange,
      data: {
        measurementType,
        deviceInfo: device.deviceInfo,
        dataReference: {
          currentDocumentId: currentDoc.documentId,
          historicalDocuments: currentDoc.historicalReferences,
        },
        summary: generateDataSummary(device.dataPoints),
      },
      tags: generateDeviceTags(device),
      category: "device_data",
      subcategory: measurementType,
      clinicalSignificance: assessDeviceDataSignificance(device),
      confidence: device.confidence || 0.85,
      sourceDocumentIds: [documentId],
    };

    await insertMetaHistoryEntries([entry]);
  }
}
```

The detailed device-data payloads are in [§4 High-Frequency Device Data Management](#4-high-frequency-device-data-management) below.

## Advanced Querying and Compression

- **Filters:** categories, subcategories, tags, timeRange (on `timestamp` or `timeRange`), clinicalSignificance, minConfidence, relatedTo. All of them are declared in `MetaHistoryQuery`.
- **Time-series reads:** `queryTimeSeriesData()` should read the current and archive documents and choose a resolution by time range.
- **Compression:** `compressTimeSeriesData()` should build downsampled hourly and daily summaries that follow `threshold.sampling` and the preserve rules. The target is a 60–80% reduction for archived data.
- **Aggregation queries**, for example medication effectiveness over time:

```typescript
// Get medication effectiveness over time (planned API)
const medicationOutcomes = await aggregateMetaHistory({
  patientId: "patient123",
  entryTypes: ["medication_effectiveness"],
  groupBy: "medication_name",
  metrics: ["effectiveness_score", "side_effects_count"],
  timeRange: { start: "2023-01-01", end: "2024-01-01" },
});
```

The full query interface and example queries are in [Efficient Querying and Filtering](#efficient-querying-and-filtering) below.

## Clinical Intelligence

1. **Pattern recognition** across data domains: medication–lab correlations (drug effectiveness from lab values), vital-sign trends (deterioration patterns, early warnings), risk stratification (genetic, behavioral and clinical risks combined), and treatment outcomes.
2. **Anomaly detection** that flags clinically significant events:

```typescript
interface ClinicalAnomaly {
  timestamp: string;
  measurementType: string;
  value: number;
  severity: "low" | "medium" | "high" | "critical";
  context: {
    recentMedications?: string[];
    concurrentSymptoms?: string[];
    clinicalEvents?: string[];
  };
  recommendations: string[];
}
```

3. **Predictive analytics**: risk scoring, disease progression modeling, treatment response prediction, preventive care recommendations.

## LangGraph / Signal-Definition Phases

- **Analytical aggregate signals**: add `analytical_aggregate` signal types to `src/lib/health/definitions.json` (none exist yet), with display properties in `properties.json`. Example:

```json
{
  "medicationHistory": {
    "type": "analytical_aggregate",
    "aggregationLevel": "comprehensive",
    "sourceSignals": ["medications", "prescriptions", "allergies"],
    "sourceConfigurations": ["medications.ts", "allergies.ts"],
    "updateTrigger": "document_import",
    "retentionPolicy": "permanent",
    "shareableGranularity": "full_object",
    "analyticsEnabled": true,
    "items": {
      "currentMedications": { "type": "array", "items": "MedicationRecord" },
      "medicationTimeline": { "type": "array", "items": "HistoricalMedication" },
      "adherencePatterns": { "type": "array", "items": "ComplianceRecord" },
      "effectivenessRecords": { "type": "array", "items": "TreatmentResponse" },
      "adverseReactions": { "type": "array", "items": "AdverseReaction" }
    }
  }
}
```

- **Configuration mapping** (`src/lib/configurations/`): `allergies.ts` → allergies and reactions, `medications.ts` → medication history, `laboratory.ts` + signals → clinical signals history, `social-history.ts` + diagnosis → risk profile (`risk_factor`, `social_determinant` and `behavioral_factor` entries)
- **Report aggregation** (`src/lib/configurations/report.ts`): cross-document correlation and temporal pattern recognition across the document history
- The import hook itself is done: `src/lib/import/finalizer.ts` already calls `processHealthData(content, profileId, documentId)`. The `SSEIndex.svelte` hook described in earlier drafts no longer exists.

## Context System Integration

- Let the MCP tools read meta-history entries directly. Today `getPatientTimeline` and `queryMedicalHistory` read documents. See [CONTEXT_MANAGEMENT.md](CONTEXT_MANAGEMENT.md).
- Earlier drafts planned semantic embeddings for meta-history objects (a `MetaObjectSearchIndex` with `semanticEmbeddings`). That plan is **dropped**, because the context system is term-based (see [CONTEXT_ROADMAP.md](../plans/CONTEXT_ROADMAP.md)). Any search index should use `tags` / `searchableText` and a correlation index:

```typescript
interface MetaObjectSearchIndex {
  patientId: string;
  searchableFields: {
    [objectType: string]: {
      textFields: string[];
      numericFields: string[];
      dateFields: string[];
      categoricalFields: string[];
    };
  };
  correlationIndex: {
    strongCorrelations: ObjectCorrelation[];
    moderateCorrelations: ObjectCorrelation[];
    temporalCorrelations: TemporalCorrelation[];
  };
}
```

## MoE Expert System Integration

- Extend `ExpertContext` so session experts can query meta-history entries (analytical aggregates, temporal analysis, risk stratification) through the context system
- Update the expert base class to aggregate entries for analysis, and push entry updates in real time over SSE
- See [SESSION_MOE.md](../plans/SESSION_MOE.md)

## Real-Time Session Integration

Clinical data extracted from a live consultation could be written as entries:

```typescript
// Live updates during consultations (planned)
sessionManager.on("transcription:processed", async (data) => {
  const entries = await extractClinicalData(data);
  await insertMetaHistoryEntries(entries);
  emitMetaHistoryUpdate(entries); // Notify connected clients
});
```

## Privacy Configuration and Granular Sharing

Today sharing is per document (see Part I). The plan is finer-grained, per-entry-type policies:

```typescript
interface MetaHistorySharingPolicy {
  sharedWith: string[]; // User IDs
  dataTypes: string[]; // Specific entry types
  timeRange?: DateRange; // Limited time window
  purpose: string; // Research, emergency, family
  expiration?: Date; // Auto-revoke
}

interface MetaObjectPrivacyConfiguration {
  patientId: string;

  // Encryption settings
  encryptionLevel: "standard" | "enhanced" | "maximum";
  keyRotationSchedule: string;

  // Access controls
  accessLevels: {
    [objectType: string]: {
      read: string[]; // User roles that can read
      write: string[]; // User roles that can write
      share: string[]; // User roles that can share
    };
  };

  // Data sharing preferences
  sharingPreferences: {
    emergencyAccess: boolean;
    researchParticipation: boolean;
    anonymizedAnalytics: boolean;
    familyMemberAccess: string[]; // Specific data types family can access
  };

  // Audit requirements
  auditLevel: "basic" | "detailed" | "comprehensive";
  retentionPeriod: string;

  // Compliance settings
  complianceFrameworks: string[]; // e.g., "HIPAA", "GDPR"
  jurisdictionalRequirements: string[];
}
```

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Foundation | Flat entry types, 3-tier storage on encrypted documents, threshold config, import hook, legacy signal compatibility | ✅ Done |
| 2. Query engine | All `MetaHistoryQuery` filters, time-series reads, aggregation queries, caching and pagination | 🚧 Only the entry-type filter and sort/paginate are done |
| 3. Device time-series | Route HealthKit / Health Connect data into the current/archive tiers, compression, clinical-context preservation | 📋 Planned (device sync exists, but on legacy signals) |
| 4. Clinical intelligence | Anomaly detection, pattern recognition, risk scoring, predictive models | 📋 Planned |
| 5. LangGraph aggregates | `analytical_aggregate` definitions, configuration mapping, report aggregation | 📋 Planned |
| 6. System integration | MCP tools on entries, MoE expert access, real-time session entries, external APIs | 📋 Planned |

## Size Estimates and Targets

### Expected Sizes by User Profile

| Profile | Total entries | Current documents | Historical documents | Total |
| --- | --- | --- | --- | --- |
| Young healthy adult (20–35) | 100–500 | 10–50 KB | 20–100 KB | 30–150 KB |
| Middle-aged, chronic conditions (45–65) | 2,000–8,000 | 100–500 KB | 500 KB–2 MB | 600 KB–2.5 MB |
| Elderly, multiple comorbidities (70+) | 10,000–50,000 | 500 KB–2 MB | 2–10 MB | 2.5–12 MB |
| Complex patient, continuous monitoring | 50,000–200,000 | 2–10 MB | 10–50 MB | 12–60 MB |

### Progressive Loading Strategy

Once time-range filtering lands, load recent data by default and historical data on demand:

```typescript
const recentData = await queryMetaHistory({
  patientId: "patient123",
  timeRange: { start: "2023-07-15", end: "2024-01-15" }, // Last 6 months
  limit: 1000,
});

const historicalData = await queryMetaHistory({
  patientId: "patient123",
  timeRange: { start: "2020-01-01", end: "2023-07-14" },
  categories: ["medications", "diagnoses"],
  limit: 500,
  offset: 0,
});
```

Smart caching: cache frequently accessed entry types, compress historical data after 1 year, and use a CDN for static medical reference data.

### Target Metrics (not measured)

- **Performance:** <200ms filtered queries, >1000 points/s device ingestion, 60–80% storage reduction through archival, <10MB RAM for typical current data, <5s to archive 24h of high-frequency data
- **Scalability:** >1M entries per patient, 500+ concurrent users with device data, <2s archived-data retrieval, <1s correlation over 10,000+ entries, <100ms streaming anomaly latency
- **Clinical utility:** >95% of relevant events captured as entries, >90% anomaly accuracy, 100% preservation of high-resolution data around medical events
- **Devices:** 20+ device types with configurable thresholds, 80–95% compression for historical time-series, <1s device-to-dashboard latency, full recovery after connectivity loss

## Key Benefits of the Design

1. **Unified data model**: one entry structure for every data type, consistent confidence scoring and metadata, and no artificial split between labs, vitals and device data
2. **Built for real-world usage**: efficient high-frequency data, archival based on clinical significance, progressive loading, high-resolution data preserved around medical events
3. **Query performance**: filtering by type, category, tags and time, on-demand aggregation, easy cross-domain analysis
4. **Future-proof device integration**: configurable thresholds per measurement, anomaly preservation, multi-resolution storage

## Troubleshooting

1. **Missing entries**: check that the document went through `finalizer.ts` → `processHealthData()` with extracted content (a legacy `Signal[]` input produces no entries). Check encryption keys and document permissions.
2. **Measurement not in the current tier**: the measurement type has no `MEASUREMENT_THRESHOLDS` entry, so it was stored as a regular entry.
3. **Empty time-series query results**: expected, because `queryTimeSeriesData()` isn't implemented yet.
4. **Storage growth**: watch the archive thresholds. Compression is still a stub.

---

# Appendix: Design Reference

## Flat Entry Structure Examples

> Design reference for the `data` payloads of each entry type. The entries `signals.ts` writes today are simpler: see Part I for the types actually produced. §4 (device data), §5 and §6 (aggregate history objects) are entirely pending.

### 1. Medication Entries

**Medication data is stored as individual flat entries with different types:**

```typescript
// Current medication entry
{
  entryId: "med_current_001",
  patientId: "patient123",
  entryType: "medication_current",
  timestamp: "2024-01-15T00:00:00Z",
  data: {
    genericName: "lisinopril",
    brandName: "Prinivil",
    dosage: "10mg",
    frequency: "daily",
    indication: "hypertension",
    prescriber: "Dr. Smith",
    startDate: "2024-01-15",
    status: "active"
  },
  tags: ["ace_inhibitor", "hypertension", "cardiovascular"],
  category: "medications",
  subcategory: "antihypertensive",
  clinicalSignificance: "high",
  confidence: 1.0,
  relatedEntries: ["bp_measurements"],
  sourceDocumentIds: ["doc_789"]
}

// Medication effectiveness entry
{
  entryId: "med_effect_001",
  patientId: "patient123",
  entryType: "medication_effectiveness",
  timestamp: "2024-02-15T00:00:00Z",
  timeRange: { start: "2024-01-15", end: "2024-02-15" },
  data: {
    medicationId: "med_current_001",
    effectiveness: "moderately_effective",
    primaryOutcome: {
      metric: "blood_pressure",
      baselineValue: 150,
      currentValue: 135,
      improvementPercentage: 10
    },
    sideEffects: ["mild_dizziness"],
    patientSatisfaction: 8
  },
  tags: ["treatment_response", "hypertension", "cardiovascular"],
  category: "treatment_outcomes",
  confidence: 0.85,
  relatedEntries: ["med_current_001"],
  sourceDocumentIds: ["followup_doc_001"]
}

// Adverse reaction entry
{
  entryId: "reaction_001",
  patientId: "patient123",
  entryType: "adverse_reaction",
  timestamp: "2024-01-20T14:30:00Z",
  data: {
    substance: "penicillin",
    reactionType: "allergic",
    severity: "moderate",
    symptoms: ["rash", "itching", "swelling"],
    onsetTime: "30 minutes",
    treatment: ["antihistamine", "corticosteroid"],
    outcome: "recovered"
  },
  tags: ["drug_allergy", "penicillin", "allergic_reaction"],
  category: "allergies_reactions",
  clinicalSignificance: "high",
  confidence: 0.95,
  sourceDocumentIds: ["emergency_doc_001"]
}
```

interface CurrentMedication {
medicationId: string;
genericName: string;
brandName?: string;
dosage: string;
frequency: string;
routeOfAdministration: string;
prescribedDate: string;
prescribingPhysician: string;
indication: string;
expectedDuration?: string;

// Current status
status: 'active' | 'discontinued' | 'paused' | 'completed';
adherenceScore: number; // 0-1 scale
sideEffectsReported: string[];
effectivenessScore?: number; // 0-1 scale if available

// Integration references
sourceDocumentIds: string[];
relatedLabResultIds: string[];
}

interface MedicationRecord {
recordId: string;
medicationId: string;
genericName: string;
brandName?: string;

// Prescription details
prescriptionDetails: {
dosage: string;
frequency: string;
duration: string;
startDate: string;
endDate?: string;
prescribingPhysician: string;
indication: string;
instructions: string;
};

// Treatment tracking
treatmentOutcome: {
effectiveness: 'highly_effective' | 'moderately_effective' | 'minimally_effective' | 'ineffective' | 'unknown';
sideEffects: SideEffect[];
complianceRate: number; // 0-1 scale
reasonForDiscontinuation?: string;
patientSatisfaction?: number; // 1-5 scale
};

// Context and relationships
relatedConditions: string[];
concurrentMedications: string[];
relevantLabValues: LabValueAtTime[];

// Data provenance
sourceDocumentIds: string[];
lastUpdated: string;
confidence: number; // Confidence in extracted data accuracy
}

interface ComplianceRecord {
recordId: string;
medicationId: string;
timeRange: { start: string; end: string };

// Compliance metrics
prescribedDoses: number;
takenDoses: number;
complianceRate: number; // 0-1 scale

// Compliance patterns
missedDosePatterns: {
dayOfWeek?: string[];
timeOfDay?: string[];
circumstances?: string[];
};

// Factors affecting compliance
complianceFactors: {
sideEffects: boolean;
cost: boolean;
complexity: boolean;
forgetting: boolean;
improvement: boolean; // Stopped because felt better
other: string[];
};

// Interventions and outcomes
complianceInterventions: ComplianceIntervention[];

// Data source
sourceType: 'patient_reported' | 'pharmacy_records' | 'pill_count' | 'electronic_monitoring';
sourceDocumentIds: string[];
}

interface TreatmentResponse {
responseId: string;
medicationId: string;
treatmentPeriod: { start: string; end: string };

// Response metrics
primaryOutcome: {
metric: string; // e.g., "blood_pressure", "pain_scale", "symptom_severity"
baselineValue: number;
currentValue: number;
improvementPercentage: number;
clinicalSignificance: 'significant' | 'moderate' | 'minimal' | 'none';
};

// Secondary outcomes
secondaryOutcomes: OutcomeMeasure[];

// Patient-reported outcomes
patientReportedOutcomes: {
qualityOfLife: number; // 1-10 scale
symptomImprovement: number; // 1-10 scale
functionalStatus: number; // 1-10 scale
overallSatisfaction: number; // 1-10 scale
};

// Time to response
timeToResponse: {
firstNoticeableImprovement?: string; // Days/weeks
maximalResponse?: string;
plateauReached?: string;
};

// Data provenance
sourceDocumentIds: string[];
assessmentMethods: string[];
confidence: number;
}

````

### 2. Unified Measurement Entries

**All physiological measurements use the same structure with different entryTypes:**

```typescript
// Blood pressure measurement (vital sign)
{
  entryId: "bp_001",
  patientId: "patient123",
  entryType: "measurement_vital",
  timestamp: "2024-01-15T10:30:00Z",
  data: {
    measurementType: "blood_pressure",
    values: {
      systolic: 130,
      diastolic: 85,
      unit: "mmHg"
    },
    context: {
      position: "sitting",
      arm: "left",
      deviceType: "automated_cuff"
    },
    interpretation: "stage_1_hypertension"
  },
  tags: ["blood_pressure", "hypertension", "cardiovascular"],
  category: "vital_signs",
  subcategory: "blood_pressure",
  clinicalSignificance: "medium",
  confidence: 0.95,
  sourceDocumentIds: ["clinic_visit_001"]
}

// Lab result (blood test)
{
  entryId: "lab_001",
  patientId: "patient123",
  entryType: "measurement_lab",
  timestamp: "2024-01-14T08:00:00Z",
  data: {
    testName: "Hemoglobin A1c",
    value: 7.2,
    unit: "%",
    referenceRange: { min: 4.0, max: 5.6 },
    interpretation: "abnormal_high",
    specimen: {
      type: "blood",
      collectionMethod: "venipuncture"
    }
  },
  tags: ["diabetes", "glucose_control", "endocrine"],
  category: "laboratory",
  subcategory: "diabetes_monitoring",
  clinicalSignificance: "high",
  confidence: 0.99,
  sourceDocumentIds: ["lab_report_001"]
}

// Wearable device data (high-frequency)
{
  entryId: "hr_device_001",
  patientId: "patient123",
  entryType: "measurement_device",
  timestamp: "2024-01-15T00:00:00Z",
  timeRange: { start: "2024-01-15T00:00:00Z", end: "2024-01-15T23:59:59Z" },
  data: {
    measurementType: "heart_rate",
    deviceInfo: {
      brand: "Apple Watch",
      model: "Series 9",
      firmware: "10.1"
    },
    // For high-frequency data, this references current/historical documents
    dataReference: {
      currentDocumentId: "hr_current_001",
      historicalDocuments: ["hr_hist_001", "hr_hist_002"]
    },
    summary: {
      dailyAverage: 72,
      min: 58,
      max: 145,
      anomaliesDetected: 2
    }
  },
  tags: ["heart_rate", "wearable", "cardiovascular", "continuous_monitoring"],
  category: "device_data",
  subcategory: "heart_rate",
  clinicalSignificance: "medium",
  confidence: 0.85,
  sourceDocumentIds: ["device_sync_001"]
}
````

interface VitalSignsTimeline {
signalType: 'blood_pressure' | 'heart_rate' | 'temperature' | 'respiratory_rate' | 'oxygen_saturation' | 'weight' | 'bmi';
timeRange: { start: string; end: string };

// Data points
measurements: VitalSignMeasurement[];

// Trend analysis
trendAnalysis: {
direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
slope: number; // Rate of change
statisticalSignificance: number; // p-value
seasonality?: string; // If seasonal patterns detected

    // Clinical interpretation
    clinicalSignificance: 'normal_variation' | 'concerning_trend' | 'alarming_trend';
    referenceRanges: { min: number; max: number; unit: string };
    percentileRank: number; // Compared to population norms

};

// Alert thresholds and notifications
alertSettings: {
criticalThreshold: { min?: number; max?: number };
warningThreshold: { min?: number; max?: number };
rateOfChangeAlert: number; // Alert if change exceeds this rate
};

// Correlations with other signals
correlatedSignals: SignalCorrelation[];

// Data quality and reliability
dataQuality: {
measurementAccuracy: number; // 0-1 scale
consistency: number; // 0-1 scale
completeness: number; // Percentage of expected measurements
sourceReliability: 'high' | 'medium' | 'low';
};
}

interface VitalSignMeasurement {
measurementId: string;
timestamp: string;
value: number;
unit: string;

// Measurement context
context: {
measurementMethod: string; // e.g., "manual_bp_cuff", "automated_monitor"
position: string; // e.g., "sitting", "supine"
activityLevel: string; // e.g., "at_rest", "post_exercise"
medications?: string[]; // Medications that might affect this measurement
};

// Clinical notes
clinicalNotes?: string;
abnormalFlag?: 'high' | 'low' | 'critical_high' | 'critical_low';

// Data source
sourceDocumentId: string;
enteredBy: string; // Healthcare provider or device
confidence: number;
}

interface RiskIndicator {
indicatorId: string;
indicatorType: 'early_warning' | 'deterioration' | 'compliance_risk' | 'safety_signal' | 'predictive_marker';

// Risk details
riskDescription: string;
riskLevel: 'low' | 'moderate' | 'high' | 'critical';
confidence: number; // 0-1 scale

// Temporal information
detectedDate: string;
persistenceDuration?: string; // How long has this risk been present
trendDirection: 'worsening' | 'stable' | 'improving';

// Supporting evidence
supportingEvidence: {
vitalSigns?: string[]; // Relevant vital sign changes
labValues?: string[]; // Relevant lab changes
symptoms?: string[]; // Relevant symptom changes
medications?: string[]; // Relevant medication factors
socialFactors?: string[]; // Relevant social determinants
};

// Risk quantification
riskQuantification: {
probabilityScore: number; // 0-1 probability of adverse outcome
timeHorizon: string; // Time frame for risk (e.g., "30_days", "6_months")
potentialOutcomes: string[]; // Possible adverse outcomes
preventabilityScore: number; // 0-1 scale of how preventable this risk is
};

// Recommended actions
recommendedActions: {
immediateActions: string[];
monitoringRecommendations: string[];
preventiveInterventions: string[];
escalationCriteria: string[];
};

// Follow-up and resolution
status: 'active' | 'monitoring' | 'resolved' | 'escalated';
resolutionDate?: string;
resolutionMethod?: string;

// Data provenance
sourceAlgorithm?: string; // If detected by algorithm
sourceDocumentIds: string[];
validatedBy?: string; // Healthcare provider who validated
}

````

### 3. Clinical Event and Risk Entries

**Clinical events, diagnoses, and risk factors as individual entries:**

```typescript
// Diagnosis entry
{
  entryId: "diag_001",
  patientId: "patient123",
  entryType: "diagnosis",
  timestamp: "2024-01-15T00:00:00Z",
  data: {
    diagnosisName: "Essential Hypertension",
    icdCode: "I10",
    certainty: "confirmed",
    severity: "moderate",
    diagnosingPhysician: "Dr. Smith",
    supportingEvidence: [
      "Elevated blood pressure readings",
      "Family history of hypertension",
      "No secondary causes identified"
    ]
  },
  tags: ["hypertension", "cardiovascular", "chronic_condition"],
  category: "diagnoses",
  subcategory: "cardiovascular",
  clinicalSignificance: "high",
  confidence: 0.95,
  relatedEntries: ["bp_001", "med_current_001"],
  sourceDocumentIds: ["clinic_visit_001"]
}

// Risk factor entry
{
  entryId: "risk_001",
  patientId: "patient123",
  entryType: "risk_factor",
  timestamp: "2024-01-15T00:00:00Z",
  data: {
    riskType: "genetic",
    factor: "Family history of coronary artery disease",
    category: "cardiovascular",
    riskLevel: "moderate",
    relativeLiskMultiplier: 2.1,
    associatedConditions: [
      {
        condition: "coronary_artery_disease",
        riskIncrease: 2.1,
        evidenceStrength: "strong"
      }
    ],
    modifiable: false
  },
  tags: ["genetic_risk", "cardiovascular", "family_history"],
  category: "risk_factors",
  subcategory: "genetic",
  clinicalSignificance: "medium",
  confidence: 0.90,
  sourceDocumentIds: ["family_history_001"]
}

// Clinical pattern entry
{
  entryId: "pattern_001",
  patientId: "patient123",
  entryType: "clinical_pattern",
  timestamp: "2024-01-15T00:00:00Z",
  timeRange: { start: "2023-10-01", end: "2024-01-15" },
  data: {
    patternType: "blood_pressure_variability",
    description: "Increased BP variability in evening hours",
    patternStrength: 0.78,
    clinicalSignificance: "May indicate poor medication timing",
    recommendations: [
      "Consider evening dose adjustment",
      "24-hour ambulatory BP monitoring"
    ],
    relatedMeasurements: ["bp_001", "bp_002", "bp_003"]
  },
  tags: ["blood_pressure", "variability", "medication_timing"],
  category: "patterns",
  subcategory: "physiological",
  clinicalSignificance: "medium",
  confidence: 0.78,
  relatedEntries: ["med_current_001"],
  sourceDocumentIds: ["pattern_analysis_001"]
}
````

interface DemographicRiskFactor {
factorId: string;
category: 'age' | 'gender' | 'ethnicity' | 'socioeconomic_status' | 'geographic_location';

// Risk details
description: string;
riskLevel: 'low' | 'moderate' | 'high';
relativeLiskLMultiplier: number; // Compared to baseline population

// Associated conditions
associatedConditions: {
condition: string;
riskMultiplier: number;
evidenceStrength: 'strong' | 'moderate' | 'weak';
populationStudyBasis: string; // Reference to studies/databases
}[];

// Modifiability
modifiable: boolean;
modificationStrategies?: string[];

// Time-based factors
ageOfOnset?: number; // Age when risk becomes relevant
progressionRate?: string; // How risk changes over time

// Data source and reliability
sourceType: 'census_data' | 'patient_reported' | 'clinical_observation' | 'insurance_records';
confidence: number; // 0-1 scale
lastVerified: string;
}

interface ClinicalRiskFactor {
factorId: string;
category: 'chronic_disease' | 'medication_related' | 'procedural' | 'diagnostic' | 'physiological';

// Clinical details
description: string;
icdCodes?: string[]; // Related ICD-10 codes
severity: 'mild' | 'moderate' | 'severe';
controlStatus: 'well_controlled' | 'partially_controlled' | 'poorly_controlled' | 'uncontrolled';

// Risk quantification
riskQuantification: {
relativeRisk: number; // Compared to population without this factor
attributableRisk: number; // Absolute risk attributable to this factor
numberNeededToHarm?: number; // If applicable
timeToEvent?: { median: number; range: { min: number; max: number } };
};

// Associated outcomes
associatedOutcomes: {
outcome: string;
probability: number; // 0-1 scale
timeframe: string; // e.g., "1_year", "5_years"
severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
preventability: number; // 0-1 scale
}[];

// Monitoring requirements
monitoringSchedule: {
frequency: string; // e.g., "monthly", "quarterly"
tests: string[]; // Required monitoring tests
parameters: string[]; // Parameters to monitor
};

// Interactions with other risk factors
riskFactorInteractions: {
interactingFactor: string;
interactionType: 'synergistic' | 'antagonistic' | 'neutral';
combinedRiskMultiplier: number;
}[];

// Data provenance
sourceDocumentIds: string[];
diagnosisDate?: string;
lastAssessment: string;
assessedBy: string;
confidence: number;
}

interface GeneticRiskFactor {
factorId: string;
geneSymbol?: string;
variant?: string;

// Genetic information
inheritancePattern: 'autosomal_dominant' | 'autosomal_recessive' | 'x_linked' | 'multifactorial' | 'mitochondrial';
penetrance: number; // 0-1 scale for single-gene disorders
expressivity: 'complete' | 'incomplete' | 'variable';

// Risk assessment
geneticRiskScore?: number; // Polygenic risk score if applicable
lifetimeRisk: number; // 0-1 scale
familyHistoryContribution: number; // How much family history contributes

// Associated conditions
associatedConditions: {
condition: string;
riskIncrease: number; // Fold increase in risk
ageOfOnset?: { typical: number; range: { min: number; max: number } };
severity?: string;
managementOptions: string[];
}[];

// Family history context
familyHistoryPattern: {
affectedRelatives: FamilyMember[];
generationsAffected: number;
paternalSide: boolean;
maternalSide: boolean;
consanguinity?: boolean;
};

// Genetic testing recommendations
testingRecommendations: {
recommended: boolean;
testType: string; // e.g., "single_gene", "panel", "exome", "genome"
urgency: 'immediate' | 'soon' | 'routine' | 'optional';
considerations: string[];
};

// Counseling and management
geneticCounselingNeeded: boolean;
screeningRecommendations: string[];
preventiveInterventions: string[];

// Data source
sourceType: 'genetic_test' | 'family_history' | 'clinical_assessment' | 'predictive_modeling';
testDate?: string;
laboratoryReport?: string;
confidence: number;
}

interface SocialRiskFactor {
factorId: string;
category: 'housing' | 'food_security' | 'transportation' | 'social_support' | 'education' | 'employment' | 'insurance' | 'language_barriers';

// Social determinant details
description: string;
severity: 'mild_impact' | 'moderate_impact' | 'severe_impact';
duration: 'acute' | 'chronic' | 'intermittent';

// Health impact
healthImpact: {
directEffects: string[]; // Direct health consequences
indirectEffects: string[]; // Indirect health consequences
accessBarriers: string[]; // Healthcare access issues created
complianceImpact: number; // -1 to +1 scale of impact on treatment compliance
};

// Quantified risk
riskQuantification: {
mortalityRiskIncrease?: number; // Percentage increase in mortality risk
morbidityRiskIncrease?: number; // Percentage increase in morbidity risk
healthcareUtilizationImpact?: number; // Expected change in healthcare use
costImpact?: number; // Expected healthcare cost impact
};

// Intervention opportunities
interventionOpportunities: {
resourceReferrals: string[]; // Community resources available
socialServicesNeeded: string[];
advocacySupport: string[];
policyInterventions: string[];
};

// Geographic and community context
communityContext: {
neighborhoodCharacteristics: string[];
communityResources: string[];
socialCohesion: 'high' | 'moderate' | 'low';
safetyLevel: 'high' | 'moderate' | 'low';
};

// Data source and assessment
assessmentMethod: 'patient_interview' | 'screening_tool' | 'community_health_worker' | 'social_worker_assessment';
screeningTool?: string; // e.g., "PRAPARE", "Health Leads"
lastAssessed: string;
confidence: number;
}

interface CompositeRiskScore {
scoreId: string;
scoreName: string; // e.g., "Framingham Risk Score", "ASCVD Risk Calculator"

// Score details
scoreValue: number;
scoreRange: { min: number; max: number };
scoreInterpretation: string;
riskCategory: 'low' | 'intermediate' | 'high' | 'very_high';

// Clinical context
targetCondition: string; // What this score predicts
timeHorizon: string; // Prediction timeframe
populationBasis: string; // Population the score was developed on

// Score components
inputFactors: {
factor: string;
value: any;
weight: number; // Contribution to final score
}[];

// Clinical recommendations
recommendations: {
interventions: string[];
monitoringFrequency: string;
targetGoals: string[];
riskReassessmentSchedule: string;
};

// Validation and reliability
validationStudies: string[];
applicabilityToPatient: number; // 0-1 scale of how well score applies
lastCalculated: string;
calculatedBy: string;
}

````

### 4. High-Frequency Device Data Management

**For continuous monitoring devices, we use the hybrid storage approach:**

```typescript
// Example measurement thresholds for different device types
const MEASUREMENT_THRESHOLDS: { [key: string]: MeasurementThreshold } = {
  heart_rate: {
    measurementType: "heart_rate",
    archivalTriggers: {
      maxPoints: 86400,      // 24 hours at 1Hz
      maxAge: "24h",
      maxSizeBytes: 2_000_000 // 2MB
    },
    sampling: {
      rawFrequency: "1s",
      archiveFrequency: "1m", // Downsample to 1-minute averages
      preserveRules: ["anomalies", "clinical_events", "exercise_periods"]
    },
    clinicalPreservation: {
      medicationEvents: { before: "30m", after: "2h" },
      symptomOnset: { before: "1h", after: "1h" },
      exercisePeriods: { before: "15m", after: "30m" }
    }
  },

  blood_glucose: {
    measurementType: "blood_glucose",
    archivalTriggers: {
      maxPoints: 2016,       // 1 week at 5-minute intervals
      maxAge: "7d",
      maxSizeBytes: 500_000  // 500KB
    },
    sampling: {
      rawFrequency: "5m",
      archiveFrequency: "15m", // Downsample to 15-minute averages
      preserveRules: ["all"] // Preserve all glucose readings
    },
    clinicalPreservation: {
      medicationEvents: { before: "1h", after: "4h" },
      symptomOnset: { before: "2h", after: "2h" },
      exercisePeriods: { before: "30m", after: "2h" }
    }
  },

  daily_weight: {
    measurementType: "weight",
    archivalTriggers: {
      maxPoints: 365,        // 1 year of daily measurements
      maxAge: "365d",
      maxSizeBytes: 50_000   // 50KB
    },
    sampling: {
      rawFrequency: "1d",
      archiveFrequency: "1d", // Keep daily resolution
      preserveRules: ["all"] // Preserve all weight measurements
    },
    clinicalPreservation: {
      medicationEvents: { before: "7d", after: "30d" },
      symptomOnset: { before: "7d", after: "7d" },
      exercisePeriods: { before: "1d", after: "1d" }
    }
  }
};

// Current document example for heart rate
// (Referenced by measurement_device entry)
{
  documentId: "hr_current_001",
  patientId: "patient123",
  measurementType: "heart_rate",
  lastUpdated: "2024-01-15T23:59:59Z",

  currentData: {
    rawPoints: [
      { timestamp: "2024-01-15T00:00:00Z", value: 68 },
      { timestamp: "2024-01-15T00:00:01Z", value: 69 },
      // ... up to 86,400 points
    ],

    statistics: {
      last: 72,
      mean: 71.5,
      min: 58,
      max: 145,
      stdDev: 12.3,
      trend: "stable"
    },

    anomalies: [
      {
        timestamp: "2024-01-15T14:22:15Z",
        value: 145,
        type: "spike",
        context: "possible_exercise",
        preserved: true
      }
    ]
  },

  thresholds: MEASUREMENT_THRESHOLDS.heart_rate,

  recentSummaries: {
    hourly: [/* 24 hourly summaries */],
    daily: [/* 30 daily summaries */]
  },

  historicalReferences: [
    { documentId: "hr_hist_001", timeRange: { start: "2024-01-01", end: "2024-01-14" } },
    { documentId: "hr_hist_002", timeRange: { start: "2023-12-01", end: "2023-12-31" } }
  ]
}
````

interface MedicationAllergy {
allergyId: string;
allergen: {
genericName: string;
brandNames: string[];
allergenClass: string; // e.g., "penicillin", "sulfonamide"
chemicalStructure?: string;
};

// Reaction details
reactionType: 'type_1_ige' | 'type_2_cytotoxic' | 'type_3_immune_complex' | 'type_4_delayed' | 'pseudoallergic' | 'unknown';
severity: 'mild' | 'moderate' | 'severe' | 'anaphylactic';

// Clinical manifestations
symptoms: AllergySymptom[];
onsetTime: string; // Time from exposure to reaction
duration: string; // How long reaction lasted

// Historical reactions
reactionHistory: {
date: string;
exposureAmount?: string;
symptoms: string[];
treatment: string[];
outcome: string;
hospitalizations: boolean;
}[];

// Cross-reactivity concerns
crossReactiveSubstances: string[];
avoidanceList: string[]; // Medications to avoid

// Verification and testing
verificationStatus: 'patient_reported' | 'clinically_observed' | 'test_confirmed' | 'test_ruled_out';
allergyTesting: {
skinTest?: { result: string; date: string };
bloodTest?: { result: string; date: string; igeLevel?: number };
challengeTest?: { result: string; date: string; protocol: string };
};

// Management
managementPlan: {
avoidanceInstructions: string[];
emergencyMedications: string[];
premedications?: string[];
desensitizationProtocol?: string;
};

// Data source
sourceDocumentIds: string[];
reportedBy: string;
verifiedBy?: string;
lastVerified: string;
confidence: number;
}

interface AdverseDrugReaction {
reactionId: string;
medication: {
genericName: string;
brandName?: string;
dosage: string;
route: string;
};

// Reaction classification
reactionType: 'dose_related' | 'non_dose_related' | 'dose_and_time_related' | 'time_related' | 'withdrawal' | 'failure_of_efficacy';
mechanism: 'pharmacological' | 'idiosyncratic' | 'hypersensitivity' | 'unknown';
severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';

// Clinical details
symptoms: string[];
onsetTime: string;
duration: string;
doseRelationship: boolean;
rechallenge?: { attempted: boolean; outcome?: string };
dechallenge: { attempted: boolean; outcome: string };

// Causality assessment
causalityScore: {
naranjoScore?: number; // Naranjo ADR probability scale
whoUmcScale?: string; // WHO-UMC causality scale
confidence: 'definite' | 'probable' | 'possible' | 'unlikely' | 'unrelated';
};

// Risk factors
riskFactors: {
age: boolean;
gender: boolean;
genetics: boolean;
renalFunction: boolean;
hepaticFunction: boolean;
drugInteractions: boolean;
comorbidities: string[];
};

// Management and outcome
management: string[];
outcome: 'recovered' | 'recovering' | 'not_recovered' | 'fatal' | 'unknown';
preventiveStrategies: string[];

// Reporting
reportedToAuthorities: boolean;
reportingAgencies: string[];

// Data source
sourceDocumentIds: string[];
reportedBy: string;
dateReported: string;
confidence: number;
}

````

### 5. VitalSignsHistory

**Purpose:** Comprehensive vital signs tracking with trend analysis, pattern recognition, and clinical correlation.

```typescript
interface VitalSignsHistory {
  patientId: string;
  lastUpdated: string;

  // Vital sign categories
  bloodPressureHistory: BloodPressureHistory;
  heartRateHistory: HeartRateHistory;
  temperatureHistory: TemperatureHistory;
  respiratoryHistory: RespiratoryHistory;
  oxygenationHistory: OxygenationHistory;
  anthropometricHistory: AnthropometricHistory;

  // Composite vital sign indices
  compositeIndices: VitalSignIndex[];

  // Correlation analysis
  vitalSignCorrelations: VitalSignCorrelation[];

  // Alert history
  vitalSignAlerts: VitalSignAlert[];
}

interface BloodPressureHistory {
  measurements: BloodPressureMeasurement[];
  trendAnalysis: VitalSignTrend;
  hypertensionClassification: HypertensionClassification;
  targetGoals: BloodPressureGoals;
  medicationEffects: MedicationEffect[];
}

interface BloodPressureMeasurement {
  measurementId: string;
  timestamp: string;

  // Blood pressure values
  systolic: number;
  diastolic: number;
  meanArterialPressure?: number;
  pulsePresure: number;

  // Measurement context
  position: 'sitting' | 'supine' | 'standing';
  armUsed: 'left' | 'right';
  cuffSize: string;
  method: 'manual' | 'automated' | 'ambulatory';

  // Clinical context
  timeRelativeToMedication?: string; // e.g., "2_hours_post_dose"
  activityLevel: 'at_rest' | 'post_exercise' | 'during_stress';
  symptoms?: string[]; // Associated symptoms

  // Quality indicators
  repeatMeasurements?: number; // Number of measurements averaged
  measurementQuality: 'excellent' | 'good' | 'fair' | 'poor';
  artifactNoted?: string;

  // Clinical interpretation
  classification: 'normal' | 'elevated' | 'stage_1_hypertension' | 'stage_2_hypertension' | 'hypertensive_crisis';
  clinicalSignificance: 'normal' | 'borderline' | 'abnormal' | 'critical';

  // Data source
  sourceDocumentId: string;
  measurementDevice?: string;
  recordedBy: string;
  confidence: number;
}

interface VitalSignTrend {
  trendPeriod: { start: string; end: string };

  // Statistical analysis
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    percentiles: { p25: number; p50: number; p75: number; p90: number; p95: number };
    coefficientOfVariation: number;
  };

  // Trend characteristics
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  trendStrength: number; // 0-1 scale
  seasonality?: {
    detected: boolean;
    pattern?: string;
    amplitude?: number;
  };

  // Clinical interpretation
  clinicalTrend: 'improving' | 'worsening' | 'stable' | 'variable';
  targetAchievement: {
    targetMet: boolean;
    percentageInTarget: number;
    trendTowardTarget: boolean;
  };

  // Factors influencing trend
  influencingFactors: {
    medications: MedicationInfluence[];
    lifestyle: LifestyleInfluence[];
    conditions: ConditionInfluence[];
    environmental: EnvironmentalInfluence[];
  };
}

interface VitalSignCorrelation {
  correlationId: string;
  vitalSign1: string;
  vitalSign2: string;

  // Correlation statistics
  correlationCoefficient: number; // -1 to +1
  pValue: number;
  confidenceInterval: { lower: number; upper: number };

  // Clinical interpretation
  clinicalMeaning: string;
  clinicalSignificance: 'high' | 'moderate' | 'low' | 'none';

  // Temporal relationship
  timeRelationship: 'simultaneous' | 'lagged' | 'predictive';
  timeLag?: string; // If lagged relationship

  // Context factors
  contextFactors: {
    medications?: string[];
    conditions?: string[];
    activities?: string[];
    timeOfDay?: string[];
  };

  // Data quality
  dataPoints: number;
  analysisMethod: string;
  confidence: number;
}
````

### 6. DiagnosticHistory

**Purpose:** Comprehensive diagnostic test history with trend analysis, correlation patterns, and clinical significance assessment.

```typescript
interface DiagnosticHistory {
  patientId: string;
  lastUpdated: string;

  // Laboratory results
  laboratoryHistory: LaboratoryHistory;

  // Imaging studies
  imagingHistory: ImagingHistory;

  // Diagnostic procedures
  procedureHistory: DiagnosticProcedureHistory;

  // Pathology results
  pathologyHistory: PathologyHistory;

  // Screening tests
  screeningHistory: ScreeningTestHistory;

  // Diagnostic timelines
  diagnosticTimelines: DiagnosticTimeline[];

  // Test correlations
  testCorrelations: TestCorrelation[];
}

interface LaboratoryHistory {
  testCategories: {
    hematology: LabTestCategory;
    chemistry: LabTestCategory;
    lipids: LabTestCategory;
    endocrine: LabTestCategory;
    immunology: LabTestCategory;
    microbiology: LabTestCategory;
    coagulation: LabTestCategory;
    urinalysis: LabTestCategory;
    cardiacMarkers: LabTestCategory;
    tumorMarkers: LabTestCategory;
  };

  // Trending and monitoring
  monitoringProfiles: LabMonitoringProfile[];
  criticalValues: CriticalLabValue[];
  trendAlerts: LabTrendAlert[];
}

interface LabTestCategory {
  categoryName: string;
  tests: LabTest[];
  categoryTrends: CategoryTrend;
  clinicalCorrelations: ClinicalCorrelation[];
}

interface LabTest {
  testId: string;
  testName: string;
  loincCode?: string;

  // Test results over time
  results: LabResult[];

  // Reference ranges and interpretation
  referenceRanges: ReferenceRange[];
  criticalValues: { low?: number; high?: number };

  // Trend analysis
  trendAnalysis: {
    overallTrend: "improving" | "worsening" | "stable" | "fluctuating";
    trendPeriod: { start: string; end: string };
    slope: number;
    rSquared: number;
    clinicalSignificance: "significant" | "borderline" | "not_significant";
  };

  // Clinical context
  indicationsForTesting: string[];
  clinicalInterpretation: string[];
  followUpRecommendations: string[];

  // Quality metrics
  testVariability: number; // Coefficient of variation
  preAnalyticalFactors: string[]; // Factors affecting test quality

  // Relationships
  relatedTests: string[]; // Tests typically ordered together
  complementaryTests: string[]; // Tests that provide additional information

  // Monitoring schedule
  monitoringFrequency?: string;
  nextDueDate?: string;
  reasonForMonitoring: string[];
}

interface LabResult {
  resultId: string;
  timestamp: string;
  orderDate: string;
  resultDate: string;

  // Result values
  numericValue?: number;
  textValue?: string;
  unit?: string;

  // Interpretation
  interpretation:
    | "normal"
    | "abnormal_low"
    | "abnormal_high"
    | "critical_low"
    | "critical_high";
  deltaFlag?: "improved" | "worsened" | "stable"; // Compared to previous result

  // Clinical context
  orderingProvider: string;
  indication: string;
  specimen: {
    type: string;
    collectionTime: string;
    collectionMethod: string;
    processingDelay?: string;
  };

  // Quality indicators
  qualityFlags: string[]; // e.g., "hemolyzed", "lipemic"
  reliability: "high" | "medium" | "low";

  // Follow-up actions
  actionsTaken: string[];
  alertsGenerated: string[];
  communicatedToPatient: boolean;

  // Data source
  laboratoryName: string;
  sourceDocumentId: string;
  confidence: number;
}

interface ImagingHistory {
  studies: ImagingStudy[];
  imagingTimelines: ImagingTimeline[];
  radiationExposure: RadiationExposureHistory;
  contrastReactions: ContrastReactionHistory[];
}

interface ImagingStudy {
  studyId: string;
  studyType: string; // e.g., "CT_chest", "MRI_brain"
  studyDate: string;

  // Study details
  indication: string;
  technique: string;
  contrast: {
    used: boolean;
    type?: string;
    amount?: string;
    reactions?: string[];
  };

  // Findings
  findings: {
    majorFindings: Finding[];
    minorFindings: Finding[];
    incidentalFindings: Finding[];
    comparisonWithPrior?: ComparisonFindings;
  };

  // Quality and limitations
  studyQuality: "excellent" | "good" | "adequate" | "limited" | "poor";
  limitations: string[];
  artifacts: string[];

  // Clinical correlation
  clinicalCorrelation: {
    correlatesWithSymptoms: boolean;
    correlatesWithLabResults: boolean;
    clinicalSignificance: "high" | "moderate" | "low" | "uncertain";
  };

  // Follow-up recommendations
  followUpRecommendations: {
    additionalImaging?: string[];
    timeframe?: string;
    clinicalActions?: string[];
  };

  // Personnel and equipment
  radiologist: string;
  facility: string;
  equipment: string;

  // Data source
  sourceDocumentId: string;
  dicomAvailable: boolean;
  confidence: number;
}
```

## Efficient Querying and Filtering

> The interface below is `MetaHistoryQuery` in `meta-history-types.ts`. Only `entryTypes`, `orderBy`/`orderDirection` and `limit`/`offset` take effect today. The tag, time-range, significance and relationship examples depend on the pending query engine.

### Query Patterns for Flat Structure

The flat architecture enables powerful filtering and aggregation:

```typescript
// Query interface for flat entries
interface MetaHistoryQuery {
  patientId: string;

  // Filter by entry types
  entryTypes?: MetaHistoryEntryType[];

  // Filter by categories/tags
  categories?: string[];
  subcategories?: string[];
  tags?: string[];

  // Time range filtering
  timeRange?: {
    start: string;
    end: string;
    field?: "timestamp" | "timeRange"; // Which time field to filter on
  };

  // Clinical significance filtering
  clinicalSignificance?: ("critical" | "high" | "medium" | "low")[];
  minConfidence?: number;

  // Relationship filtering
  relatedTo?: string; // Entry ID

  // Pagination
  limit?: number;
  offset?: number;
  orderBy?: "timestamp" | "clinicalSignificance" | "confidence";
  orderDirection?: "asc" | "desc";
}

// Example queries

// Get all current medications
const currentMeds = await queryMetaHistory({
  patientId: "patient123",
  entryTypes: ["medication_current"],
});

// Get all cardiovascular-related entries from last 6 months
const cardiacHistory = await queryMetaHistory({
  patientId: "patient123",
  tags: ["cardiovascular"],
  timeRange: { start: "2023-07-15", end: "2024-01-15" },
});

// Get all high-significance entries
const criticalFindings = await queryMetaHistory({
  patientId: "patient123",
  clinicalSignificance: ["critical", "high"],
  orderBy: "timestamp",
  orderDirection: "desc",
});

// Get all measurements (any type)
const allMeasurements = await queryMetaHistory({
  patientId: "patient123",
  entryTypes: [
    "measurement_vital",
    "measurement_lab",
    "measurement_poc",
    "measurement_device",
    "measurement_patient",
  ],
});

// Get entries related to a specific diagnosis
const relatedToHypertension = await queryMetaHistory({
  patientId: "patient123",
  relatedTo: "diag_001", // Hypertension diagnosis ID
});
```

### Data Completeness and Quality Metrics (pending)

```typescript
interface DataCompletenessMetrics {
  overallCompleteness: number; // 0-1 scale

  objectCompleteness: {
    medicationHistory: number;
    clinicalSignals: number;
    riskProfile: number;
    allergies: number;
    vitalSigns: number;
    diagnostics: number;
    // ... other objects
  };

  temporalCompleteness: {
    dataGaps: TimeRange[];
    coveragePeriod: { start: string; end: string };
    updateFrequency: { [objectType: string]: string };
  };

  qualityMetrics: {
    accuracy: number; // 0-1 scale
    consistency: number; // 0-1 scale
    timeliness: number; // 0-1 scale
    reliability: number; // 0-1 scale
  };
}
```
