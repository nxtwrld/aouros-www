// META_HISTORIES Flat Architecture Types
// Based on META_HISTORIES.md flat structure design

export enum MetaHistoryEntryType {
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

export interface MetaHistoryEntry {
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
  embedding?: number[];
}

// Measurement threshold configuration for hybrid storage
export interface MeasurementThreshold {
  measurementType: string;

  // When to archive current data
  archivalTriggers: {
    maxPoints: number; // e.g., 10,000 for glucose, 86,400 for heart rate
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

// Time series data structures for hybrid storage
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  unit?: string;
  quality?: "excellent" | "good" | "fair" | "poor";
  context?: Record<string, any>;
}

export interface Anomaly {
  timestamp: string;
  value: number;
  type: "spike" | "drop" | "pattern_break" | "missing_data";
  context?: string;
  preserved: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export interface SummaryPoint {
  timestamp: string;
  timeRange: { start: string; end: string };
  statistics: {
    mean: number;
    min: number;
    max: number;
    stdDev?: number;
    count: number;
  };
  anomalies?: Anomaly[];
}

// META_HISTORIES Document Types for encrypted document storage
export interface MetaHistoryDocument {
  // Document metadata (stored in document.metadata)
  documentType: "meta_history_current" | "meta_history_archive";
  patientId: string;
  createdAt: string;
  lastUpdated: string;

  // Document content (encrypted and stored in document.content)
  entries: MetaHistoryEntry[];

  // For time-series documents only
  measurementType?: string;
  timeRange?: { start: string; end: string };

  // Archival metadata
  isArchive?: boolean;
  archiveGeneration?: number; // For multiple archive levels
  parentDocumentId?: string; // Reference to current document if this is archive
}

// Current document for high-frequency data (stored as encrypted document)
export interface CurrentDataDocument {
  // Uses existing document storage with AES encryption
  // document.type = 'meta_history_current'
  // document.metadata contains basic info
  // document.content contains this structure:

  measurementType: string;
  lastUpdated: string;

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

  // References to archived documents (document IDs)
  historicalDocumentIds: string[];
}

export interface HistoryReference {
  documentId: string;
  timeRange: { start: string; end: string };
  dataPoints: number;
  compressive: boolean;
}

// Historical document for archived data (stored as encrypted document)
export interface HistoricalDataDocument {
  // Uses existing document storage with AES encryption
  // document.type = 'meta_history_archive'
  // document.metadata contains basic info
  // document.content contains this structure:

  measurementType: string;
  timeRange: { start: string; end: string };
  archiveGeneration: number; // 0=most recent, 1=older, etc.

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

  // References to older archive documents
  olderArchiveDocumentIds: string[];
}

export interface CompressedTimeSeries {
  compressionMethod: "delta" | "linear_approx" | "wavelet";
  originalPoints: number;
  compressedSize: number;
  data: any; // Compressed representation
}

export interface ClinicalPattern {
  patternId: string;
  patternType: string;
  description: string;
  confidence: number;
  timeRange: { start: string; end: string };
}

export interface ClinicalEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  description: string;
  associatedMeasurements: string[];
}

// Query interface for flat entries
export interface MetaHistoryQuery {
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

// Measurement thresholds configuration
export const MEASUREMENT_THRESHOLDS: { [key: string]: MeasurementThreshold } = {
  heart_rate: {
    measurementType: "heart_rate",
    archivalTriggers: {
      maxPoints: 86400, // 24 hours at 1Hz
      maxAge: "24h",
      maxSizeBytes: 2_000_000, // 2MB
    },
    sampling: {
      rawFrequency: "1s",
      archiveFrequency: "1m", // Downsample to 1-minute averages
      preserveRules: ["anomalies", "clinical_events", "exercise_periods"],
    },
    clinicalPreservation: {
      medicationEvents: { before: "30m", after: "2h" },
      symptomOnset: { before: "1h", after: "1h" },
      exercisePeriods: { before: "15m", after: "30m" },
    },
  },

  blood_glucose: {
    measurementType: "blood_glucose",
    archivalTriggers: {
      maxPoints: 2016, // 1 week at 5-minute intervals
      maxAge: "7d",
      maxSizeBytes: 500_000, // 500KB
    },
    sampling: {
      rawFrequency: "5m",
      archiveFrequency: "15m", // Downsample to 15-minute averages
      preserveRules: ["all"], // Preserve all glucose readings
    },
    clinicalPreservation: {
      medicationEvents: { before: "1h", after: "4h" },
      symptomOnset: { before: "2h", after: "2h" },
      exercisePeriods: { before: "30m", after: "2h" },
    },
  },

  daily_weight: {
    measurementType: "weight",
    archivalTriggers: {
      maxPoints: 365, // 1 year of daily measurements
      maxAge: "365d",
      maxSizeBytes: 50_000, // 50KB
    },
    sampling: {
      rawFrequency: "1d",
      archiveFrequency: "1d", // Keep daily resolution
      preserveRules: ["all"], // Preserve all weight measurements
    },
    clinicalPreservation: {
      medicationEvents: { before: "7d", after: "30d" },
      symptomOnset: { before: "7d", after: "7d" },
      exercisePeriods: { before: "1d", after: "1d" },
    },
  },
};
