// Base expert class for MoE session analysis
// Provides common functionality and configuration-based initialization

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "$lib/logging/logger";
import { getMoEConfig, getExpertConfig, getProviderModel } from "../config/loader";
import type { ExpertConfig, ModelConfig } from "../config/loader";

export interface ExpertContext {
  transcript: string;
  patientHistory?: any;
  language: string;
  previousAnalyses?: any[];
  currentHypotheses?: DiagnosisHypothesis[];
  metadata?: any;
}

export interface DiagnosisHypothesis {
  id: string;
  name: string;
  confidence: number;
  code?: string;
  supportingEvidence: string[];
}

export interface SymptomNode {
  id: string;
  name: string;
  description?: string;
  severity?: number;
  confidence?: number;
  characteristics?: string[];
}

export interface DiagnosisNode {
  id: string;
  name: string;
  code?: string;
  confidence: number;
  supportingSymptoms?: string[];
  supportingEvidence?: string[];
  reasoning?: string;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
}

export interface TreatmentNode {
  id: string;
  name: string;
  type: 'medication' | 'procedure' | 'therapy' | 'lifestyle';
  description?: string;
  confidence?: number;
  effectiveness?: number;
  targetDiagnoses?: string[];
  contraindications?: string[];
  mechanism?: string;
  dosage?: string;
  duration?: string;
  sideEffects?: string[];
}

export interface InquiryNode {
  id: string;
  question: string;
  category: 'confirmatory' | 'exclusionary' | 'exploratory' | 'risk_assessment';
  intent: 'confirmatory' | 'exclusionary' | 'exploratory';
  priority: 'critical' | 'high' | 'medium' | 'low';
  relatedDiagnoses?: string[];
  expectedImpact?: {
    ifYes: string;
    ifNo: string;
  };
  diagnosticYield?: number;
  suggestedBy?: string[];
  feasibility?: number;
}

export interface EvidenceLink {
  from: string;
  to: string;
  strength: number;
  type: 'supports' | 'contradicts' | 'confirms' | 'rules_out' | 'suggests' | 'treats' | 'requires';
  reasoning: string;
  expertIds?: string[];
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

export abstract class MedicalExpertBase {
  protected llm: BaseChatModel;
  protected config: ExpertConfig;
  protected modelConfig: ModelConfig;
  
  constructor(protected readonly expertKey: string) {
    try {
      const moeConfig = getMoEConfig();
      const expertConfig = getExpertConfig(expertKey);
      
      if (!expertConfig) {
        throw new Error(`Expert configuration not found for: ${expertKey}`);
      }
      
      this.config = expertConfig;
      
      // Get model configuration
      const modelConfig = getProviderModel(expertConfig.provider, expertConfig.modelType);
      if (!modelConfig) {
        throw new Error(`Model configuration not found for provider: ${expertConfig.provider}, type: ${expertConfig.modelType}`);
      }
      
      this.modelConfig = modelConfig;
      this.llm = this.initializeLLM();
      
      logger.moe?.debug(`Initialized expert: ${this.name}`, {
        expertId: this.id,
        provider: this.config.provider,
        model: this.modelConfig.name
      });
    } catch (error) {
      logger.moe?.error(`Failed to initialize expert: ${expertKey}`, { error });
      throw error;
    }
  }
  
  // Getters for expert properties
  get id(): string { return this.config.id; }
  get name(): string { return this.config.name; }
  get specialty(): string { return this.config.specialty; }
  get confidence(): number { return this.config.baseConfidence; }
  get reasoningStyle(): string { return this.config.reasoningStyle; }
  
