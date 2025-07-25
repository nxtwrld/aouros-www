# Mixture of Experts (MoE) Session Analysis - Implementation Guide

This document provides detailed implementation guidance for the schema-based Mixture of Experts approach to medical session analysis in Mediqom, aligned with the comprehensive workflow defined in [AI_SESSION_WORKFLOW.md](./AI_SESSION_WORKFLOW.md).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Workflow Integration](#workflow-integration)
3. [Schema-Based Expert System](#schema-based-expert-system)
4. [Expert Set Configurations](#expert-set-configurations)
5. [Expert Schema Definitions](#expert-schema-definitions)
6. [Consensus Building System](#consensus-building-system)
7. [Visualization Generators](#visualization-generators)
8. [API Integration](#api-integration)
9. [Real-time Streaming](#real-time-streaming)
10. [Testing Strategy](#testing-strategy)

## Architecture Overview

The MoE system implements the architecture defined in the [AI_SESSION_WORKFLOW.md](./AI_SESSION_WORKFLOW.md), using a **schema-based configuration approach** that aligns with the existing `src/lib/configurations/` system. This ensures consistency, maintainability, and seamless integration with the current codebase.

### Directory Structure

```
src/lib/session-moe/
├── config/
│   └── loader.ts                  # Configuration management & dynamic schema loading
├── experts/
│   └── base.ts                    # Schema-based base expert class with context integration
├── consensus/
│   └── builder.ts                 # Consensus building algorithm with context weighting
├── visualization/
│   └── sankey-generator.ts        # Context-enhanced Sankey diagram generator
├── context/
│   └── integration.ts             # Context assembly integration layer
└── index.ts                       # Main exports & context-aware MoE analyzer

config/
├── session-moe.json               # Main MoE configuration with context settings
├── session-moe-gp_basic.json      # GP Basic expert set with context integration
├── session-moe-comprehensive.json # Comprehensive expert set with full context
└── session-moe-emergency.json     # Emergency expert set with rapid context

src/lib/configurations/moe-experts/
├── gp-core.ts                     # GP expert schema with context utilization
├── diagnostic-specialist.ts       # Diagnostic specialist schema with historical patterns
├── clinical-inquiry.ts            # Clinical inquiry schema with context prioritization
├── treatment-planner.ts           # Treatment planning schema with historical effectiveness
└── safety-monitor.ts              # Safety monitoring schema with context-aware alerts

src/lib/context/                   # Context Assembly System (implemented)
├── client-database/               # Client-side vector database
├── embeddings/                    # Embedding generation and storage
├── context-assembly/              # Context assembly and optimization
├── integration/                   # Profile and session integration
└── types.ts                       # Context system type definitions
```

### Key Architectural Principles (Per Workflow)

1. **Five Core Experts**: GP, Diagnostic Specialist, Treatment Planner, Clinical Inquiry, and Safety Monitor
2. **Context Assembly Integration**: Intelligent context retrieval and assembly using embeddings and semantic search
3. **Schema-Based Configuration**: JSON schemas define expert behavior and output structure with context utilization
4. **Parallel Processing**: All experts analyze simultaneously with assembled context for optimal performance
5. **Progressive Streaming**: Results stream via SSE as experts complete with context metadata
6. **Context-Enhanced Consensus Building**: Weighted voting with conflict detection and context confidence integration
7. **Interactive Visualization**: Context-enhanced Sankey diagrams with accept/suppress functionality and context attribution

## Workflow Integration

The implementation follows the detailed workflow phases with integrated context assembly:

### Phase 1: Input Processing
- Audio chunks → Transcription → Context enhancement
- Patient history and previous MoE analyses integrated

### Phase 1.5: Context Assembly (NEW)
- **Semantic Context Search**: Real-time embedding generation and vector similarity search
- **Context Assembly**: Using ContextAssembler to compile relevant medical context
- **Token Optimization**: Context optimization within AI model limits (4000 tokens default)
- **Confidence Scoring**: Context relevance and quality assessment

### Phase 2: Enhanced Analysis with Context
- **Context-Aware Input Extraction**: Input extraction enhanced with assembled context
- **Historical Context Enhancement**: Origin tags include 'assembled' for context-derived insights
- **Context-Informed Question-Answer Evaluation**: Question prioritization using context relevance

### Phase 3: Conditional Processing
- Change detection determines if MoE analysis proceeds
- **Context Change Detection**: Monitor context relevance changes
- No changes → Wait for new transcript
- Changes detected → Trigger context-aware expert analysis

### Phase 4: Context-Enhanced Expert Analysis
- Five experts analyze in parallel with assembled context
- Each expert utilizes context for enhanced focus and capabilities
- Results include confidence scores, evidence chains, and context attribution
- **Context Confidence Integration**: Expert analysis weighted by context quality

### Phase 5: Context-Enhanced Output Generation
- **Context-Weighted Consensus Building**: Consensus across experts with context confidence factors
- Structured node and link generation with context source attribution
- Risk and safety integration enhanced by historical context

### Phase 6: Context-Enhanced Visualization
- **Context-Aware Sankey Diagram Creation**: Visualization enhanced with context indicators
- Progressive streaming updates with context metadata
- Accept/suppress functionality with context conflict detection
- **Context Explorer Features**: Interactive context source exploration

## Schema-Based Expert System

The new schema-based approach eliminates hardcoded prompts and structures, making the system highly configurable and maintainable.

### Base Expert Class

```typescript
// src/lib/session-moe/experts/base.ts - Schema-based implementation
import { logger } from "$lib/logging/logger";
import { getMoEConfig, getExpertConfig, getProviderModel } from "../config/loader";
import type { ExpertConfig, ModelConfig } from "../config/loader";

export interface ExpertContext {
  transcript: string;
  language: string;
  previousAnalyses?: any[];
  currentHypotheses?: DiagnosisHypothesis[];
  metadata?: any;
  
  // NEW: Assembled Context from Context Assembly System
  assembledContext?: {
    summary: string;                              // Optimized context summary
    keyPoints: ContextKeyPoint[];                 // Extracted medical insights
    relevantDocuments: ContextDocument[];        // Source documents with excerpts
    medicalContext?: MedicalContext;              // Clinical timeline and insights
    confidence: number;                           // Overall context confidence (0-1)
    tokenCount: number;                          // Context token usage
    contextSources: {
      documentIds: string[];                     // Source document IDs
      searchQuery: string;                       // Query used for context search
      searchResults: number;                     // Number of search results
      assemblyTimestamp: string;                 // When context was assembled
    };
  };
  
  // Enhanced patient data for Epic 0 compliance
  completePatientHistory: {
    chronicConditions: ChronicCondition[];
    previousDiagnoses: HistoricalDiagnosis[];
    medicationHistory: MedicationHistory[];
    familyHistory: FamilyHistory;
    allergies: Allergy[];
    adverseReactions: AdverseReaction[];
    socialDeterminants: SocialFactors;
    treatmentResponses: TreatmentResponse[];
    complianceHistory: ComplianceRecord[];
  };
  
  // Current clinical data
  currentMedications: Medication[];
  vitalSigns: VitalSignHistory[];
  labResults: LabResult[];
  imagingResults: ImagingResult[];
  
  // Risk analysis and patterns
  identifiedPatterns: HistoricalPattern[];
  riskFactors: RiskFactor[];
  demographics: PatientDemographics;
}

// Context Assembly System Types
interface ContextKeyPoint {
  text: string;
  type: 'finding' | 'medication' | 'procedure' | 'risk';
  date?: string;
  confidence: number;
  sourceDocumentId: string;
}

interface ContextDocument {
  documentId: string;
  type: string;
  date: string;
  excerpt: string;
  relevance: number;
}

interface MedicalContext {
  timeline: {
    events: any[];
    timeRange: { start: string; end: string };
    significantEvents: any[];
  };
  recentChanges: Array<{
    date: string;
    type: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

export interface ExpertAnalysis {
  expertId: string;
  findings: {
    symptoms: SymptomNode[];
    diagnoses?: DiagnosisNode[];
    treatments?: TreatmentNode[];
    inquiries?: InquiryNode[];
    confidence: number;
  };
  reasoning: string;
  evidenceChain: EvidenceLink[];
  processingTime: number;
  metadata?: {
    modelUsed: string;
    temperature: number;
    tokensUsed?: number;
  };
}

// Enhanced context interface for MCP tool integration
export interface EnhancedExpertContext extends ExpertContext {
  // Medical timeline data from context system
  medicalTimeline?: MedicalTimeline;
  medicalPatterns?: MedicalPatterns;
  
  // Safety and risk data
  drugInteractions?: DrugInteractionAnalysis;
  riskAssessment?: RiskAssessment;
  
  // Treatment and family history
  treatmentHistory?: TreatmentEffectivenessAnalysis;
  familyHistory?: FamilyGeneticInsights;
  
  // Structured medical data
  structuredMedicalData?: StructuredMedicalData;
}

// MoE Context Adapter interface
export interface MoEContextAdapter {
  getContextForExpert(
    expertType: string,
    patientId: string,
    currentContext: ExpertContext
  ): Promise<EnhancedExpertContext>;
}

// Supporting medical data types for enhanced context
export interface MedicalTimeline {
  timeline: MedicalEvent[];
  condition?: string;
  timeRange?: { start: string; end: string };
  totalDocuments: number;
}

export interface MedicalEvent {
  documentId: string;
  date: string;
  type: string;
  summary?: string;
  significance: number;
}

export interface MedicalPatterns {
  patterns: IdentifiedPattern[];
  patternType: string;
  lookbackPeriod: string;
  correlationStrength: number;
}

export interface IdentifiedPattern {
  patternName: string;
  description: string;
  confidence: number;
  occurrences: PatternOccurrence[];
}

export interface PatternOccurrence {
  date: string;
  context: string;
  significance: number;
}

export interface DrugInteractionAnalysis {
  interactions: DrugInteraction[];
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severityLevel: 'contraindicated' | 'major' | 'moderate' | 'minor';
  mechanism: string;
  potentialEffects: string[];
  recommendation: string;
}

export interface RiskAssessment {
  overallRiskScore: number;
  riskCategories: RiskCategory[];
  recommendations: string[];
  timeHorizon: string;
}

export interface RiskCategory {
  category: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface TreatmentEffectivenessAnalysis {
  treatments: TreatmentAnalysis[];
  overallCompliance: number;
  recommendations: string[];
}

export interface TreatmentAnalysis {
  treatmentName: string;
  effectiveness: 'highly_effective' | 'moderately_effective' | 'minimally_effective' | 'ineffective';
  sideEffects: string[];
  complianceScore: number;
  recommendation: string;
}

export interface FamilyGeneticInsights {
  familyHistory: FamilyHistoryEntry[];
  geneticRisks: GeneticRisk[];
  relevanceToCurrentSymptoms: number;
}

export interface FamilyHistoryEntry {
  relationship: string;
  condition: string;
  ageOfOnset?: number;
  relevanceScore: number;
}

export interface GeneticRisk {
  condition: string;
  inheritancePattern: string;
  riskLevel: 'low' | 'moderate' | 'high';
  recommendations: string[];
}

export interface StructuredMedicalData {
  dataTypes: string[];
  aggregationLevel: 'raw' | 'summary' | 'trends';
  data: Record<string, any>;
  lastUpdated: string;
}

export abstract class MedicalExpertBase {
  protected config: ExpertConfig;
  protected modelConfig: ModelConfig;
  protected contextAdapter: MoEContextAdapter | null = null;
  
  constructor(protected readonly expertKey: string) {
    const expertConfig = getExpertConfig(expertKey);
    if (!expertConfig) {
      throw new Error(`Expert configuration not found for: ${expertKey}`);
    }
    
    this.config = expertConfig;
    
    const modelConfig = getProviderModel(expertConfig.provider, expertConfig.modelType);
    if (!modelConfig) {
      throw new Error(`Model configuration not found`);
    }
    
    this.modelConfig = modelConfig;
  }
  
  /**
   * Initialize context integration for expert analysis
   */
  async initializeContextIntegration(contextAdapter: MoEContextAdapter): Promise<void> {
    this.contextAdapter = contextAdapter;
    logger.moe?.info(`Context integration initialized for expert ${this.id}`);
  }
  
  // Property getters
  get id(): string { return this.config.id; }
  get name(): string { return this.config.name; }
  get specialty(): string { return this.config.specialty; }
  get confidence(): number { return this.config.baseConfidence; }
  get reasoningStyle(): string { return this.config.reasoningStyle; }
  
  /**
   * Get the schema configuration for this expert
   */
  protected async getExpertSchema(): Promise<any> {
    try {
      const { getExpertSchema } = await import('../config/loader');
      return await getExpertSchema(this.expertKey);
    } catch (error) {
      logger.moe?.error(`Failed to load schema for expert ${this.id}`, { error });
      throw new Error(`Schema loading failed for expert ${this.expertKey}: ${error.message}`);
    }
  }
  
  /**
   * Enhance context with expert-specific medical data access
   */
  protected async enhanceContextWithMedicalData(context: ExpertContext): Promise<ExpertContext> {
    if (!this.contextAdapter) {
      logger.moe?.debug(`No context adapter available for expert ${this.id}, using base context`);
      return context;
    }
    
    try {
      // Extract patient ID from context (assuming it's available in metadata or demographics)
      const patientId = context.demographics?.patientId || context.metadata?.patientId;
      if (!patientId) {
        logger.moe?.warn(`No patient ID found in context for expert ${this.id}`);
        return context;
      }
      
      // Get enhanced context specific to this expert type
      const enhancedContext = await this.contextAdapter.getContextForExpert(
        this.expertKey,
        patientId,
        context
      );
      
      logger.moe?.info(`Enhanced context retrieved for expert ${this.id}`, {
        expertType: this.expertKey,
        patientId,
        enhancedFields: Object.keys(enhancedContext).filter(key => !context.hasOwnProperty(key))
      });
      
      return enhancedContext;
    } catch (error) {
      logger.moe?.error(`Failed to enhance context for expert ${this.id}`, { error });
      // Return original context on enhancement failure
      return context;
    }
  }
  
  /**
   * Invoke the LLM using schema-based approach with AI provider abstraction
   */
  protected async invokeWithSchema(context: ExpertContext): Promise<any> {
    try {
      // First enhance context with expert-specific medical data
      const enhancedContext = await this.enhanceContextWithMedicalData(context);
      
      const schema = await this.getExpertSchema();
      
      // Use existing AI provider abstraction for consistency
      const { AIProviderAbstraction } = await import('$lib/ai/providers/abstraction');
      const aiProvider = AIProviderAbstraction.getInstance();
      
      // Map provider to abstraction enum
      const providerMap = {
        'openai': 'OPENAI_GPT4',
        'gemini': 'GOOGLE_GEMINI',
        'google': 'GOOGLE_GEMINI', 
        'anthropic': 'ANTHROPIC_CLAUDE'
      };
      
      const provider = providerMap[this.config.provider];
      if (!provider) {
        throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
      
      // Create structured content using enhanced context
      const content = [{
        type: "text" as const,
        text: this.buildContextualPrompt(schema, enhancedContext)
      }];
      
      const tokenUsage = { total: 0 };
      
      // Use AI provider abstraction with schema
      const result = await aiProvider.analyzeDocument(
        provider as any,
        content,
        schema,
        tokenUsage,
        {
          language: context.language,
          temperature: this.modelConfig.temperature,
          maxRetries: 3,
          timeoutMs: 30000
        }
      );
      
      return result;
    } catch (error) {
      logger.moe?.error(`Schema-based invocation failed for expert ${this.id}`, { error });
      throw error;
    }
  }
  
  /**
   * Build contextual prompt using schema description and enhanced context
   */
  private buildContextualPrompt(schema: any, context: ExpertContext): string {
    let prompt = schema.description || 'Analyze the provided medical information.';
    
    // Replace language placeholders
    prompt = prompt.replace(/\[LANGUAGE\]/g, context.language);
    
    // Add structured context
    prompt += `\n\nPATIENT TRANSCRIPT:\n${context.transcript}`;
    
    // Enhanced medical context from context system
    if (context.completePatientHistory && Object.keys(context.completePatientHistory).length > 0) {
      prompt += `\n\nCOMPREHENSIVE PATIENT HISTORY:\n${JSON.stringify(context.completePatientHistory, null, 2)}`;
    }
    
    // Enhanced context data from MCP tools
    if ((context as any).medicalTimeline) {
      prompt += `\n\nMEDICAL TIMELINE:\n${JSON.stringify((context as any).medicalTimeline, null, 2)}`;
    }
    
    if ((context as any).medicalPatterns) {
      prompt += `\n\nIDENTIFIED MEDICAL PATTERNS:\n${JSON.stringify((context as any).medicalPatterns, null, 2)}`;
    }
    
    if ((context as any).drugInteractions) {
      prompt += `\n\nDRUG INTERACTIONS & SAFETY:\n${JSON.stringify((context as any).drugInteractions, null, 2)}`;
    }
    
    if ((context as any).riskAssessment) {
      prompt += `\n\nRISK STRATIFICATION:\n${JSON.stringify((context as any).riskAssessment, null, 2)}`;
    }
    
    if ((context as any).treatmentHistory) {
      prompt += `\n\nTREATMENT EFFECTIVENESS HISTORY:\n${JSON.stringify((context as any).treatmentHistory, null, 2)}`;
    }
    
    if ((context as any).familyHistory) {
      prompt += `\n\nFAMILY & GENETIC HISTORY:\n${JSON.stringify((context as any).familyHistory, null, 2)}`;
    }
    
    if ((context as any).structuredMedicalData) {
      prompt += `\n\nSTRUCTURED MEDICAL DATA:\n${JSON.stringify((context as any).structuredMedicalData, null, 2)}`;
    }
    
    // Current working hypotheses
    if (context.currentHypotheses?.length > 0) {
      prompt += `\n\nCURRENT WORKING HYPOTHESES:\n${context.currentHypotheses.map(h => `- ${h.name} (confidence: ${h.confidence})`).join('\n')}`;
    }
    
    // Current clinical data
    if (context.currentMedications?.length > 0) {
      prompt += `\n\nCURRENT MEDICATIONS:\n${context.currentMedications.map(m => `- ${m.name} ${m.dosage || ''} (${m.frequency || ''})`).join('\n')}`;
    }
    
    if (context.vitalSigns?.length > 0) {
      prompt += `\n\nRECENT VITAL SIGNS:\n${context.vitalSigns.slice(0, 3).map(v => `- ${v.date}: ${v.parameter} = ${v.value} ${v.unit || ''}`).join('\n')}`;
    }
    
    if (context.labResults?.length > 0) {
      prompt += `\n\nRECENT LAB RESULTS:\n${context.labResults.slice(0, 5).map(l => `- ${l.date}: ${l.test} = ${l.value} ${l.unit || ''} (${l.referenceRange || 'No ref range'})`).join('\n')}`;
    }
    
    // Risk factors and patterns
    if (context.identifiedPatterns?.length > 0) {
      prompt += `\n\nIDENTIFIED PATTERNS:\n${context.identifiedPatterns.map(p => `- ${p.description} (confidence: ${p.confidence})`).join('\n')}`;
    }
    
    if (context.riskFactors?.length > 0) {
      prompt += `\n\nRISK FACTORS:\n${context.riskFactors.map(r => `- ${r.factor}: ${r.description} (level: ${r.riskLevel})`).join('\n')}`;
    }
    
    // Add expert context
    prompt += `\n\nEXPERT CONTEXT:
- Specialty: ${this.specialty}
- Reasoning Style: ${this.reasoningStyle}
- Base Confidence: ${this.confidence}
- Context Enhancement: ${this.contextAdapter ? 'Enabled' : 'Disabled'}

Please provide your analysis following the structured schema format, ensuring all responses are in ${context.language} language.
Consider all available medical context data when forming your clinical reasoning and recommendations.`;
    
    return prompt;
  }
  
  // Abstract method for expert implementations
  abstract analyze(context: ExpertContext): Promise<ExpertAnalysis>;
  
  // Utility methods
  protected async measurePerformance<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    return { result, duration };
  }
  
  protected getSetting<T>(key: string, defaultValue: T): T {
    return this.config.settings[key] ?? defaultValue;
  }
  
  /**
   * Log analysis completion with context usage metrics
   */
  protected logAnalysisCompletion(
    context: ExpertContext,
    analysis: ExpertAnalysis,
    processingTime: number
  ): void {
    const enhancedFields = Object.keys(context).filter(key => 
      ['medicalTimeline', 'medicalPatterns', 'drugInteractions', 'riskAssessment', 'treatmentHistory', 'familyHistory', 'structuredMedicalData'].includes(key)
    );
    
    logger.moe?.info(`Expert analysis completed`, {
      expertId: this.id,
      expertType: this.expertKey,
      processingTime,
      contextEnhancement: this.contextAdapter ? 'enabled' : 'disabled',
      enhancedFieldsUsed: enhancedFields,
      findingsGenerated: {
        symptoms: analysis.findings.symptoms?.length || 0,
        diagnoses: analysis.findings.diagnoses?.length || 0,
        treatments: analysis.findings.treatments?.length || 0,
        inquiries: analysis.findings.inquiries?.length || 0
      },
      overallConfidence: analysis.findings.confidence,
      evidenceChainLength: analysis.evidenceChain?.length || 0
    });
  }
  
  /**
   * Generate unique ID for analysis nodes
   */
  protected generateId(prefix: string): string {
    return `${prefix}_${this.expertKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Context Assembly Integration

The MoE system integrates with the Context Assembly system to provide intelligent, context-aware analysis. This integration enhances expert analysis with relevant medical history and patterns.

### Context Integration Layer

```typescript
// src/lib/session-moe/context/integration.ts
import { contextAssembler } from '$lib/context/context-assembly/context-composer';
import { profileContextManager } from '$lib/context/integration/profile-context';
import { embeddingManager } from '$lib/context/embeddings/manager';
import type { ExpertContext } from '../experts/base';
import type { AssembledContext } from '$lib/context/types';

export class MoEContextIntegration {
  
  /**
   * Assemble context for MoE expert analysis
   */
  async assembleContextForExperts(
    profileId: string,
    transcript: string,
    currentSymptoms: string[],
    options: {
      maxTokens?: number;
      priorityTypes?: string[];
      includeMedicalContext?: boolean;
    } = {}
  ): Promise<AssembledContext | null> {
    try {
      // Generate query embedding for current conversation
      const queryText = this.buildContextQuery(transcript, currentSymptoms);
      const queryEmbedding = await embeddingManager.generateQueryEmbedding(queryText);
      
      // Search for relevant context
      const context = profileContextManager.getProfileContextStats(profileId);
      if (!context) {
        return null;
      }
      
      // Perform semantic search
      const searchResults = await context.database.search(
        queryEmbedding,
        {
          limit: 20,
          threshold: 0.7,
          includeMetadata: true
        }
      );
      
      // Assemble context using ContextAssembler
      const assembledContext = await contextAssembler.assembleContextForAI(
        searchResults,
        queryText,
        {
          maxTokens: options.maxTokens || 4000,
          includeMetadata: true,
          includeMedicalContext: options.includeMedicalContext ?? true,
          priorityTypes: options.priorityTypes
        }
      );
      
      return assembledContext;
    } catch (error) {
      console.error('Failed to assemble context for MoE analysis:', error);
      return null;
    }
  }
  
  /**
   * Enhance expert context with assembled medical context
   */
  enhanceExpertContext(
    baseContext: ExpertContext,
    assembledContext: AssembledContext
  ): ExpertContext {
    return {
      ...baseContext,
      assembledContext: {
        summary: assembledContext.summary,
        keyPoints: assembledContext.keyPoints,
        relevantDocuments: assembledContext.relevantDocuments,
        medicalContext: assembledContext.medicalContext,
        confidence: assembledContext.confidence,
        tokenCount: assembledContext.tokenCount,
        contextSources: {
          documentIds: assembledContext.relevantDocuments.map(d => d.documentId),
          searchQuery: this.buildContextQuery(baseContext.transcript, []),
          searchResults: assembledContext.relevantDocuments.length,
          assemblyTimestamp: new Date().toISOString()
        }
      }
    };
  }
  
  /**
   * Build context search query from transcript and symptoms
   */
  private buildContextQuery(transcript: string, symptoms: string[]): string {
    const parts = [transcript];
    
    if (symptoms.length > 0) {
      parts.push(`Symptoms: ${symptoms.join(', ')}`);
    }
    
    return parts.join('\n\n');
  }
  
  /**
   * Calculate context-weighted expert confidence
   */
  calculateContextWeightedConfidence(
    expertConfidence: number,
    contextConfidence: number,
    contextWeight: number = 0.3
  ): number {
    return expertConfidence * (1 - contextWeight) + 
           (expertConfidence * contextConfidence) * contextWeight;
  }
}

export const moeContextIntegration = new MoEContextIntegration();
```

### Context Configuration in Expert Sets

Expert sets now include context assembly configuration:

```json
// Enhanced config/session-moe-comprehensive.json with context
{
  "name": "Comprehensive Analysis with Context",
  "description": "Full 5-expert analysis with context assembly",
  "targetAudience": "specialists",
  "complexity": "comprehensive",
  "experts": ["gp_core", "diagnostic_specialist", "treatment_planner", "clinical_inquiry", "safety_monitor"],
  
  "context": {
    "enabled": true,
    "maxTokens": 4000,
    "confidenceThreshold": 0.6,
    "priorityTypes": ["diagnosis", "treatment", "medication"],
    "includeMedicalContext": true,
    "contextWeight": 0.3,
    "timeoutMs": 5000
  },
  
  "consensus": {
    "algorithm": "context_weighted_voting",
    "contextIntegration": true,
    "expertWeights": {
      "gp_core": 1.0,
      "diagnostic_specialist": 0.9,
      "treatment_planner": 0.8,
      "clinical_inquiry": 0.7,
      "safety_monitor": 1.0
    }
  }
}
```

## Expert Set Configurations

The system now supports multiple expert sets through separate configuration files:

- **GP Basic** (`config/session-moe-gp_basic.json`): Essential analysis with GP, Diagnostic, and Inquiry experts
- **Comprehensive** (`config/session-moe-comprehensive.json`): Full 5-expert analysis for complex cases
- **Emergency** (`config/session-moe-emergency.json`): Rapid triage with Safety Monitor prioritization

### Expert Set Structure

```json
// config/session-moe-gp_basic.json
{
  "name": "GP Basic Analysis",
  "description": "Essential medical analysis for general practice settings",
  "targetAudience": "general_practitioners",
  "complexity": "basic",
  "experts": ["gp_core", "basic_diagnosis", "basic_inquiry"],
  "consensus": {
    "algorithm": "weighted_voting",
    "expertWeights": {
      "gp_core": 1.0,
      "basic_diagnosis": 0.8,
      "basic_inquiry": 0.7
    },
    "settings": {
      "minimumAgreement": 0.6,
      "conflictThreshold": 0.3,
      "requireMajorityForCritical": true,
      "uncertaintyThreshold": 0.5
    }
  }
}
```

### Expert Configuration with Schema References

```json
// From config/session-moe.json - Expert definitions now use schema references
"gp_core": {
  "id": "gp_core",
  "name": "Dr. GP Core",
  "specialty": "General Practice & Primary Care",
  "baseConfidence": 0.85,
  "reasoningStyle": "pattern-matching",
  "provider": "openai",
  "modelType": "analytical",
  "schema": {
    "configPath": "gp-core"  // References src/lib/configurations/moe-experts/gp-core.ts
  },
  "settings": {
    "prioritizeCommonConditions": true,
    "includePreventiveCare": true,
    "patientCommunicationStyle": "clear"
  }
}
```

## Expert Schema Definitions

The new schema-based approach eliminates hardcoded prompts and structures. Expert schemas are defined in `src/lib/configurations/moe-experts/` following the same pattern as existing configurations like `session.diagnosis.ts`.

### Schema Structure Overview

Each expert schema defines:
- **Structured output format** using JSON Schema
- **Language-aware descriptions** with `[LANGUAGE]` placeholders
- **Medical terminology** and categorizations
- **Confidence scoring** and evidence chains
- **Clinical reasoning** templates

### GP Core Expert Schema

```typescript
// src/lib/configurations/moe-experts/gp-core.ts
const GP_CORE_SCHEMA = {
  name: "gp_core_analysis",
  description: "You are an experienced General Practitioner conducting comprehensive patient assessment. Provide holistic analysis considering complete medical history and current presentation in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      primaryAssessment: {
        type: "object",
        description: "Initial clinical assessment and impression",
        properties: {
          chiefComplaint: {
            type: "string",
            description: "Primary reason for consultation in [LANGUAGE] language"
          },
          clinicalImpression: {
            type: "string", 
            description: "Overall clinical impression based on presentation"
          },
          urgencyLevel: {
            type: "string",
            enum: ["routine", "urgent", "emergent"],
            description: "Assessment of clinical urgency"
          }
        }
      },
      symptoms: {
        type: "array",
        description: "Comprehensive symptom analysis with clinical context",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Symptom name in [LANGUAGE]" },
            severity: { type: "number", description: "Severity score 0-1" },
            onset: { type: "string", description: "Temporal pattern" },
            characteristics: {
              type: "array",
              items: { type: "string" },
              description: "Detailed symptom characteristics"
            },
            associatedSymptoms: {
              type: "array",
              items: { type: "string" },
              description: "Related symptoms"
            },
            redFlags: {
              type: "array",
              items: { type: "string" },
              description: "Warning signs requiring attention"
            }
          },
          required: ["name", "severity"]
        }
      }
      // ... (continue with other schema properties)
    },
    required: ["primaryAssessment", "symptoms", "workingDiagnoses", "recommendedActions"]
  }
};

export default GP_CORE_SCHEMA;
```

### Schema-Based Expert Implementation

Experts now inherit from the updated base class that uses schema-based analysis:

```typescript
// src/lib/session-moe/experts/gp-core.ts - Schema-based GP expert
export class GPCoreExpert extends MedicalExpertBase {
  constructor() {
    super("gp_core"); // References config key and loads schema from gp-core.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const { result, duration } = await this.measurePerformance(async () => {
      // Use schema-based approach with AI provider abstraction
      return await this.invokeWithSchema(context);
    });
    
    // Transform schema result into ExpertAnalysis format
    const analysis: ExpertAnalysis = {
      expertId: this.id,
      findings: {
        symptoms: this.transformSymptoms(result.symptoms || []),
        diagnoses: this.transformDiagnoses(result.workingDiagnoses || []),
        treatments: this.transformTreatments(result.recommendedActions?.treatments || []),
        inquiries: this.transformInquiries(result.recommendedActions?.additionalQuestions || []),
        confidence: result.overallConfidence || this.confidence
      },
      reasoning: result.clinicalReasoning || result.primaryAssessment?.clinicalImpression || '',
      evidenceChain: this.buildEvidenceChain(result),
      processingTime: duration,
      metadata: {
        modelUsed: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        tokensUsed: result._tokenUsage?.total
      }
    };
    
    this.logAnalysisCompletion(context, analysis, duration);
    return analysis;
  }
  
  private transformSymptoms(symptoms: any[]): SymptomNode[] {
    return symptoms.map(symptom => ({
      id: this.generateId('symptom'),
      name: symptom.name,
      description: symptom.description,
      severity: symptom.severity,
      confidence: symptom.confidence,
      characteristics: symptom.characteristics || []
    }));
  }
  
  private transformDiagnoses(diagnoses: any[]): DiagnosisNode[] {
    return diagnoses.map(diagnosis => ({
      id: this.generateId('diagnosis'),
      name: diagnosis.name,
      code: diagnosis.icdCode,
      confidence: diagnosis.probability || diagnosis.confidence,
      supportingSymptoms: diagnosis.supportingSymptoms || [],
      supportingEvidence: diagnosis.supportingEvidence?.map(e => e.finding) || [],
      reasoning: diagnosis.reasoning,
      urgency: this.mapConfidenceToUrgency(diagnosis.probability)
    }));
  }
  
  private buildEvidenceChain(result: any): EvidenceLink[] {
    const links: EvidenceLink[] = [];
    
    // Create evidence links from schema result
    result.workingDiagnoses?.forEach(diagnosis => {
      diagnosis.supportingEvidence?.forEach(evidence => {
        links.push({
          from: evidence.finding,
          to: diagnosis.name,
          strength: evidence.strength || 0.7,
          type: 'supports',
          reasoning: `${evidence.finding} supports ${diagnosis.name}`,
          expertIds: [this.id]
        });
      });
    });
    
    return links;
  }
}
```

### Diagnostic Specialist Schema

```typescript
// src/lib/configurations/moe-experts/diagnostic-specialist.ts - Advanced differential diagnosis
const DIAGNOSTIC_SPECIALIST_SCHEMA = {
  name: "diagnostic_specialist_analysis",
  description: "You are a diagnostic specialist using systematic methodology for differential diagnosis. Apply probabilistic reasoning and evidence-based analysis in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      differentialDiagnoses: {
        type: "array",
        description: "Comprehensive differential diagnosis with probability scoring",
        items: {
          type: "object",
          properties: {
            diagnosis: { type: "string", description: "Diagnosis name in [LANGUAGE]" },
            icdCode: { type: "string", description: "ICD-10 code" },
            probability: { type: "number", description: "Diagnostic probability 0-1" },
            supportingEvidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  finding: { type: "string", description: "Clinical finding" },
                  strength: { type: "number", description: "Evidence strength 0-1" },
                  type: { type: "string", enum: ["symptom", "sign", "history", "test"] }
                }
              }
            },
            contradictingEvidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  finding: { type: "string" },
                  impact: { type: "number", description: "Negative impact on probability" }
                }
              }
            },
            reasoning: { type: "string", description: "Clinical reasoning in [LANGUAGE]" }
          },
          required: ["diagnosis", "probability", "supportingEvidence", "reasoning"]
        }
      }
      // ... (continue with other diagnostic properties)
    }
  }
};
```

### Diagnostic Specialist Expert

```typescript
// src/lib/session-moe/experts/diagnostic-specialist.ts - Schema-based implementation
export class DiagnosticSpecialistExpert extends MedicalExpertBase {
  constructor() {
    super("diagnostic_specialist"); // Uses schema from diagnostic-specialist.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const prompt = this.buildDiagnosticPrompt(context);
    
    const { result, duration } = await this.measurePerformance(async () => {
      const response = await this.llm.invoke(prompt);
      return this.processDiagnosticResponse(response);
    });
    
    return {
      expertId: this.id,
      findings: result.findings,
      reasoning: result.differentialReasoning,
      evidenceChain: this.buildDiagnosticChain(result),
      processingTime: duration
    };
  }
  
  private buildDiagnosticPrompt(context: ExpertContext): string {
    return `
You are a diagnostic specialist focused on differential diagnosis and probabilistic reasoning.
Apply systematic diagnostic methodology to analyze this case.

CLINICAL PRESENTATION:
${context.transcript}

RELEVANT HISTORY:
${JSON.stringify(context.patientHistory)}

TASK: Generate a comprehensive differential diagnosis with probability distributions.

METHODOLOGY:
1. **Symptom Analysis**
   - Characterize each symptom (onset, quality, severity, timing)
   - Identify pathognomonic features
   - Note symptom clusters suggesting specific conditions

2. **Differential Diagnosis Generation**
   - List diagnoses from most to least likely
   - Assign probability scores (0-1) based on:
     * Symptom match strength
     * Epidemiological factors
     * Patient demographics
     * Clinical patterns
   
3. **Diagnostic Reasoning**
   - For each diagnosis, provide:
     * Supporting evidence (symptoms, signs, history)
     * Against evidence (what doesn't fit)
     * Key differentiating features
     * ICD-10 code

4. **Critical Exclusions**
   - Identify "can't miss" diagnoses
   - Red flags requiring immediate attention
   - Time-sensitive conditions

5. **Diagnostic Certainty**
   - Overall confidence in primary diagnosis
   - Factors that would increase certainty
   - Alternative explanations

OUTPUT LANGUAGE: ${context.language}

Format as structured data with clear probability distributions and evidence chains.
`;
  }
  
  private buildDiagnosticChain(result: any): EvidenceLink[] {
    const chains: EvidenceLink[] = [];
    
    // Create bidirectional links for differential reasoning
    result.diagnoses.forEach(diagnosis => {
      // Supporting evidence
      diagnosis.supportingEvidence?.forEach(evidence => {
        chains.push({
          from: evidence.id,
          to: diagnosis.id,
          strength: evidence.weight,
          type: 'supports',
          reasoning: evidence.clinicalSignificance
        });
      });
      
      // Contradicting evidence
      diagnosis.contradictingEvidence?.forEach(evidence => {
        chains.push({
          from: evidence.id,
          to: diagnosis.id,
          strength: -evidence.weight,
          type: 'contradicts',
          reasoning: evidence.explanation
        });
      });
    });
    
    return chains;
  }
}
```

### Clinical Inquiry Schema

The clinical inquiry expert uses the most sophisticated schema for strategic questioning:

```typescript
// src/lib/configurations/moe-experts/clinical-inquiry.ts
const CLINICAL_INQUIRY_SCHEMA = {
  name: "clinical_inquiry_specialist",
  description: "Generate strategic questions that maximize diagnostic yield. Design questions that efficiently narrow differential diagnosis and optimize clinical management in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      strategicInquiries: {
        type: "array",
        description: "5-10 high-yield clinical questions prioritized by diagnostic impact",
        items: {
          type: "object", 
          properties: {
            question: { type: "string", description: "Clear question in [LANGUAGE]" },
            category: {
              type: "string",
              enum: ["symptom_characterization", "temporal_pattern", "severity_assessment", "red_flag_screening"]
            },
            intent: {
              type: "string",
              enum: ["confirmatory", "exclusionary", "exploratory", "risk_stratification"]
            },
            priority: {
              type: "string",
              enum: ["critical", "high", "medium", "low"]
            },
            diagnosticImpact: {
              type: "object",
              properties: {
                ifPositive: {
                  type: "object",
                  properties: {
                    implication: { type: "string", description: "Clinical implications in [LANGUAGE]" },
                    probabilityChange: { type: "number", description: "Change in diagnostic probability" },
                    nextSteps: { type: "array", items: { type: "string" } }
                  }
                },
                ifNegative: {
                  type: "object",
                  properties: {
                    implication: { type: "string" },
                    probabilityChange: { type: "number" },
                    nextSteps: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          },
          required: ["question", "category", "intent", "priority", "diagnosticImpact"]
        }
      }
    }
  }
};
```

### Clinical Inquiry Expert

```typescript
// src/lib/session-moe/experts/clinical-inquiry.ts - Schema-based implementation
export class ClinicalInquiryExpert extends MedicalExpertBase {
  constructor() {
    super("clinical_inquiry"); // Uses schema from clinical-inquiry.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const { result, duration } = await this.measurePerformance(async () => {
      return await this.invokeWithSchema(context);
    });
    
    const analysis: ExpertAnalysis = {
      expertId: this.id,
      findings: {
        symptoms: [], // Inquiry expert focuses on questions
        diagnoses: [],
        treatments: [],
        inquiries: this.transformInquiries(result.strategicInquiries || []),
        confidence: this.calculateInquiryConfidence(result)
      },
      reasoning: result.inquiryStrategy?.primaryObjectives?.join('; ') || 'Strategic clinical questioning analysis',
      evidenceChain: this.buildInquiryChain(result),
      processingTime: duration,
      metadata: {
        modelUsed: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        tokensUsed: result._tokenUsage?.total
      }
    };
    
    this.logAnalysisCompletion(context, analysis, duration);
    return analysis;
  }
  
  private transformInquiries(inquiries: any[]): InquiryNode[] {
    return inquiries.map(inquiry => ({
      id: this.generateId('inquiry'),
      question: inquiry.question,
      category: inquiry.category,
      intent: inquiry.intent,
      priority: inquiry.priority,
      relatedDiagnoses: inquiry.relatedDiagnoses || [],
      expectedImpact: inquiry.diagnosticImpact,
      diagnosticYield: this.calculateDiagnosticYield(inquiry),
      suggestedBy: [this.id],
      feasibility: inquiry.complexity === 'simple' ? 1.0 : inquiry.complexity === 'moderate' ? 0.7 : 0.4
    }));
  }
  
  private calculateDiagnosticYield(inquiry: any): number {
    const positiveImpact = Math.abs(inquiry.diagnosticImpact?.ifPositive?.probabilityChange || 0);
    const negativeImpact = Math.abs(inquiry.diagnosticImpact?.ifNegative?.probabilityChange || 0);
    return Math.max(positiveImpact, negativeImpact);
  }
}
```

### Medical History Integration Expert

```typescript
// src/lib/session-moe/experts/medical-history-integration.ts - Epic 0.2 compliance
export class MedicalHistoryIntegrationExpert extends MedicalExpertBase {
  constructor() {
    super("medical_history_integration"); // Uses schema from medical-history-integration.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const { result, duration } = await this.measurePerformance(async () => {
      return await this.invokeWithSchema(context);
    });
    
    const analysis: ExpertAnalysis = {
      expertId: this.id,
      findings: {
        symptoms: this.identifyHistoricalPatterns(result.historicalPatterns || []),
        diagnoses: this.correlateHistoricalDiagnoses(result.historicalCorrelations || []),
        treatments: this.analyzeTreatmentHistory(result.treatmentAnalysis || []),
        inquiries: this.generateHistoryBasedQuestions(result.historyInquiries || []),
        confidence: result.analysisConfidence || this.confidence
      },
      reasoning: result.historicalReasoning || 'Comprehensive medical history analysis completed',
      evidenceChain: this.buildHistoricalEvidenceChain(result),
      processingTime: duration,
      metadata: {
        modelUsed: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        tokensUsed: result._tokenUsage?.total,
        historicalDataPoints: context.completePatientHistory ? Object.keys(context.completePatientHistory).length : 0
      }
    };
    
    this.logAnalysisCompletion(context, analysis, duration);
    return analysis;
  }
  
  private identifyHistoricalPatterns(patterns: any[]): SymptomNode[] {
    return patterns.map(pattern => ({
      id: this.generateId('historical_pattern'),
      name: pattern.patternName,
      description: pattern.description,
      severity: pattern.significance,
      confidence: pattern.reliability,
      characteristics: pattern.occurrenceDetails || []
    }));
  }
  
  private correlateHistoricalDiagnoses(correlations: any[]): DiagnosisNode[] {
    return correlations.map(correlation => ({
      id: this.generateId('historical_diagnosis'),
      name: correlation.diagnosisName,
      code: correlation.icdCode,
      confidence: correlation.relevanceScore,
      supportingEvidence: correlation.supportingHistory || [],
      reasoning: correlation.historicalContext,
      urgency: correlation.currentRelevance === 'high' ? 'high' : 'medium'
    }));
  }
}
```

### Medical History Integration Schema

```typescript
// src/lib/configurations/moe-experts/medical-history-integration.ts
const MEDICAL_HISTORY_INTEGRATION_SCHEMA = {
  name: "medical_history_integration_analysis",
  description: "Comprehensive analysis of patient's complete medical history to identify patterns, correlations, and critical details that inform current diagnosis and treatment. Provide analysis in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      historicalPatterns: {
        type: "array",
        description: "Identified patterns and connections across patient's medical history",
        items: {
          type: "object",
          properties: {
            patternName: {
              type: "string",
              description: "Name of identified pattern in [LANGUAGE] language"
            },
            description: {
              type: "string", 
              description: "Detailed description of the pattern and its significance"
            },
            occurrenceDetails: {
              type: "array",
              items: { type: "string" },
              description: "Specific instances and timeframes when pattern occurred"
            },
            significance: {
              type: "number",
              description: "Clinical significance score (0-1)"
            },
            reliability: {
              type: "number",
              description: "Reliability of pattern identification (0-1)"
            },
            currentRelevance: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Relevance to current presentation"
            }
          },
          required: ["patternName", "description", "significance", "reliability"]
        }
      },
      historicalCorrelations: {
        type: "array",
        description: "Correlations between historical diagnoses and current symptoms",
        items: {
          type: "object",
          properties: {
            diagnosisName: {
              type: "string",
              description: "Historical diagnosis name in [LANGUAGE] language"
            },
            icdCode: {
              type: "string",
              description: "ICD-10 code if available"
            },
            relevanceScore: {
              type: "number", 
              description: "Relevance to current presentation (0-1)"
            },
            supportingHistory: {
              type: "array",
              items: { type: "string" },
              description: "Historical evidence supporting correlation"
            },
            historicalContext: {
              type: "string",
              description: "Context of previous diagnosis and treatment outcomes"
            },
            currentRelevance: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Current clinical relevance"
            }
          },
          required: ["diagnosisName", "relevanceScore", "historicalContext"]
        }
      },
      criticalHistoricalFindings: {
        type: "array",
        description: "Critical findings from medical history requiring immediate attention",
        items: {
          type: "object",
          properties: {
            finding: {
              type: "string",
              description: "Critical historical finding in [LANGUAGE] language"
            },
            category: {
              type: "string",
              enum: ["allergy", "adverse_reaction", "family_history", "chronic_condition", "previous_complication"],
              description: "Category of critical finding"
            },
            urgency: {
              type: "string",
              enum: ["immediate", "high", "moderate", "monitor"],
              description: "Urgency level for current consideration"
            },
            implication: {
              type: "string",
              description: "Clinical implication for current care"
            },
            recommendedAction: {
              type: "string",
              description: "Recommended action based on historical finding"
            }
          },
          required: ["finding", "category", "urgency", "implication"]
        }
      },
      treatmentAnalysis: {
        type: "array",
        description: "Analysis of historical treatment responses and effectiveness",
        items: {
          type: "object",
          properties: {
            treatmentName: {
              type: "string",
              description: "Historical treatment or medication"
            },
            effectiveness: {
              type: "string",
              enum: ["highly_effective", "moderately_effective", "minimally_effective", "ineffective", "adverse_reaction"],
              description: "Historical effectiveness"
            },
            sideEffects: {
              type: "array",
              items: { type: "string" },
              description: "Documented side effects or complications"
            },
            complianceIssues: {
              type: "array",
              items: { type: "string" },
              description: "Historical compliance challenges"
            },
            currentRecommendation: {
              type: "string",
              description: "Recommendation for current treatment planning"
            }
          },
          required: ["treatmentName", "effectiveness", "currentRecommendation"]
        }
      },
      historicalReasoning: {
        type: "string",
        description: "Comprehensive reasoning based on medical history analysis in [LANGUAGE] language"
      },
      analysisConfidence: {
        type: "number",
        description: "Overall confidence in historical analysis (0-1)"
      }
    },
    required: ["historicalPatterns", "historicalCorrelations", "criticalHistoricalFindings", "treatmentAnalysis", "historicalReasoning"]
  }
};

export default MEDICAL_HISTORY_INTEGRATION_SCHEMA;
```

### Safety Monitor Expert

```typescript
// src/lib/session-moe/experts/safety-monitor.ts - Epic 0.3 compliance
export class SafetyMonitorExpert extends MedicalExpertBase {
  constructor() {
    super("safety_monitor"); // Uses schema from safety-monitor.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const { result, duration } = await this.measurePerformance(async () => {
      return await this.invokeWithSchema(context);
    });
    
    const analysis: ExpertAnalysis = {
      expertId: this.id,
      findings: {
        symptoms: this.flagCriticalSymptoms(result.redFlagSymptoms || []),
        diagnoses: this.identifyUrgentConditions(result.urgentConditions || []),
        treatments: this.assessTreatmentSafety(result.safetyAssessments || []),
        inquiries: this.generateSafetyQuestions(result.safetyInquiries || []),
        confidence: result.safetyConfidence || 0.95 // High confidence required for safety
      },
      reasoning: result.safetyReasoning || 'Comprehensive safety assessment completed',
      evidenceChain: this.buildSafetyEvidenceChain(result),
      processingTime: duration,
      metadata: {
        modelUsed: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        tokensUsed: result._tokenUsage?.total,
        criticalAlertsGenerated: result.redFlagSymptoms?.length || 0
      }
    };
    
    this.logAnalysisCompletion(context, analysis, duration);
    return analysis;
  }
  
  private flagCriticalSymptoms(redFlags: any[]): SymptomNode[] {
    return redFlags.map(flag => ({
      id: this.generateId('red_flag'),
      name: flag.symptom,
      description: flag.description,
      severity: 1.0, // Always maximum for red flags
      confidence: flag.confidence,
      characteristics: [`RED FLAG: ${flag.urgencyReason}`]
    }));
  }
  
  private identifyUrgentConditions(conditions: any[]): DiagnosisNode[] {
    return conditions.map(condition => ({
      id: this.generateId('urgent_condition'),
      name: condition.conditionName,
      code: condition.icdCode,
      confidence: condition.confidence,
      supportingEvidence: condition.supportingEvidence || [],
      reasoning: condition.urgencyReasoning,
      urgency: 'critical' // Always critical for safety monitor
    }));
  }
}
```

### Safety Monitor Schema

```typescript
// src/lib/configurations/moe-experts/safety-monitor.ts - Epic 0.3 compliance
const SAFETY_MONITOR_SCHEMA = {
  name: "safety_monitor_analysis",
  description: "Critical safety assessment focused on identifying red flags, drug interactions, and life-threatening conditions requiring immediate attention. Provide analysis in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      redFlagSymptoms: {
        type: "array",
        description: "Critical symptoms requiring immediate medical attention",
        items: {
          type: "object",
          properties: {
            symptom: {
              type: "string",
              description: "Red flag symptom identified in [LANGUAGE] language"
            },
            description: {
              type: "string",
              description: "Detailed description of why this is a red flag"
            },
            urgencyReason: {
              type: "string",
              description: "Specific reason for urgency and potential consequences"
            },
            confidence: {
              type: "number",
              description: "Confidence in red flag identification (0-1)"
            },
            timeframe: {
              type: "string",
              enum: ["immediate", "within_1_hour", "within_4_hours", "within_24_hours"],
              description: "Timeframe for required medical attention"
            },
            relatedConditions: {
              type: "array",
              items: { type: "string" },
              description: "Conditions this red flag may indicate"
            }
          },
          required: ["symptom", "description", "urgencyReason", "confidence", "timeframe"]
        }
      },
      drugInteractions: {
        type: "array",
        description: "Critical drug interactions identified between current medications and potential treatments",
        items: {
          type: "object",
          properties: {
            drug1: {
              type: "string",
              description: "First medication in interaction"
            },
            drug2: {
              type: "string", 
              description: "Second medication in interaction"
            },
            severityLevel: {
              type: "string",
              enum: ["contraindicated", "major", "moderate", "minor"],
              description: "Severity of drug interaction"
            },
            mechanism: {
              type: "string",
              description: "Mechanism of interaction"
            },
            potentialEffects: {
              type: "array",
              items: { type: "string" },
              description: "Potential adverse effects from interaction"
            },
            recommendation: {
              type: "string",
              description: "Clinical recommendation for managing interaction"
            }
          },
          required: ["drug1", "drug2", "severityLevel", "mechanism", "recommendation"]
        }
      },
      urgentConditions: {
        type: "array",
        description: "Life-threatening conditions that may be present based on current symptoms and history",
        items: {
          type: "object",
          properties: {
            conditionName: {
              type: "string",
              description: "Name of urgent condition in [LANGUAGE] language"
            },
            icdCode: {
              type: "string",
              description: "ICD-10 code if available"
            },
            confidence: {
              type: "number",
              description: "Confidence in condition presence (0-1)"
            },
            supportingEvidence: {
              type: "array",
              items: { type: "string" },
              description: "Evidence supporting this urgent condition"
            },
            urgencyReasoning: {
              type: "string",
              description: "Why this condition requires urgent attention"
            },
            requiredActions: {
              type: "array",
              items: { type: "string" },
              description: "Immediate actions required"
            },
            timeframe: {
              type: "string",
              enum: ["immediate", "within_1_hour", "urgent", "stat"],
              description: "Required response timeframe"
            }
          },
          required: ["conditionName", "confidence", "urgencyReasoning", "requiredActions", "timeframe"]
        }
      },
      demographicRisks: {
        type: "array",
        description: "Age, gender, or demographic-specific risk factors requiring attention",
        items: {
          type: "object",
          properties: {
            riskFactor: {
              type: "string",
              description: "Demographic risk factor identified"
            },
            relevantDemographic: {
              type: "string",
              description: "Age group, gender, or demographic category"
            },
            riskLevel: {
              type: "string",
              enum: ["high", "moderate", "low"],
              description: "Level of risk"
            },
            clinicalImplication: {
              type: "string",
              description: "What this risk means for current care"
            },
            monitoringRecommendation: {
              type: "string",
              description: "Recommended monitoring or prevention strategy"
            }
          },
          required: ["riskFactor", "relevantDemographic", "riskLevel", "clinicalImplication"]
        }
      },
      safetyInquiries: {
        type: "array",
        description: "Critical safety questions that must be asked to ensure patient safety",
        items: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "Critical safety question in [LANGUAGE] language"
            },
            safetyReason: {
              type: "string",
              description: "Why this question is critical for safety"
            },
            potentialRisks: {
              type: "array",
              items: { type: "string" },
              description: "Risks if question is not asked or answered incorrectly"
            },
            priority: {
              type: "string",
              enum: ["critical", "high", "moderate"],
              description: "Priority level for this safety question"
            }
          },
          required: ["question", "safetyReason", "priority"]
        }
      },
      safetyReasoning: {
        type: "string",
        description: "Comprehensive safety assessment reasoning in [LANGUAGE] language"
      },
      safetyConfidence: {
        type: "number",
        description: "Overall confidence in safety assessment (0-1)"
      }
    },
    required: ["redFlagSymptoms", "drugInteractions", "urgentConditions", "demographicRisks", "safetyInquiries", "safetyReasoning"]
  }
};

export default SAFETY_MONITOR_SCHEMA;
```

### Treatment Planner Expert

```typescript
// src/lib/session-moe/experts/treatment-planner.ts - Epic 0.4 compliance
export class TreatmentPlannerExpert extends MedicalExpertBase {
  constructor() {
    super("treatment_planner"); // Uses schema from treatment-planner.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const { result, duration } = await this.measurePerformance(async () => {
      return await this.invokeWithSchema(context);
    });
    
    const analysis: ExpertAnalysis = {
      expertId: this.id,
      findings: {
        symptoms: [], // Treatment planner focuses on treatments
        diagnoses: this.enhanceWithTreatmentContext(result.treatmentTargets || []),
        treatments: this.transformTreatmentPlans(result.treatmentPlans || []),
        inquiries: this.generateTreatmentQuestions(result.treatmentInquiries || []),
        confidence: result.planningConfidence || this.confidence
      },
      reasoning: result.treatmentReasoning || 'Evidence-based treatment planning completed with historical context',
      evidenceChain: this.buildTreatmentEvidenceChain(result),
      processingTime: duration,
      metadata: {
        modelUsed: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        tokensUsed: result._tokenUsage?.total,
        treatmentOptionsGenerated: result.treatmentPlans?.length || 0,
        historicalResponsesConsidered: context.completePatientHistory?.treatmentResponses?.length || 0
      }
    };
    
    this.logAnalysisCompletion(context, analysis, duration);
    return analysis;
  }
  
  private transformTreatmentPlans(plans: any[]): TreatmentNode[] {
    return plans.map(plan => ({
      id: this.generateId('treatment_plan'),
      name: plan.treatmentName,
      type: plan.treatmentType,
      description: plan.description,
      confidence: plan.effectivenessScore,
      effectiveness: plan.effectivenessScore,
      targetDiagnoses: plan.targetConditions || [],
      contraindications: plan.contraindications || [],
      mechanism: plan.mechanism,
      dosage: plan.dosage,
      duration: plan.duration,
      sideEffects: plan.potentialSideEffects || []
    }));
  }
}
```

### Preventive Care Expert

```typescript  
// src/lib/session-moe/experts/preventive-care-specialist.ts - Epic 0.5 compliance
export class PreventiveCareSpecialistExpert extends MedicalExpertBase {
  constructor() {
    super("preventive_care_specialist"); // Uses schema from preventive-care-specialist.ts
  }
  
  async analyze(context: ExpertContext): Promise<ExpertAnalysis> {
    const { result, duration } = await this.measurePerformance(async () => {
      return await this.invokeWithSchema(context);
    });
    
    const analysis: ExpertAnalysis = {
      expertId: this.id,
      findings: {
        symptoms: this.identifyRiskFactors(result.riskFactors || []),
        diagnoses: this.identifyPreventableConditions(result.preventableConditions || []),
        treatments: this.generatePreventiveInterventions(result.preventiveInterventions || []),
        inquiries: this.createPreventiveQuestions(result.preventiveInquiries || []),
        confidence: result.preventiveConfidence || this.confidence
      },
      reasoning: result.preventiveReasoning || 'Comprehensive preventive care and risk assessment completed',
      evidenceChain: this.buildPreventiveEvidenceChain(result),
      processingTime: duration,
      metadata: {
        modelUsed: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        tokensUsed: result._tokenUsage?.total,
        screeningRecommendationsGenerated: result.screeningRecommendations?.length || 0,
        riskFactorsIdentified: result.riskFactors?.length || 0
      }
    };
    
    this.logAnalysisCompletion(context, analysis, duration);
    return analysis;
  }
}
  
  private buildInquiryPrompt(context: ExpertContext): string {
    return `
You are a clinical inquiry specialist focused on asking strategic questions that maximize diagnostic yield.
Your goal is to generate questions that efficiently narrow the differential diagnosis.

CURRENT CLINICAL SITUATION:
${context.transcript}

WORKING DIAGNOSES:
${JSON.stringify(context.currentHypotheses || [])}

Generate strategic clinical inquiries with the following approach:

1. **Question Categorization**
   For each question, classify as:
   - CONFIRMATORY: Strengthens a specific diagnosis if positive
   - EXCLUSIONARY: Rules out a diagnosis if negative
   - EXPLORATORY: Reveals new diagnostic possibilities
   - RISK_ASSESSMENT: Identifies complications or urgency

2. **Strategic Priority**
   Prioritize questions by:
   - Diagnostic impact (how much it changes probabilities)
   - Clinical urgency (time-sensitive conditions)
   - Feasibility (can patient answer reliably)
   - Efficiency (one question revealing multiple insights)

3. **Question Design**
   - Use clear, specific language
   - Avoid medical jargon unless necessary
   - Include measurable parameters when relevant
   - Consider cultural sensitivity

4. **Expected Impact Analysis**
   For each question provide:
   - If YES: How this changes the differential
   - If NO: How this changes the differential
   - Diagnostic yield score (0-1)

5. **Question Relationships**
   - Map each question to relevant diagnoses
   - Show how answers create diagnostic pathways
   - Identify question dependencies

OUTPUT LANGUAGE: ${context.language}

Generate 5-10 high-yield questions, focusing on those with maximum diagnostic impact.
`;
  }
  
  private buildInquiryChain(result: any): EvidenceLink[] {
    const chains: EvidenceLink[] = [];
    
    result.inquiries.forEach(inquiry => {
      // Link inquiries to diagnoses they affect
      inquiry.affectedDiagnoses?.forEach(diagnosisId => {
        chains.push({
          from: inquiry.id,
          to: diagnosisId,
          strength: inquiry.diagnosticImpact,
          type: inquiry.intent === 'confirmatory' ? 'confirms' : 'rules_out',
          reasoning: inquiry.expectedImpact
        });
      });
    });
    
    return chains;
  }
  
  private processInquiryResponse(response: any): any {
    return {
      inquiries: response.questions?.map(q => ({
        id: `inquiry_${Date.now()}_${Math.random()}`,
        question: q.text,
        category: q.category,
        intent: q.intent,
        priority: q.priority,
        relatedDiagnoses: q.relatedDiagnoses,
        expectedImpact: {
          ifYes: q.impactIfYes,
          ifNo: q.impactIfNo
        },
        diagnosticYield: q.yield,
        suggestedBy: [this.id]
      })) || [],
      strategyExplanation: response.overallStrategy || ""
    };
  }
}
```

## Consensus Building System

The consensus building system implements the workflow's Phase 4 requirements for aggregating expert opinions and resolving conflicts.

### Consensus Builder Implementation

```typescript
// src/lib/moe/consensus/builder.ts
import { logger } from "$lib/logging/logger";

export interface ConsensusAnalysis {
  // Core findings with unique IDs (per workflow)
  diagnoses: ConsensusDiscision[];
  treatments: ConsensusTreatment[];
  inquiries: PrioritizedInquiry[];
  
  // Conflict and uncertainty tracking
  conflicts: ExpertConflict[];
  uncertainties: UncertainArea[];
  
  // Metrics for UI display
  overallConfidence: number;
  agreementScore: number;
  
  // Evidence chains for transparency
  evidenceChains: EvidenceLink[];
  
  // Processing metadata
  processingTime: number;
  expertsCompleted: string[];
}

export class ConsensusBuilder {
  private expertWeights: Map<string, number>;
  private config: ConsensusConfig;
  
  constructor() {
    const moeConfig = getMoEConfig();
    this.config = moeConfig.consensus;
    
    // Convert expert weights from config to Map
    this.expertWeights = new Map(
      Object.entries(this.config.expertWeights)
    );
  }
  
  async buildConsensus(
    expertAnalyses: Map<string, ExpertAnalysis>
  ): Promise<ConsensusAnalysis> {
    logger.moe.info("Building consensus from expert analyses", {
      expertCount: expertAnalyses.size
    });
    
    // Aggregate all findings
    const diagnosisConsensus = this.buildDiagnosisConsensus(expertAnalyses);
    const treatmentConsensus = this.buildTreatmentConsensus(expertAnalyses);
    const inquiryPrioritization = this.prioritizeInquiries(expertAnalyses);
    
    // Detect conflicts and uncertainties
    const conflicts = this.detectConflicts(expertAnalyses);
    const uncertainties = this.identifyUncertainties(diagnosisConsensus);
    
    // Calculate overall metrics
    const overallConfidence = this.calculateOverallConfidence(diagnosisConsensus);
    const agreementScore = this.calculateAgreementScore(expertAnalyses);
    
    return {
      diagnoses: diagnosisConsensus,
      treatments: treatmentConsensus,
      inquiries: inquiryPrioritization,
      conflicts,
      uncertainties,
      overallConfidence,
      agreementScore
    };
  }
  
  private buildDiagnosisConsensus(
    expertAnalyses: Map<string, ExpertAnalysis>
  ): ConsensusDiscision[] {
    const diagnosisVotes = new Map<string, DiagnosisVoteData>();
    
    // Collect all diagnosis votes
    for (const [expertId, analysis] of expertAnalyses) {
      const expertWeight = this.expertWeights.get(expertId) || 0.5;
      
      analysis.findings.possibleDiagnoses.forEach(diagnosis => {
        const key = diagnosis.code || diagnosis.name;
        const existing = diagnosisVotes.get(key) || {
          diagnosis,
          votes: [],
          totalWeight: 0,
          supportingEvidence: new Set<string>()
        };
        
        existing.votes.push({
          expertId,
          confidence: diagnosis.confidence,
          weight: expertWeight
        });
        
        existing.totalWeight += expertWeight * diagnosis.confidence;
        
        // Aggregate supporting evidence
        diagnosis.supportingSymptoms?.forEach(s => 
          existing.supportingEvidence.add(s)
        );
        
        diagnosisVotes.set(key, existing);
      });
    }
    
    // Calculate consensus for each diagnosis
    return Array.from(diagnosisVotes.values())
      .map(voteData => {
        const avgConfidence = voteData.totalWeight / voteData.votes.length;
        const agreementLevel = this.calculateDiagnosisAgreement(voteData.votes);
        
        return {
          ...voteData.diagnosis,
          consensusConfidence: avgConfidence,
          agreementLevel,
          expertVotes: voteData.votes,
          supportingEvidence: Array.from(voteData.supportingEvidence),
          dissenting: voteData.votes.filter(v => v.confidence < 0.3)
        };
      })
      .sort((a, b) => b.consensusConfidence - a.consensusConfidence);
  }
  
  private prioritizeInquiries(
    expertAnalyses: Map<string, ExpertAnalysis>
  ): PrioritizedInquiry[] {
    const allInquiries: InquiryNode[] = [];
    
    // Collect all inquiries
    for (const [expertId, analysis] of expertAnalyses) {
      analysis.findings.additionalInquiries.forEach(inquiry => {
        allInquiries.push({
          ...inquiry,
          suggestedBy: [...(inquiry.suggestedBy || []), expertId]
        });
      });
    }
    
    // Group similar inquiries
    const groupedInquiries = this.groupSimilarInquiries(allInquiries);
    
    // Prioritize based on multiple factors
    return groupedInquiries
      .map(group => {
        const priority = this.calculateInquiryPriority(group);
        const consensusInquiry = this.mergeInquiryGroup(group);
        
        return {
          ...consensusInquiry,
          priority,
          expertCount: group.length,
          diagnosticImpact: this.calculateDiagnosticImpact(group)
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }
  
  private calculateInquiryPriority(inquiryGroup: InquiryNode[]): number {
    let score = 0;
    
    inquiryGroup.forEach(inquiry => {
      // Base score from priority
      const priorityScore = {
        'critical': 1.0,
        'high': 0.7,
        'medium': 0.4,
        'low': 0.1
      }[inquiry.priority] || 0.4;
      
      // Intent multiplier
      const intentMultiplier = {
        'confirmatory': 1.2,
        'exclusionary': 1.1,
        'exploratory': 0.9
      }[inquiry.intent] || 1.0;
      
      // Expert weight
      const expertWeight = this.expertWeights.get(inquiry.suggestedBy?.[0] || '') || 0.5;
      
      score += priorityScore * intentMultiplier * expertWeight;
    });
    
    return score / inquiryGroup.length;
  }
  
  private detectConflicts(
    expertAnalyses: Map<string, ExpertAnalysis>
  ): ExpertConflict[] {
    const conflicts: ExpertConflict[] = [];
    
    // Check for diagnosis conflicts
    const diagnosisByExpert = new Map<string, Set<string>>();
    
    for (const [expertId, analysis] of expertAnalyses) {
      const diagnoses = new Set(
        analysis.findings.possibleDiagnoses
          .filter(d => d.confidence > 0.6)
          .map(d => d.code || d.name)
      );
      diagnosisByExpert.set(expertId, diagnoses);
    }
    
    // Find experts with significantly different top diagnoses
    const expertIds = Array.from(diagnosisByExpert.keys());
    for (let i = 0; i < expertIds.length; i++) {
      for (let j = i + 1; j < expertIds.length; j++) {
        const expert1 = expertIds[i];
        const expert2 = expertIds[j];
        const diagnoses1 = diagnosisByExpert.get(expert1)!;
        const diagnoses2 = diagnosisByExpert.get(expert2)!;
        
        const overlap = this.calculateSetOverlap(diagnoses1, diagnoses2);
        
        if (overlap < 0.3) { // Less than 30% agreement
          conflicts.push({
            type: 'diagnosis_disagreement',
            experts: [expert1, expert2],
            description: `Significant disagreement on primary diagnoses`,
            severity: 'high',
            details: {
              expert1Diagnoses: Array.from(diagnoses1),
              expert2Diagnoses: Array.from(diagnoses2),
              overlap
            }
          });
        }
      }
    }
    
    return conflicts;
  }
  
  private calculateSetOverlap<T>(set1: Set<T>, set2: Set<T>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
}
```

## Visualization Generators

The visualization system implements the workflow's Phase 6 requirements for interactive Sankey diagrams with progressive updates.

### Enhanced Sankey Diagram Generator (Per Workflow)

```typescript
// src/lib/moe/visualization/sankey-generator.ts
import type { ConsensusAnalysis } from "../consensus/builder";

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  metadata: {
    totalConfidence: number;
    expertAgreement: number;
    processingTime: number;
    expertsCompleted: string[];
    timestamp: string;
  };
}

export interface SankeyNode {
  id: string; // Unique identifier
  name: string; // Short title (1-3 words)
  category: 'symptom' | 'signal' | 'history' | 'diagnosis' | 'treatment' | 'medication' | 'investigation' | 'question';
  column: number; // 0: inputs, 1: diagnoses, 2: treatments
  details: {
    description: string;
    confidence: number;
    origin: 'transcript' | 'history' | 'context' | 'previous' | 'expert' | 'consensus';
    urgency?: 'critical' | 'high' | 'medium' | 'low';
    evidence?: string[];
    reasoning?: string;
    priority?: number;
    probability?: number;
    icdCode?: string; // For diagnoses
    dosing?: string; // For medications
    acceptanceState?: 'none' | 'accepted' | 'suppressed';
    suppressionCoefficient?: number;
  };
  // Visual encoding per workflow
  visualProperties: {
    size: number; // Based on priority/probability
    color: string; // Based on urgency
    opacity: number; // For suppression
  };
}

export interface SankeyLink {
  source: string; // node id
  target: string; // node id
  value: number; // strength of connection (0-1)
  type: 'supports' | 'contradicts' | 'confirms' | 'suggests' | 'requires' | 'treats' | 'rules_out';
  reasoning: string;
  expertIds: string[]; // which experts suggested this link
  evidenceStrength: number;
  questionNode?: string; // ID of question node on this path
  // Visual properties
  visualProperties: {
    thickness: number; // Based on connection strength
    style: 'solid' | 'dashed'; // Based on evidence strength
    opacity: number;
  };
}

export class SankeyDiagramGenerator {
  async generateSankeyData(
    consensus: ConsensusAnalysis,
    expertAnalyses: Map<string, ExpertAnalysis>
  ): Promise<SankeyData> {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap = new Map<string, string>(); // Original ID to Sankey ID
    
    // Extract all symptoms (Level 0)
    const symptoms = this.extractAllSymptoms(expertAnalyses);
    symptoms.forEach((symptom, index) => {
      const nodeId = `symptom_${index}`;
      nodeMap.set(symptom.id, nodeId);
      
      nodes.push({
        id: nodeId,
        name: symptom.name,
        category: 'symptom',
        level: 0,
        details: {
          description: symptom.description || symptom.name,
          confidence: symptom.severity || 0.7,
          origin: 'patient',
          urgency: this.mapSeverityToUrgency(symptom.severity),
          evidence: symptom.characteristics || []
        }
      });
    });
    
    // Add diagnoses (Level 1)
    consensus.diagnoses.forEach((diagnosis, index) => {
      const nodeId = `diagnosis_${index}`;
      nodeMap.set(diagnosis.id || diagnosis.name, nodeId);
      
      nodes.push({
        id: nodeId,
        name: diagnosis.name,
        category: 'diagnosis',
        level: 1,
        details: {
          description: `${diagnosis.name} (${diagnosis.code || 'No code'})`,
          confidence: diagnosis.consensusConfidence,
          origin: 'consensus',
          urgency: this.calculateDiagnosisUrgency(diagnosis),
          evidence: diagnosis.supportingEvidence || []
        }
      });
      
      // Create symptom -> diagnosis links
      diagnosis.supportingEvidence?.forEach(symptomId => {
        const symptomNodeId = nodeMap.get(symptomId);
        if (symptomNodeId) {
          links.push({
            source: symptomNodeId,
            target: nodeId,
            value: diagnosis.consensusConfidence * 0.8,
            type: 'suggests',
            reasoning: `${symptomId} is associated with ${diagnosis.name}`,
            expertIds: diagnosis.expertVotes.map(v => v.expertId)
          });
        }
      });
    });
    
    // Add inquiries (Level 1.5 - between diagnoses and treatments)
    consensus.inquiries.forEach((inquiry, index) => {
      const nodeId = `inquiry_${index}`;
      nodeMap.set(inquiry.id, nodeId);
      
      nodes.push({
        id: nodeId,
        name: this.truncateQuestion(inquiry.question),
        category: 'inquiry',
        level: 1.5,
        details: {
          description: inquiry.question,
          confidence: inquiry.diagnosticImpact || 0.7,
          origin: 'expert',
          urgency: inquiry.priority,
          evidence: [`Suggested by ${inquiry.expertCount} experts`]
        }
      });
      
      // Create diagnosis -> inquiry links
      inquiry.relatedDiagnoses?.forEach(diagnosisId => {
        const diagnosisNodeId = nodeMap.get(diagnosisId);
        if (diagnosisNodeId) {
          const linkType = inquiry.intent === 'confirmatory' ? 'confirms' : 
                          inquiry.intent === 'exclusionary' ? 'rules_out' : 
                          'requires';
          
          links.push({
            source: diagnosisNodeId,
            target: nodeId,
            value: inquiry.diagnosticImpact || 0.7,
            type: linkType,
            reasoning: inquiry.expectedImpact?.ifYes || 'Diagnostic inquiry',
            expertIds: inquiry.suggestedBy || []
          });
        }
      });
    });
    
    // Add treatments (Level 2)
    consensus.treatments.forEach((treatment, index) => {
      const nodeId = `treatment_${index}`;
      
      nodes.push({
        id: nodeId,
        name: treatment.name,
        category: treatment.type === 'medication' ? 'medication' : 'treatment',
        level: 2,
        details: {
          description: treatment.description,
          confidence: treatment.effectiveness || 0.7,
          origin: treatment.origin,
          evidence: treatment.evidence || []
        }
      });
      
      // Create diagnosis -> treatment links
      treatment.targetDiagnoses?.forEach(diagnosisId => {
        const diagnosisNodeId = nodeMap.get(diagnosisId);
        if (diagnosisNodeId) {
          links.push({
            source: diagnosisNodeId,
            target: nodeId,
            value: treatment.effectiveness || 0.7,
            type: 'treats',
            reasoning: treatment.mechanism || 'Standard treatment',
            expertIds: treatment.recommendedBy || []
          });
        }
      });
    });
    
    return {
      nodes,
      links,
      metadata: {
        totalConfidence: consensus.overallConfidence,
        expertAgreement: consensus.agreementScore,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  private extractAllSymptoms(
    expertAnalyses: Map<string, ExpertAnalysis>
  ): SymptomNode[] {
    const symptomMap = new Map<string, SymptomNode>();
    
    for (const [_, analysis] of expertAnalyses) {
      analysis.findings.symptoms.forEach(symptom => {
        const existing = symptomMap.get(symptom.id) || symptom;
        // Merge symptom data from multiple experts
        symptomMap.set(symptom.id, {
          ...existing,
          confidence: Math.max(existing.confidence || 0, symptom.confidence || 0)
        });
      });
    }
    
    return Array.from(symptomMap.values());
  }
  
  private truncateQuestion(question: string, maxLength: number = 50): string {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength - 3) + '...';
  }
  
  private mapSeverityToUrgency(severity?: number): 'critical' | 'high' | 'medium' | 'low' {
    if (!severity) return 'medium';
    if (severity > 0.8) return 'critical';
    if (severity > 0.6) return 'high';
    if (severity > 0.3) return 'medium';
    return 'low';
  }
  
  private calculateDiagnosisUrgency(diagnosis: any): 'critical' | 'high' | 'medium' | 'low' {
    // Check for critical conditions
    const criticalCodes = ['I21', 'I22', 'J80', 'R57']; // MI, subsequent MI, ARDS, shock
    if (criticalCodes.some(code => diagnosis.code?.startsWith(code))) {
      return 'critical';
    }
    
    // High confidence serious conditions
    if (diagnosis.consensusConfidence > 0.7 && diagnosis.urgency === 'high') {
      return 'high';
    }
    
    // Default based on confidence
    if (diagnosis.consensusConfidence > 0.6) return 'medium';
    return 'low';
  }
}
```

## API Integration

The API layer implements the workflow's requirements for conditional processing, SSE streaming, and progressive updates.

### MoE Analysis Endpoint (Workflow Phase 3-6)

```typescript
// src/routes/v1/session/[sessionId]/analyze-moe/+server.ts
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getSession, updateSession, setAnalysisInProgress } from "$lib/session/manager";
import { moeSessionAnalysisWorkflow } from "$lib/moe/workflows/session-analysis";
import { logger } from "$lib/logging/logger";

export const POST: RequestHandler = async ({
  params,
  request,
  locals: { supabase, safeGetSession, user }
}) => {
  const { session } = await safeGetSession();
  if (!session || !user) {
    error(401, { message: "Unauthorized" });
  }
  
  const sessionId = params.sessionId!;
  const sessionData = getSession(sessionId);
  
  if (!sessionData) {
    error(404, { message: "Session not found" });
  }
  
  if (sessionData.userId !== user.id) {
    error(403, { message: "Access denied" });
  }
  
  // Workflow Phase 3: Change Detection
  const { transcript, previousAnalysis, patientContext } = await request.json();
  
  // Extract inputs and check for changes
  const inputExtractor = new InputExtractor();
  const currentInputs = await inputExtractor.extract(transcript, patientContext);
  
  // Compare with previous analysis
  const changeDetector = new ChangeDetector();
  const hasChanges = changeDetector.detectChanges(
    currentInputs,
    previousAnalysis?.inputs || [],
    previousAnalysis?.answeredQuestions || []
  );
  
  if (!hasChanges) {
    // No changes - return early per workflow
    return json({
      status: 'no_changes',
      message: 'No new inputs or answers detected',
      previousAnalysis
    });
  }
  
  try {
    // Get request options
    const { options = {} } = await request.json();
    const { streaming = true, includeVisualizations = true } = options;
    
    // Mark analysis as in progress
    setAnalysisInProgress(sessionId, true);
    
    // Prepare context for MoE analysis
    const context = {
      transcript: sessionData.transcripts?.map(t => t.text).join(" ") || "",
      patientHistory: await getPatientHistory(user.id, supabase),
      language: sessionData.language,
      previousAnalyses: sessionData.analysisState?.currentDiagnosis || []
    };
    
    logger.moe.info("Starting MoE analysis", { sessionId, language: context.language });
    
    if (streaming) {
      // Stream results via SSE
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const workflow = await moeSessionAnalysisWorkflow();
            
            // Stream updates as they complete
            for await (const update of workflow.stream(context)) {
              const data = {
                type: "moe_update",
                data: update,
                timestamp: Date.now()
              };
              
              controller.enqueue(
                `data: ${JSON.stringify(data)}\n\n`
              );
              
              // Update session with partial results
              if (update.consensus) {
                updateSession(sessionId, {
                  analysisState: {
                    ...sessionData.analysisState,
                    currentDiagnosis: update.consensus.diagnoses,
                    currentTreatment: update.consensus.treatments,
                    lastAnalysisTime: Date.now()
                  }
                });
              }
            }
            
            controller.enqueue(`data: {"type":"complete"}\n\n`);
            controller.close();
          } catch (err) {
            logger.moe.error("MoE analysis stream error", { error: err });
            controller.error(err);
          } finally {
            setAnalysisInProgress(sessionId, false);
          }
        }
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    } else {
      // Non-streaming response
      const workflow = await moeSessionAnalysisWorkflow();
      const result = await workflow.invoke(context);
      
      // Update session with results
      updateSession(sessionId, {
        analysisState: {
          ...sessionData.analysisState,
          currentDiagnosis: result.consensus.diagnoses,
          currentTreatment: result.consensus.treatments,
          lastAnalysisTime: Date.now()
        }
      });
      
      setAnalysisInProgress(sessionId, false);
      
      return json({
        success: true,
        analysis: result.analysis,
        consensus: result.consensus,
        visualizations: includeVisualizations ? result.visualizations : undefined,
        metadata: result.metadata
      });
    }
  } catch (err) {
    logger.moe.error("MoE analysis error", { sessionId, error: err });
    setAnalysisInProgress(sessionId, false);
    error(500, { message: "Analysis failed" });
  }
};

async function getPatientHistory(userId: string, supabase: any) {
  // Fetch relevant patient history from database
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('medical_history')
    .eq('user_id', userId)
    .single();
  
  return data?.medical_history || {};
}
```

## Real-time Streaming

The SSE integration implements the workflow's Phase 6 requirements for progressive streaming and real-time UI updates.

### Enhanced SSE Handler (Workflow-Aligned)

```typescript
// src/lib/moe/streaming/sse-handler.ts
import type { SSEUpdate } from "$lib/session/manager";
import { getSessionEmitter } from "$lib/session/manager";

export class MoESSEHandler {
  private sessionId: string;
  private emitter: any;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.emitter = getSessionEmitter(sessionId);
  }
  
  // Phase 2: Input and answer updates
  emitInputUpdate(inputs: InputNode[], answers: AnswerNode[]) {
    const update: SSEUpdate = {
      type: 'input_update',
      data: {
        stage: 'input_extraction',
        inputs,
        answers,
        hasNewInputs: inputs.length > 0,
        hasNewAnswers: answers.length > 0
      },
      timestamp: Date.now()
    };
    
    this.emitter?.emit('sse_update', update);
  }
  
  // Phase 4: Progressive expert updates
  emitExpertUpdate(expertId: string, status: 'started' | 'completed' | 'failed', data?: any) {
    const update: SSEUpdate = {
      type: 'expert_update',
      data: {
        stage: 'expert_analysis',
        expertId,
        status,
        expertData: data,
        // Include partial results for progressive rendering
        partialFindings: data?.findings,
        criticalAlerts: data?.criticalFindings
      },
      timestamp: Date.now()
    };
    
    this.emitter?.emit('sse_update', update);
  }
  
  emitConsensusUpdate(progress: number, partialConsensus?: any) {
    const update: SSEUpdate = {
      type: 'analysis_update',
      data: {
        stage: 'consensus_building',
        progress,
        partialConsensus
      },
      timestamp: Date.now()
    };
    
    this.emitter?.emit('sse_update', update);
  }
  
  emitVisualizationUpdate(visualizationType: string, data: any) {
    const update: SSEUpdate = {
      type: 'analysis_update',
      data: {
        stage: 'visualization',
        visualizationType,
        visualizationData: data
      },
      timestamp: Date.now()
    };
    
    this.emitter?.emit('sse_update', update);
  }
  
  emitError(error: any) {
    const update: SSEUpdate = {
      type: 'error',
      data: {
        message: error.message || 'Analysis error occurred',
        code: error.code
      },
      timestamp: Date.now()
    };
    
    this.emitter?.emit('sse_update', update);
  }
}
```

## Testing Strategy

The testing strategy ensures all workflow phases are properly validated with comprehensive test coverage.

### Workflow-Aligned Testing Approach

1. **Unit Tests**: Individual expert behavior and schema validation
2. **Integration Tests**: Expert consensus and workflow execution
3. **E2E Tests**: Complete session analysis flow with SSE updates
4. **Performance Tests**: Parallel processing and streaming latency

### Expert Agent Tests

```typescript
// src/lib/moe/tests/experts.test.ts
import { describe, it, expect } from "vitest";
import { GeneralPractitionerExpert } from "../experts/general-practitioner";
import { DiagnosticSpecialistExpert } from "../experts/diagnostic-specialist";

describe("MoE Expert Agents", () => {
  // Enhanced mock context per workflow requirements
  const mockContext: ExpertContext = {
    transcript: "Patient presents with fever, cough, and fatigue for 3 days",
    language: "en",
    previousAnalyses: [],
    currentHypotheses: [],
    completePatientHistory: {
      chronicConditions: [{ name: "hypertension", since: "2020" }],
      previousDiagnoses: [],
      medicationHistory: [{ name: "lisinopril", dosage: "10mg daily" }],
      familyHistory: { conditions: ["diabetes", "heart disease"] },
      allergies: [],
      adverseReactions: [],
      socialDeterminants: { smokingStatus: "never" },
      treatmentResponses: [],
      complianceHistory: []
    },
    currentMedications: [{ name: "lisinopril", dosage: "10mg", frequency: "daily" }],
    vitalSigns: [],
    labResults: [],
    imagingResults: [],
    identifiedPatterns: [],
    riskFactors: [],
    demographics: { age: 45, sex: "male", patientId: "test-123" }
  };
  
  describe("General Practitioner Expert", () => {
    it("should provide holistic assessment", async () => {
      const expert = new GeneralPractitionerExpert();
      const analysis = await expert.analyze(mockContext);
      
      expect(analysis.expertId).toBe("gp_expert");
      expect(analysis.findings.symptoms.length).toBeGreaterThan(0);
      expect(analysis.findings.possibleDiagnoses.length).toBeGreaterThan(0);
      expect(analysis.reasoning).toBeTruthy();
    });
  });
  
  describe("Diagnostic Specialist Expert", () => {
    it("should generate differential diagnoses with probabilities", async () => {
      const expert = new DiagnosticSpecialistExpert();
      const analysis = await expert.analyze(mockContext);
      
      expect(analysis.expertId).toBe("diagnostic_specialist");
      expect(analysis.findings.possibleDiagnoses.length).toBeGreaterThan(0);
      
      // Check probability distribution
      const diagnoses = analysis.findings.possibleDiagnoses;
      expect(diagnoses[0].confidence).toBeGreaterThan(diagnoses[1]?.confidence || 0);
      
      // Verify evidence chains
      expect(analysis.evidenceChain.length).toBeGreaterThan(0);
    });
  });
});

describe("Consensus Building", () => {
  it("should aggregate expert opinions correctly", async () => {
    const builder = new ConsensusBuilder();
    const mockAnalyses = new Map([
      ["expert1", createMockAnalysis("expert1", [
        { name: "Flu", confidence: 0.8 },
        { name: "COVID", confidence: 0.6 }
      ])],
      ["expert2", createMockAnalysis("expert2", [
        { name: "Flu", confidence: 0.7 },
        { name: "Bacterial Infection", confidence: 0.5 }
      ])]
    ]);
    
    const consensus = await builder.buildConsensus(mockAnalyses);
    
    expect(consensus.diagnoses[0].name).toBe("Flu");
    expect(consensus.diagnoses[0].consensusConfidence).toBeGreaterThan(0.7);
    expect(consensus.agreementScore).toBeGreaterThan(0.5);
  });
  
  it("should detect conflicts between experts", async () => {
    const builder = new ConsensusBuilder();
    const conflictingAnalyses = new Map([
      ["expert1", createMockAnalysis("expert1", [
        { name: "Flu", confidence: 0.9 }
      ])],
      ["expert2", createMockAnalysis("expert2", [
        { name: "Pneumonia", confidence: 0.9 }
      ])]
    ]);
    
    const consensus = await builder.buildConsensus(conflictingAnalyses);
    
    expect(consensus.conflicts.length).toBeGreaterThan(0);
    expect(consensus.conflicts[0].type).toBe("diagnosis_disagreement");
  });
});
```

### Integration Tests

```typescript
// src/lib/moe/tests/integration.test.ts
import { describe, it, expect } from "vitest";
import { moeSessionAnalysisWorkflow } from "../workflows/session-analysis";

describe("MoE Workflow Integration", () => {
  it("should complete full analysis workflow", async () => {
    const workflow = await moeSessionAnalysisWorkflow();
    const context = {
      transcript: "Patient reports severe headache, neck stiffness, and photophobia",
      language: "en",
      patientHistory: {}
    };
    
    const result = await workflow.invoke(context);
    
    // Verify all components completed
    expect(result.expertAnalyses.size).toBe(5); // 5 experts
    expect(result.consensus).toBeTruthy();
    expect(result.visualizations.sankey).toBeTruthy();
    expect(result.visualizations.sankey.nodes.length).toBeGreaterThan(0);
    expect(result.visualizations.sankey.links.length).toBeGreaterThan(0);
  });
  
  it("should handle streaming updates", async () => {
    const workflow = await moeSessionAnalysisWorkflow();
    const updates: any[] = [];
    
    for await (const update of workflow.stream(mockContext)) {
      updates.push(update);
    }
    
    // Verify progressive updates
    expect(updates.length).toBeGreaterThan(5); // Multiple update stages
    expect(updates.some(u => u.stage === 'expert_analysis')).toBe(true);
    expect(updates.some(u => u.stage === 'consensus_building')).toBe(true);
    expect(updates.some(u => u.stage === 'visualization')).toBe(true);
  });
});
```

## Configuration

### Configuration Management

The schema-based approach uses JSON configuration files that can be easily modified without code changes:

#### Main Configuration (`config/session-moe.json`)

```json
{
  "providers": {
    "openai": {
      "enabled": true,
      "apiKeyEnv": "OPENAI_API_KEY",
      "models": {
        "analytical": {
          "name": "gpt-4o-2024-08-06",
          "temperature": 0.2,
          "maxTokens": 4096
        },
        "fast": {
          "name": "gpt-4o-mini", 
          "temperature": 0.3,
          "maxTokens": 2048
        }
      }
    }
  },
  "experts": {
    "gp_core": {
      "id": "gp_core",
      "name": "Dr. GP Core",
      "specialty": "General Practice & Primary Care",
      "baseConfidence": 0.85,
      "reasoningStyle": "pattern-matching",
      "provider": "openai",
      "modelType": "analytical",
      "schema": {
        "configPath": "gp-core"
      },
      "settings": {
        "prioritizeCommonConditions": true,
        "includePreventiveCare": true
      }
    }
  },
  "defaultExpertSet": "gp_basic"
}
```

#### Dynamic Schema Loading

```typescript
// src/lib/session-moe/config/loader.ts - getExpertSchema method
async getExpertSchema(expertKey: string): Promise<any> {
  const expertConfig = this.getExpertConfig(expertKey);
  if (!expertConfig?.schema?.configPath) {
    throw new Error(`No schema configuration found for expert: ${expertKey}`);
  }

  try {
    // Dynamic import of the schema configuration
    const schemaModule = await import(`$lib/configurations/moe-experts/${expertConfig.schema.configPath}`);
    
    // Support for schema variants (enhanced, simple, fast, etc.)
    if (expertConfig.schema.variant && schemaModule[expertConfig.schema.variant]) {
      return schemaModule[expertConfig.schema.variant];
    }
    
    // Default export
    return schemaModule.default;
  } catch (error) {
    logger.moe?.error(`Failed to load expert schema: ${expertConfig.schema.configPath}`, { error });
    throw new Error(`Failed to load schema for expert ${expertKey}: ${error.message}`);
  }
}
```

#### Expert Set Usage

```typescript
// How to use different expert sets
const moeAnalyzer = new MoESessionAnalyzer();

// Use GP Basic set (3 experts)
const basicResult = await moeAnalyzer.streamAnalysis(context, 'gp_basic');

// Use Comprehensive set (6 experts)
const comprehensiveResult = await moeAnalyzer.streamAnalysis(context, 'comprehensive');

// Use Emergency set (3 experts, optimized for speed)
const emergencyResult = await moeAnalyzer.streamAnalysis(context, 'emergency');
```

## Deployment Considerations

### Performance Optimization

1. **Parallel Processing**: All experts run concurrently
2. **Caching**: Cache expert results for similar inputs
3. **Streaming**: Progressive updates reduce perceived latency
4. **Model Selection**: Use appropriate models for each expert role

### Monitoring

```typescript
// src/lib/moe/monitoring/metrics.ts
export const MoEMetrics = {
  expertLatency: new Map<string, number[]>(),
  consensusAgreement: [],
  visualizationGenerationTime: [],
  
  recordExpertLatency(expertId: string, latency: number) {
    const latencies = this.expertLatency.get(expertId) || [];
    latencies.push(latency);
    this.expertLatency.set(expertId, latencies);
  },
  
  getAverageExpertLatency(expertId: string): number {
    const latencies = this.expertLatency.get(expertId) || [];
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }
};
```

## Implementation Phases

This section outlines the complete roadmap for implementing the MoE system from the current state to full production deployment.

### Phase 0: Epic 0 Foundation - Foundational Clinical Decision Support (CRITICAL PRIORITY)

**This new phase must be completed BEFORE Phase 1 to satisfy Epic 0 user story requirements**

#### 0.1 Enhanced Patient Data Architecture
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 3-4 hours

- Enhance ExpertContext interface with comprehensive patient data structure
- Implement comprehensive patient history retrieval system from database
- Add support for current medications, vital signs, lab results, imaging
- Create data models for historical patterns and risk factors

**Deliverables**:
- Updated ExpertContext interface with all Epic 0 data requirements
- Comprehensive patient history retrieval functions
- Database integration for complete medical records
- Data validation and transformation utilities

#### 0.2 Missing Critical Expert Implementations
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 8-10 hours

Create the four missing experts required for Epic 0 compliance:
- `src/lib/session-moe/experts/medical-history-integration.ts`
- `src/lib/session-moe/experts/safety-monitor.ts` 
- `src/lib/session-moe/experts/treatment-planner.ts`
- `src/lib/session-moe/experts/preventive-care-specialist.ts`

**Deliverables**:
- All four expert implementations using schema-based approach
- Comprehensive schema definitions for each expert
- Integration with enhanced ExpertContext data
- Unit tests for each expert class

#### 0.3 Critical Safety and Risk Systems
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 6-8 hours

- Implement drug interaction analysis system
- Create demographic risk stratification algorithms
- Add red flag symptom detection capabilities
- Build critical detail recognition engine

**Deliverables**:
- Drug interaction database integration and analysis
- Demographic risk assessment algorithms
- Red flag detection system with urgency classification
- Critical detail highlighting and prioritization

#### 0.4 Enhanced Expert Set Configurations
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 2-3 hours

- Update all expert set configurations to include new foundational experts
- Adjust consensus weights for comprehensive analysis
- Create Epic 0 compliant expert set configurations

**Deliverables**:
- Updated expert set JSON files with all seven experts
- Balanced consensus weights for foundational analysis
- Configuration validation for Epic 0 compliance

### Phase 1: Core Implementation (High Priority)

#### 1.1 Fix TypeScript Errors and Dependencies
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 2-4 hours

- Resolve compilation errors in `src/lib/session-moe/index.ts`
- Fix missing imports and type definitions in base expert class
- Ensure all configuration loading works properly
- Test expert set loading from separate JSON files

**Deliverables**:
- Clean TypeScript compilation with no errors
- Working configuration loader with expert set support
- Functional base expert class with schema integration

#### 1.2 Create Missing Expert Implementation Files  
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 6-8 hours

Create schema-based expert implementations:
- `src/lib/session-moe/experts/gp-core.ts`
- `src/lib/session-moe/experts/diagnostic-specialist.ts`
- `src/lib/session-moe/experts/clinical-inquiry.ts`
- `src/lib/session-moe/experts/basic-diagnosis.ts`
- `src/lib/session-moe/experts/basic-inquiry.ts`

**Deliverables**:
- All expert classes extending `MedicalExpertBase`
- Schema-based analysis methods using AI provider abstraction
- Proper transformation from schema output to `ExpertAnalysis` format
- Unit tests for each expert implementation

#### 1.3 Implement Consensus Builder
**Status**: Pending | **Priority**: Critical | **Estimated Time**: 8-10 hours

- `src/lib/session-moe/consensus/builder.ts` with weighted voting algorithm
- Conflict detection and resolution algorithms
- Uncertainty identification and handling
- Support for different consensus strategies per expert set

**Deliverables**:
- Working consensus builder with configurable weights
- Conflict detection for disagreeing experts
- Uncertainty metrics and resolution strategies
- Comprehensive test coverage for consensus scenarios

#### 1.4 Create Visualization System
**Status**: Pending | **Priority**: High | **Estimated Time**: 10-12 hours

- `src/lib/session-moe/visualization/sankey-generator.ts` for symptom→diagnosis→treatment flows
- Evidence map generator for diagnostic reasoning paths
- Decision tree visualization support (optional)
- Integration with existing UI visualization components

**Deliverables**:
- Sankey diagram data generation with proper node/link structures
- Evidence mapping with strength indicators
- JSON output compatible with D3.js or similar visualization libraries
- Performance optimization for large diagnostic trees

### Phase 2: Integration and Workflow (High Priority)

#### 2.1 Build MoE Session Analysis Workflow
**Status**: Pending | **Priority**: High | **Estimated Time**: 6-8 hours

- `src/lib/session-moe/workflows/session-analysis.ts`
- Orchestrate expert analysis → consensus → visualization pipeline
- Support for streaming updates and error handling
- Integration with existing session management system

**Deliverables**:
- Complete workflow orchestration
- Streaming support with progressive updates
- Error recovery and graceful degradation
- Performance monitoring integration

#### 2.2 Create API Endpoints
**Status**: Pending | **Priority**: High | **Estimated Time**: 4-6 hours

- `src/routes/v1/session/[sessionId]/analyze-moe/+server.ts`
- Expert set selection endpoint
- Visualization data endpoints
- Configuration management endpoints

**Deliverables**:
- RESTful API for MoE analysis
- Expert set selection and configuration
- Proper authentication and authorization
- OpenAPI documentation

#### 2.3 Implement Real-time Streaming
**Status**: Pending | **Priority**: Medium | **Estimated Time**: 6-8 hours

- SSE support for progressive MoE updates
- Integration with existing session manager EventEmitter
- Update UI components to display MoE results
- WebSocket fallback for better browser compatibility

**Deliverables**:
- Real-time streaming of expert analysis progress
- UI components showing live MoE updates
- Proper error handling for connection issues
- Performance optimization for multiple concurrent sessions

### Phase 3: Testing and Optimization (Medium Priority)

#### 3.1 Comprehensive Testing
**Status**: Pending | **Priority**: Medium | **Estimated Time**: 8-10 hours

- Unit tests for all expert classes and consensus builder
- Integration tests for complete workflow
- End-to-end testing with real medical scenarios
- Performance benchmarking and optimization

**Deliverables**:
- 90%+ test coverage for all MoE components
- Integration test suite with realistic medical data
- Performance benchmarks and optimization recommendations
- Automated testing pipeline integration

#### 3.2 Integration with Existing System
**Status**: Pending | **Priority**: Medium | **Estimated Time**: 4-6 hours

- Update current session analysis to optionally use MoE
- Backward compatibility with existing analysis methods
- Migration strategy for existing sessions
- Feature flagging for gradual rollout

**Deliverables**:
- Seamless integration with existing workflows
- Configuration-driven MoE enablement
- Migration tools for existing data
- A/B testing framework for comparing approaches

### Phase 4: Monitoring and Production (Low Priority)

#### 4.1 Performance Monitoring
**Status**: Pending | **Priority**: Low | **Estimated Time**: 4-6 hours

- Metrics collection for expert latency and accuracy
- Consensus agreement tracking and alerting
- Visualization generation performance monitoring
- Cost optimization for API usage across providers

**Deliverables**:
- Comprehensive monitoring dashboard
- Automated alerting for performance issues
- Cost tracking and optimization recommendations
- Usage analytics and insights

#### 4.2 Production Deployment
**Status**: Pending | **Priority**: Low | **Estimated Time**: 2-4 hours

- Environment configuration for production
- Load testing and capacity planning
- Security review and vulnerability assessment
- Documentation for deployment and maintenance

**Deliverables**:
- Production-ready deployment configuration
- Load testing results and scaling recommendations
- Security audit and remediation
- Operational runbooks and troubleshooting guides

## Implementation Priority and Dependencies

### CRITICAL: Epic 0 Foundation (Week 1)
**MUST COMPLETE FIRST - Required for Epic 0 user story compliance**
1. **Phase 0.1**: Enhanced patient data architecture and comprehensive history retrieval
2. **Phase 0.2**: Implement missing critical experts (Medical History, Safety Monitor, Treatment Planner, Preventive Care)
3. **Phase 0.3**: Critical safety systems (drug interactions, red flags, demographic risks)
4. **Phase 0.4**: Update expert set configurations for comprehensive analysis

### Immediate Next Steps (Week 2)
1. **Phase 1.1**: Fix TypeScript errors and get basic compilation working
2. **Phase 1.2**: Create remaining expert implementation files (GP Core, Diagnostic Specialist, Clinical Inquiry)
3. **Phase 1.3**: Build consensus builder with weighted voting for all 7 experts

### Short Term Goals (Week 3-4)
1. **Phase 1.4**: Implement Sankey visualization generator with Epic 0 data
2. **Phase 2.1**: Create complete workflow orchestration including foundational experts
3. **Phase 2.2**: Build API endpoints for MoE analysis with comprehensive patient data

### Medium Term Goals (Week 5-7)
1. **Phase 2.3**: Add real-time streaming support for all expert analysis
2. **Phase 3.1**: Comprehensive testing including Epic 0 scenarios
3. **Phase 3.2**: Integration with existing system using enhanced MoE capabilities

### Long Term Goals (Month 2+)
1. **Phase 4.1**: Production monitoring including Epic 0 success metrics
2. **Phase 4.2**: Full production deployment and scaling

## Critical Success Factors

### Epic 0 Foundational Requirements
1. **Comprehensive Medical History Integration**: 90% of relevant historical details automatically identified and flagged
2. **Critical Detail Recognition**: 100% of red flag symptoms and contraindications identified
3. **Multi-Expert Analysis Value**: 85% of doctors report finding additional expert insights helpful  
4. **Patient Safety**: 95% reduction in medication errors and contraindications missed
5. **Decision Support Effectiveness**: 25% improvement in treatment selection appropriateness

### Technical Excellence
6. **Schema Consistency**: Ensure all expert schemas follow the established pattern
7. **Performance**: Maintain sub-30-second analysis times for comprehensive expert sets (7 experts)
8. **Accuracy**: Consensus building should improve diagnostic accuracy over single-expert approaches
9. **Usability**: Sankey diagrams and visualizations must be intuitive for medical professionals
10. **Reliability**: System must gracefully handle expert failures and API timeouts

### Clinical Impact
11. **Time Savings**: Average 15 minutes saved per complex consultation through comprehensive analysis
12. **Diagnostic Confidence**: 20% increase in physician confidence scores
13. **Risk Prevention**: 40% increase in preventive care recommendations acted upon
14. **Treatment Optimization**: 15% improvement in treatment appropriateness scores

## Risk Mitigation

### Workflow-Aligned Risk Management
- **Incomplete Medical History Data**: Implement robust data validation and fallback mechanisms for missing historical data
- **Drug Interaction Database Accuracy**: Use multiple authoritative sources with conflict resolution algorithms
- **Critical Detail False Positives**: Implement confidence thresholds and expert validation for red flag detection
- **Patient Privacy Concerns**: Ensure HIPAA compliance and encrypted handling of comprehensive medical records
- **Performance Degradation**: Monitor parallel expert processing and implement timeouts
- **SSE Connection Issues**: Implement reconnection logic and state recovery

## Implementation Summary

This implementation guide aligns with the comprehensive workflow defined in [AI_SESSION_WORKFLOW.md](./AI_SESSION_WORKFLOW.md), providing:

### Key Alignments with Workflow

1. **Five Core Experts**: GP, Diagnostic Specialist, Treatment Planner, Clinical Inquiry, and Safety Monitor
2. **Parallel Processing**: All experts analyze simultaneously (Phase 4)
3. **Conditional Analysis**: Change detection determines processing (Phase 3)
4. **Progressive Streaming**: SSE updates as experts complete (Phase 6)
5. **Interactive Visualization**: Sankey diagrams with accept/suppress functionality
6. **Unique ID Management**: All nodes receive unique identifiers for tracking
7. **Evidence Chains**: Complete reasoning paths with expert attribution

### Next Steps for Implementation

1. **Complete Expert Schemas**: Finalize the 5 expert schema definitions in `src/lib/configurations/moe-experts/`
2. **Implement Base Classes**: Build the schema-based expert base class with context enhancement
3. **Build Consensus System**: Implement weighted voting with conflict detection
4. **Create Visualizations**: Develop the interactive Sankey diagram generator
5. **Integrate SSE**: Add progressive streaming for real-time updates
6. **Test Thoroughly**: Validate all workflow phases with comprehensive tests

### Success Criteria

- All workflow phases properly implemented
- Expert analyses complete in < 3 seconds
- Sankey visualizations render progressively
- Accept/suppress functionality works correctly
- Evidence chains are transparent and traceable
- System handles failures gracefully

This schema-based MoE implementation provides a robust, maintainable, and scalable solution for advanced medical session analysis that fully aligns with the enhanced workflow specification.

### Technical Risks
- **AI Provider Outages**: Multi-provider support with automatic failover across all 7 experts
- **Performance Issues**: Caching, parallel processing, and expert set optimization for comprehensive analysis
- **Database Load**: Optimize patient history queries and implement intelligent caching for medical records
- **Expert Consensus Conflicts**: Robust conflict resolution with clear escalation paths for disagreeing experts

### Clinical Risks  
- **Over-reliance on AI**: Maintain clear physician oversight requirements and confidence indicators
- **Alert Fatigue**: Implement intelligent prioritization to prevent overwhelming physicians with notifications
- **Quality Control**: Comprehensive testing with medical professionals using real clinical scenarios
- **Integration Complexity**: Phased rollout with feature flags and backward compatibility

### Data and Compliance Risks
- **Medical Record Integration**: Ensure secure, compliant access to comprehensive patient histories
- **Liability Concerns**: Clear documentation of AI assistance role vs. physician decision-making
- **Data Quality**: Implement validation and cleaning for historical medical data inconsistencies

This implementation guide provides a complete foundation for building the MoE session analysis system with visual outputs and real-time streaming capabilities.