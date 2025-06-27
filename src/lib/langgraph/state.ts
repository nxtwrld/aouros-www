import type { Signal } from "$lib/types";
import type { Content, TokenUsage } from "$lib/ai/types";
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

// Enhanced signal types for the new system
export interface EnhancedSignal extends Signal {
  // Core fields (preserved for compatibility)
  signal: string;
  value: any;
  unit: string;
  reference: string;
  date: string;
  urgency?: number;
  source?: string;
  refId?: string;

  // Enhanced fields
  context: SignalContext;
  validation: SignalValidation;
  relationships: SignalRelationship[];
  metadata: SignalMetadata;
}

export interface SignalContext {
  documentType: string;
  specimen?: string;
  method?: string;
  fasting?: boolean;
  location?: string;
  clinicalContext?: string[];
}

export interface SignalValidation {
  status: "validated" | "unvalidated" | "suspicious" | "invalid";
  confidence: number;
  validationSources: string[];
  warnings?: string[];
  alternatives?: string[];
}

export interface SignalRelationship {
  type: "derives_from" | "correlates_with" | "contradicts" | "confirms";
  targetSignal: string;
  strength: number;
  formula?: string;
}

export interface SignalMetadata {
  extractedBy: string;
  extractionConfidence: number;
  alternativeInterpretations?: any[];
  clinicalNotes?: string;
  trending?: any;
}

// Feature detection result from existing system
export interface FeatureDetection {
  type: string;
  confidence: number;
  features: string[];
}

// Medical analysis result from existing system
export interface MedicalAnalysis {
  content: any;
  tokenUsage: TokenUsage;
  provider?: string;
  error?: string;
}

// Document type analysis result
export interface DocumentTypeAnalysis {
  detectedType: string | null;
  confidence: number;
  alternativeTypes: Array<{ type: string; confidence: number }>;
  contentFeatures: {
    medicalTermDensity: number;
    structuredData: boolean;
    reportLength: number;
    specialtyIndicators: string[];
  };
  schemaRecommendation: any;
}

// LangGraph workflow state
export interface DocumentProcessingState {
  // Input
  images?: string[];
  text?: string;
  language?: string;
  options?: any;
  metadata?: Record<string, any>;

  // Processing state
  content: Content[];
  tokenUsage: TokenUsage;

  // Analysis results
  featureDetection?: FeatureDetection;
  medicalAnalysis?: MedicalAnalysis;
  signals?: EnhancedSignal[];

  // Document type routing
  documentTypeAnalysis?: DocumentTypeAnalysis;
  selectedSchema?: FunctionDefinition;
  processingComplexity?: "low" | "medium" | "high";

  // Enhanced capabilities
  selectedProvider?: string;
  fallbackProviders?: string[];
  providerMetadata?: any;
  validationResults?: Map<string, SignalValidation>;
  relationships?: SignalRelationship[];
  clinicalPatterns?: string[];
  missingSignals?: string[];
  confidence?: number;

  // Error handling
  errors?: Array<{
    node: string;
    error: string;
    timestamp: string;
  }>;
  processingErrors?: string[];
}

// Node execution result
export interface NodeResult {
  updates: Partial<DocumentProcessingState>;
  continueToNext: boolean;
  error?: string;
}

// Workflow configuration
export interface WorkflowConfig {
  useEnhancedSignals?: boolean;
  enableExternalValidation?: boolean;
  preferredProvider?: string;
  streamResults?: boolean;
}