  /**
   * Initialize the LLM based on provider configuration
   */
  private initializeLLM(): BaseChatModel {
    const provider = this.config.provider;
    const { name, temperature, maxTokens } = this.modelConfig;
    const moeConfig = getMoEConfig();
    const providerConfig = moeConfig.providers[provider];
    
    if (!providerConfig || !providerConfig.enabled) {
      throw new Error(`Provider ${provider} is not enabled`);
    }
    
    const apiKey = process.env[providerConfig.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`API key not found for ${provider}. Set ${providerConfig.apiKeyEnv} environment variable.`);
    }
    
    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: name,
          temperature,
          maxTokens,
          openAIApiKey: apiKey
        });
      
      case 'gemini':
      case 'google':
        return new ChatGoogleGenerativeAI({
          modelName: name,
          temperature,
          maxOutputTokens: maxTokens,
          apiKey: apiKey
        });
      
      case 'anthropic':
        return new ChatAnthropic({
          modelName: name,
          temperature,
          maxTokens,
          anthropicApiKey: apiKey
        });
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
  
  /**
   * Abstract method that each expert must implement
   */
  abstract analyze(context: ExpertContext): Promise<ExpertAnalysis>;
  
  /**
   * Measure performance of an operation
   */
  protected async measurePerformance<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    return { result, duration };
  }
  
  /**
   * Build a prompt from template with context substitution
   */
  protected buildPrompt(template: string, context: ExpertContext): string {
    return template
      .replace('{transcript}', context.transcript)
      .replace('{history}', JSON.stringify(context.patientHistory || {}))
      .replace('{language}', context.language)
      .replace('{hypotheses}', JSON.stringify(context.currentHypotheses || []))
      .replace('{previousAnalyses}', JSON.stringify(context.previousAnalyses || []));
  }
  
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
   * Get a setting from expert configuration with default fallback
   */
  protected getSetting<T>(key: string, defaultValue: T): T {
    return this.config.settings[key] ?? defaultValue;
  }
  
  /**
   * Create system message for LLM interaction
   */
  protected createSystemMessage(additionalContext?: string): SystemMessage {
    const template = this.getPromptTemplate();
    const focusAreas = this.config.prompt.focus.join('\n   - ');
    
    let systemContent = template.system;
    
    if (focusAreas) {
      systemContent += `\n\nFOCUS AREAS:\n   - ${focusAreas}`;
    }
    
    if (additionalContext) {
      systemContent += `\n\n${additionalContext}`;
    }
    
    systemContent += `\n\nEXPERT PROFILE:
- Specialty: ${this.specialty}
- Reasoning Style: ${this.reasoningStyle}
- Base Confidence: ${this.confidence}

Please provide structured analysis in the requested language, using appropriate medical terminology while ensuring clarity.`;
    
    return new SystemMessage({ content: systemContent });
  }
  
  /**
   * Create human message with context
   */
  protected createHumanMessage(context: ExpertContext, additionalInstructions?: string): HumanMessage {
    let content = `PATIENT TRANSCRIPT:
${context.transcript}

LANGUAGE: ${context.language}`;

    if (context.patientHistory && Object.keys(context.patientHistory).length > 0) {
      content += `\n\nMEDICAL HISTORY:
${JSON.stringify(context.patientHistory, null, 2)}`;
    }

    if (context.currentHypotheses && context.currentHypotheses.length > 0) {
      content += `\n\nCURRENT WORKING HYPOTHESES:
${context.currentHypotheses.map(h => `- ${h.name} (confidence: ${h.confidence})`).join('\n')}`;
    }

    if (context.previousAnalyses && context.previousAnalyses.length > 0) {
      content += `\n\nPREVIOUS ANALYSES:
${JSON.stringify(context.previousAnalyses, null, 2)}`;
    }

    if (additionalInstructions) {
      content += `\n\n${additionalInstructions}`;
    }

    return new HumanMessage({ content });
  }
  
  /**
   * Invoke the LLM using schema-based approach similar to existing configurations
   */
  protected async invokeWithSchema(context: ExpertContext): Promise<any> {
    try {
      const schema = await this.getExpertSchema();
      
      // Import and use the AI provider abstraction
      const { AIProviderAbstraction } = await import('$lib/ai/providers/abstraction');
      const aiProvider = AIProviderAbstraction.getInstance();
      
      // Map our provider to the abstraction enum
      const providerMap = {
        'openai': 'OPENAI_GPT4', // You may need to adjust this mapping based on your actual provider enum
        'gemini': 'GOOGLE_GEMINI',
        'google': 'GOOGLE_GEMINI', 
        'anthropic': 'ANTHROPIC_CLAUDE'
      };
      
      const provider = providerMap[this.config.provider];
      if (!provider) {
        throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
      
      // Create content for the AI provider
      const content = [{
        type: "text" as const,
        text: this.buildContextualPrompt(schema, context)
      }];
      
      // Token usage tracking (similar to existing pattern)
      const tokenUsage = { total: 0 };
      
      // Use the AI provider abstraction with our schema
      const result = await aiProvider.analyzeDocument(
        provider as any, // Type assertion needed due to enum mapping
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
      logger.moe?.error(`Schema-based LLM invocation failed for expert ${this.id}`, { error });
      throw error;
    }
  }
  
  /**
   * Build contextual prompt using schema description and context
   */
  private buildContextualPrompt(schema: any, context: ExpertContext): string {
    let prompt = schema.description || 'Analyze the provided medical information.';
    
    // Replace language placeholders
    prompt = prompt.replace(/\[LANGUAGE\]/g, context.language);
    
    // Add context information
    prompt += `\n\nPATIENT TRANSCRIPT:\n${context.transcript}`;
    
    if (context.patientHistory && Object.keys(context.patientHistory).length > 0) {
      prompt += `\n\nPATIENT MEDICAL HISTORY:\n${JSON.stringify(context.patientHistory, null, 2)}`;
    }
    
    if (context.currentHypotheses && context.currentHypotheses.length > 0) {
      prompt += `\n\nCURRENT WORKING HYPOTHESES:\n${context.currentHypotheses.map(h => `- ${h.name} (confidence: ${h.confidence})`).join('\n')}`;
    }
    
    if (context.previousAnalyses && context.previousAnalyses.length > 0) {
      prompt += `\n\nPREVIOUS ANALYSES:\n${JSON.stringify(context.previousAnalyses, null, 2)}`;
    }
    
    // Add expert-specific instructions
    prompt += `\n\nEXPERT CONTEXT:
- Specialty: ${this.specialty}
- Reasoning Style: ${this.reasoningStyle}
- Base Confidence: ${this.confidence}

Please provide your analysis following the structured schema format, ensuring all responses are in ${context.language} language.`;
    
    return prompt;
  }
  
  /**
   * Parse response content from LLM
   */
  protected parseResponseContent(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    
    if (response.content) {
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    }
    
    if (response.text) {
      return response.text;
    }
    
    return JSON.stringify(response);
  }
  
  /**
   * Generate unique ID for medical entities
   */
  protected generateId(prefix: string): string {
    return `${prefix}_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Calculate confidence score based on multiple factors
   */
  protected calculateConfidence(
    baseConfidence: number,
    evidenceStrength: number = 0.7,
    consensusSupport: number = 0.5
  ): number {
    const weighted = (baseConfidence * 0.5) + (evidenceStrength * 0.3) + (consensusSupport * 0.2);
    return Math.min(Math.max(weighted, 0), 1);
  }
  
  /**
   * Log expert analysis completion
   */
  protected logAnalysisCompletion(
    context: ExpertContext,
    analysis: ExpertAnalysis,
    duration: number
  ): void {
    logger.moe?.info(`${this.name} analysis completed`, {
      expertId: this.id,
      transcriptLength: context.transcript.length,
      language: context.language,
      processingTime: duration,
      symptomsFound: analysis.findings.symptoms.length,
      diagnosesFound: analysis.findings.diagnoses?.length || 0,
      treatmentsFound: analysis.findings.treatments?.length || 0,
      inquiriesGenerated: analysis.findings.inquiries?.length || 0,
      overallConfidence: analysis.findings.confidence
    });
  }
}