/**
 * Type definitions for the Context & Embeddings System
 */

import type { Document } from '$lib/documents/types.d';
import type { MetaHistoryEntry } from '$lib/health/meta-history-types';

// Core embedding types
export interface EmbeddingVector {
  vector: Float32Array;
  dimensions: number;
  normalized: boolean;
}

export interface EmbeddingMetadata {
  documentId: string;
  summary: string;
  documentType: string;
  date: string;
  provider: string;
  model: string;
  language?: string;
  tags?: string[];
}

export interface DocumentEmbedding {
  id: string;
  documentId: string;
  vector: EmbeddingVector;
  metadata: EmbeddingMetadata;
  timestamp: string;
}

// Search types
export interface SearchOptions {
  maxResults?: number;
  threshold?: number;
  timeDecay?: TimeDecayConfig;
  filters?: SearchFilters;
  includeMetadata?: boolean;
}

export interface TimeDecayConfig {
  enabled: boolean;
  halfLifeDays: number;
  minWeight: number;
}

export interface SearchFilters {
  documentTypes?: string[];
  dateRange?: { start: string; end: string };
  tags?: string[];
  language?: string;
}

export interface ContextMatch {
  documentId: string;
  similarity: number;
  metadata: EmbeddingMetadata;
  relevanceScore: number; // Combined similarity + time decay
  excerpt?: string;
}

// Context assembly types
export interface AssembledContext {
  summary: string;
  keyPoints: KeyPoint[];
  relevantDocuments: ContextDocument[];
  medicalContext?: MedicalContext;
  confidence: number;
  tokenCount: number;
}

export interface KeyPoint {
  text: string;
  type: 'finding' | 'medication' | 'diagnosis' | 'procedure' | 'risk' | 'recommendation';
  date: string;
  confidence: number;
  sourceDocumentId: string;
}

export interface ContextDocument {
  documentId: string;
  type: string;
  date: string;
  excerpt: string;
  relevance: number;
}

// Medical context types
export interface MedicalContext {
  timeline?: MedicalTimeline;
  patterns?: MedicalPattern[];
  riskFactors?: RiskAssessment;
  currentMedications?: Medication[];
  activeConditions?: Condition[];
  recentChanges?: RecentChange[];
}

export interface MedicalTimeline {
  events: MedicalEvent[];
  timeRange: { start: string; end: string };
  significantEvents: string[];
}

export interface MedicalEvent {
  id: string;
  date: string;
  type: 'diagnosis' | 'medication' | 'procedure' | 'lab_result' | 'symptom';
  description: string;
  significance: 'critical' | 'high' | 'medium' | 'low';
  relatedEvents?: string[];
}

export interface MedicalPattern {
  patternType: string;
  description: string;
  confidence: number;
  timeRange: { start: string; end: string };
  supportingEvents: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  factor: string;
  category: 'demographic' | 'clinical' | 'behavioral' | 'genetic' | 'environmental';
  riskLevel: number; // 0-1
  modifiable: boolean;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  status: 'active' | 'discontinued' | 'paused';
  effectiveness?: 'effective' | 'partially_effective' | 'ineffective' | 'unknown';
}

export interface Condition {
  name: string;
  icdCode?: string;
  diagnosisDate: string;
  status: 'active' | 'resolved' | 'managed';
  severity: 'mild' | 'moderate' | 'severe';
}

export interface RecentChange {
  date: string;
  type: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

// MCP Tool types
export interface MCPToolCall {
  tool: string;
  parameters: any;
  result?: any;
  error?: string;
  timestamp: string;
}

export interface MCPToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime: number;
    documentsAccessed?: number;
    cacheHit?: boolean;
  };
}

// Provider types
export interface EmbeddingProviderConfig {
  provider: 'openai' | 'local' | 'gemini';
  model: string;
  dimensions: number;
  maxTokens?: number;
  costPer1kTokens?: number;
}

export interface EmbeddingGenerationOptions {
  provider?: string;
  model?: string;
  language?: string;
  extractKeyPoints?: boolean;
}

// Session integration types
export interface ContextSnapshot {
  sessionId: string;
  userId: string;
  timestamp: string;
  relevantDocuments: string[];
  medicalContext: MedicalContext;
  conversationTopics: string[];
}

export interface ContextUpdate {
  type: 'document_added' | 'context_refreshed' | 'pattern_detected' | 'risk_identified';
  sessionId: string;
  data: any;
  timestamp: string;
}

// Chat integration types
export interface ContextualChatRequest {
  message: string;
  sessionId: string;
  userId: string;
  conversationHistory?: ChatMessage[];
  contextOptions?: {
    maxDocuments?: number;
    includeMedialHistory?: boolean;
    timeRange?: { start: string; end: string };
  };
}

export interface ContextualChatResponse {
  response: string;
  contextUsed: AssembledContext;
  relevantDocuments: string[];
  toolCalls?: MCPToolCall[];
  suggestions?: string[];
  confidence: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}