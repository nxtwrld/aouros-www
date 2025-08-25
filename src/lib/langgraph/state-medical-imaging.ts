/**
 * Medical Imaging Workflow State
 *
 * Extends the base DocumentProcessingState with specialized channels
 * for medical image analysis workflows
 */

import type { DocumentProcessingState } from "./state";

// Medical imaging specific interfaces
export interface ImageAnalysisResult {
  description: string;
  confidence: number;
  visualElements: string[];
  imageQuality: "excellent" | "good" | "fair" | "poor";
  timestamp: string;
}

export interface DetectedBodyPart {
  name: string;
  region:
    | "head"
    | "chest"
    | "abdomen"
    | "pelvis"
    | "extremities"
    | "spine"
    | "other";
  visibility: "complete" | "partial" | "obscured";
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  confidence: number;
}

export interface DetectedAnomaly {
  type:
    | "mass"
    | "fracture"
    | "foreign_object"
    | "inflammation"
    | "deformity"
    | "other";
  description: string;
  location: {
    bodyPart: string;
    region: string;
    coordinates?: {
      x: number;
      y: number;
      width?: number;
      height?: number;
    };
  };
  severity: "critical" | "severe" | "moderate" | "mild" | "minimal";
  confidence: number;
  followUpRequired: boolean;
  differentialDiagnoses?: string[];
}

export interface MedicalMeasurement {
  type: "distance" | "area" | "volume" | "density" | "angle" | "count";
  value: number;
  unit: string;
  description: string;
  location: string;
  referenceRange?: {
    min?: number;
    max?: number;
    normal?: number;
  };
  isAbnormal?: boolean;
  confidence: number;
}

export interface ClinicalFinding {
  category: "normal" | "abnormal" | "incidental" | "artifact";
  description: string;
  clinicalSignificance:
    | "critical"
    | "significant"
    | "moderate"
    | "minor"
    | "none";
  recommendedActions: string[];
  urgency: number; // 1-10 scale
  correlationNeeded: boolean;
  followUpTimeframe?: "immediate" | "urgent" | "routine" | "optional";
}

export interface ProcessingMetadata {
  processingStartTime: string;
  processingEndTime?: string;
  totalProcessingTime?: number;
  nodeExecutionTimes: Record<string, number>;
  tokensUsed: Record<string, number>;
  totalTokens: number;
  aiModelsUsed: string[];
  processingErrors?: string[];
}

// Extended state interface for medical imaging workflows
export interface MedicalImagingState extends DocumentProcessingState {
  // Medical imaging specific channels
  imageAnalysis?: ImageAnalysisResult;
  detectedBodyParts?: DetectedBodyPart[];
  detectedAnomalies?: DetectedAnomaly[];
  measurements?: MedicalMeasurement[];
  clinicalFindings?: ClinicalFinding[];
  primaryAnatomicalRegion?: string;
  urgentFindings?: boolean;

  // Processing results channels (for workflow state management)
  visualAnalysis?: any;
  bodyPartsDetection?: any;
  anomalyDetection?: any;
  measurementExtraction?: any;

  // Processing metadata
  imagingMetadata?: {
    modality?: string;
    bodyPartExamined?: string;
    viewPosition?: string;
    studyDescription?: string;
    studyDate?: string;
    isDicomExtracted?: boolean;
    originalDicomMetadata?: any;
    imageQuality?: string;
    technicalQuality?: any;
    deviceInfo?: {
      manufacturer?: string;
      modelName?: string;
      stationName?: string;
      institutionName?: string;
    };
    imageParameters?: {
      pixelSpacing?: number[];
      windowCenter?: number[];
      windowWidth?: number[];
    };
  };

  // Patient and performer information
  patientInfo?: {
    fullName: string;
    biologicalSex?: "male" | "female";
    identifier: string;
    birthDate?: string;
    insurance?: {
      provider?: string;
      number?: string;
    };
  };
  medicalPerformers?: Array<{
    role: string;
    name: string;
    title?: string;
    specialty?: string;
    licenseNumber?: string;
    institution?: {
      name?: string;
      department?: string;
      address?: string;
      phone?: string;
      email?: string;
    };
    signature?: string;
    datePerformed?: string;
    isPrimary?: boolean;
  }>;
  patientPerformerDetection?: any;

  // Unified result structure (following unified workflow pattern)
  medicalImagingAnalysis?: any;

  // Workflow execution metadata
  processingMetadata?: ProcessingMetadata;

  // Quality and validation
  imageQualityAssessment?: {
    overallQuality: "excellent" | "good" | "fair" | "poor";
    issues: string[];
    recommendations: string[];
  };

  // Analysis summary
  analysisSummary?: {
    keyFindings: string[];
    overallImpression: string;
    recommendedFollowUp: string[];
    urgentFindings: boolean;
    confidence: number;
  };
}

// Configuration interface for medical imaging workflow
export interface MedicalImagingWorkflowConfig {
  // Processing options
  enableDetailedAnalysis?: boolean;
  enableAnomalyDetection?: boolean;
  enableMeasurements?: boolean;
  enableClinicalCorrelation?: boolean;

  // Quality settings
  minimumConfidenceThreshold?: number;
  detailedReporting?: boolean;

  // Performance settings
  maxProcessingTime?: number;
  parallelProcessing?: boolean;

  // Integration settings
  includeOriginalMetadata?: boolean;
  generateStructuredReport?: boolean;

  // Debug and development
  enableProgressTracking?: boolean;
  saveIntermediateResults?: boolean;
  debugMode?: boolean;
}

// Progress callback for medical imaging workflows
export type MedicalImagingProgressCallback = (event: {
  stage: string;
  progress: number;
  message: string;
  data?: any;
  nodeResults?: any;
}) => void;
