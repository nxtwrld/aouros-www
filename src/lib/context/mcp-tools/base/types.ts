/**
 * Shared types for MCP Medical Expert Tools
 */

export interface SearchResult {
  document: any;
  relevance: number;
  matchedTerms: string[];
  temporalClassification?: string;
  excerpt?: string;
}

export interface TimelineEvent {
  date: string;
  type: string;
  title: string;
  description: string;
  documentId?: string;
  confidence?: number;
}

export interface MedicalPattern {
  type: string;
  description: string;
  frequency: number;
  documents: string[];
  confidence: number;
}

export interface TrendData {
  metric: string;
  values: Array<{
    date: string;
    value: number;
    unit?: string;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: number;
}

export interface MedicationData {
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  indication?: string;
  status: 'active' | 'discontinued' | 'completed';
}

export interface TestResult {
  name: string;
  date: string;
  value?: string | number;
  unit?: string;
  referenceRange?: string;
  abnormal?: boolean;
  category: string;
}

export interface ProfileSummary {
  demographics: {
    age?: number;
    sex?: string;
    [key: string]: any;
  };
  conditions: Array<{
    name: string;
    status: string;
    diagnosedDate?: string;
  }>;
  medications: MedicationData[];
  allergies: Array<{
    substance: string;
    reaction?: string;
    severity?: string;
  }>;
  recentDocuments: number;
  lastVisit?: string;
}

export interface AssembledContext {
  summary: string;
  relevantDocuments: SearchResult[];
  keyFindings: string[];
  temporalContext: {
    recent: string[];
    historical: string[];
  };
  medicalContext?: {
    conditions: string[];
    medications: string[];
    procedures: string[];
  };
  metadata: {
    assemblyTime: number;
    documentCount: number;
    confidence: number;
  };
}

// Search options used across multiple tools
export interface SearchOptions {
  maxResults?: number;
  threshold?: number;
  documentTypes?: string[];
  timeframe?: {
    start?: string;
    end?: string;
  };
  includecontent?: boolean;
}

// Common error response format
export interface ErrorResponse {
  error: string;
  details?: string;
  suggestion?: string;
}