// Main entry point for MoE session analysis
import { loadMoEConfig, getExpertSetExperts, getExpertSetConsensus, getAllExpertSets, getDefaultExpertSetKey } from './config/loader';
import type { ExpertSetConfig } from './config/loader';
import { GeneralPractitionerExpert } from './experts/general-practitioner';
import { DiagnosticSpecialistExpert } from './experts/diagnostic-specialist';
import { TreatmentPlannerExpert } from './experts/treatment-planner';
import { DifferentialDiagnosisExpert } from './experts/differential-diagnosis';
import { ClinicalInquiryExpert } from './experts/clinical-inquiry';
import { ConsensusBuilder } from './consensus/builder';
import { SankeyDiagramGenerator } from './visualization/sankey-generator';
import { logger } from '$lib/logging/logger';

export interface MoESessionAnalyzer {
  analyzeSession(context: ExpertContext, expertSetKey?: string): Promise<MoEAnalysisOutput>;
  streamAnalysis(context: ExpertContext, expertSetKey?: string): AsyncGenerator<MoEUpdateEvent>;
  getAvailableExpertSets(): Record<string, ExpertSetInfo>;
}

export interface ExpertSetInfo {
  name: string;
  description: string;
  targetAudience: string;
  complexity: 'basic' | 'advanced' | 'specialized';
  expertCount: number;
}

export interface MoEUpdateEvent {
  type: 'expert_started' | 'expert_completed' | 'consensus_building' | 'visualization_ready' | 'complete';
  expertId?: string;
  stage?: string;
  progress?: number;
  data?: any;
  timestamp: number;
}

class MoESessionAnalyzerImpl implements MoESessionAnalyzer {
  private experts: Map<string, any> = new Map();
  private sankeyGenerator: SankeyDiagramGenerator;
  private initialized = false;
  private expertClasses: Record<string, any>;

  constructor() {
    this.sankeyGenerator = new SankeyDiagramGenerator();
    
    // Map of expert keys to their implementation classes
    this.expertClasses = {
      gp_core: GeneralPractitionerExpert,
      basic_diagnosis: DiagnosticSpecialistExpert, // Reuse with different config
      basic_inquiry: ClinicalInquiryExpert,         // Reuse with different config
      diagnostic_specialist: DiagnosticSpecialistExpert,
      treatment_planner: TreatmentPlannerExpert,
      differential_expert: DifferentialDiagnosisExpert,
      clinical_inquiry: ClinicalInquiryExpert,
      safety_monitor: GeneralPractitionerExpert,   // TODO: Create specialized class
      emergency_triage: GeneralPractitionerExpert, // TODO: Create specialized class
      rapid_diagnosis: DiagnosticSpecialistExpert  // TODO: Create specialized class
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load configuration
      await loadMoEConfig();
      logger.moe.info('MoE configuration loaded');

      // Initialize all possible experts (they'll be selected per expert set later)
      for (const [key, ExpertClass] of Object.entries(this.expertClasses)) {
        try {
          const expert = new ExpertClass(key); // Pass config key
          this.experts.set(key, expert);
          logger.moe.debug(`Initialized expert: ${expert.name}`);
        } catch (error) {
          logger.moe.warn(`Failed to initialize expert ${key}`, { error });
        }
      }

      this.initialized = true;
      logger.moe.info(`MoE analyzer initialized with ${this.experts.size} experts`);
    } catch (error) {
      logger.moe.error('Failed to initialize MoE analyzer', { error });
      throw error;
    }
  }

  getAvailableExpertSets(): Record<string, ExpertSetInfo> {
    const expertSets = getAllExpertSets();
    const result: Record<string, ExpertSetInfo> = {};

    for (const [key, config] of Object.entries(expertSets)) {
      result[key] = {
        name: config.name,
        description: config.description,
        targetAudience: config.targetAudience,
        complexity: config.complexity,
        expertCount: config.experts.length
      };
    }

    return result;
  }

  async analyzeSession(context: ExpertContext, expertSetKey?: string): Promise<MoEAnalysisOutput> {
    await this.initialize();

    // Use default expert set if none specified
    const selectedExpertSetKey = expertSetKey || getDefaultExpertSetKey();
    const expertSetConfig = getExpertSetExperts(selectedExpertSetKey);
    const consensusConfig = getExpertSetConsensus(selectedExpertSetKey);

    if (!expertSetConfig.length) {
      throw new Error(`No experts found for expert set: ${selectedExpertSetKey}`);
    }

    const startTime = Date.now();
    logger.moe.info('Starting MoE session analysis', {
      transcriptLength: context.transcript.length,
      language: context.language,
      expertSet: selectedExpertSetKey,
      expertsCount: expertSetConfig.length
    });

    try {
      // Run selected experts in parallel
      const expertPromises = expertSetConfig.map(
        async (expertConfig) => {
          const expert = this.experts.get(expertConfig.id);
          if (!expert) {
            logger.moe.error(`Expert not initialized: ${expertConfig.id}`);
            return null;
          }

          try {
            const analysis = await expert.analyze(context);
            return [expertConfig.id, analysis] as [string, ExpertAnalysis];
          } catch (error) {
            logger.moe.error(`Expert ${expertConfig.id} failed`, { error });
            return null;
          }
        }
      );

      const expertResults = (await Promise.all(expertPromises))
        .filter(result => result !== null) as [string, ExpertAnalysis][];

      const expertAnalyses = new Map(expertResults);

      // Build consensus with expert set specific configuration
      const consensusBuilder = new ConsensusBuilder(consensusConfig);
      const consensus = await consensusBuilder.buildConsensus(expertAnalyses);

      // Generate visualizations
      const sankeyData = await this.sankeyGenerator.generateSankeyData(
        consensus,
        expertAnalyses
      );

      const processingTime = Date.now() - startTime;

      const result: MoEAnalysisOutput = {
        analysis: {
          symptoms: this.aggregateSymptoms(expertAnalyses),
          diagnoses: consensus.diagnoses,
          treatments: consensus.treatments,
          medications: this.extractMedications(consensus.treatments),
          inquiries: consensus.inquiries,
          recommendations: this.generateRecommendations(consensus)
        },
        consensus: {
          agreementScore: consensus.agreementScore,
          conflictingOpinions: consensus.conflicts,
          highConfidenceFindings: consensus.diagnoses.filter(d => d.consensusConfidence > 0.8),
          uncertainAreas: consensus.uncertainties
        },
        visualizations: {
          sankey: sankeyData,
          decisionTree: null, // TODO: Implement
          evidenceMap: null,  // TODO: Implement
          timeline: null,     // TODO: Implement
          confidenceHeatmap: null // TODO: Implement
        },
        metadata: {
          processingTime,
          expertsConsulted: Array.from(expertAnalyses.keys()),
          expertSet: selectedExpertSetKey,
          modelVersions: this.getModelVersions(expertAnalyses),
          language: context.language
        }
      };

      logger.moe.info('MoE analysis completed', {
        processingTime,
        expertSet: selectedExpertSetKey,
        diagnosesCount: result.analysis.diagnoses.length,
        agreementScore: result.consensus.agreementScore
      });

      return result;
    } catch (error) {
      logger.moe.error('MoE analysis failed', { error });
      throw error;
    }
  }

  async *streamAnalysis(context: ExpertContext, expertSetKey?: string): AsyncGenerator<MoEUpdateEvent> {
    await this.initialize();

    // Use default expert set if none specified
    const selectedExpertSetKey = expertSetKey || getDefaultExpertSetKey();
    const expertSetConfig = getExpertSetExperts(selectedExpertSetKey);
    const consensusConfig = getExpertSetConsensus(selectedExpertSetKey);

    if (!expertSetConfig.length) {
      throw new Error(`No experts found for expert set: ${selectedExpertSetKey}`);
    }

    const startTime = Date.now();
    const expertAnalyses = new Map<string, ExpertAnalysis>();

    // Start selected experts in parallel and yield updates as they complete
    const expertPromises = expertSetConfig.map(
      async (expertConfig) => {
        const expert = this.experts.get(expertConfig.id);
        if (!expert) {
          logger.moe.error(`Expert not initialized: ${expertConfig.id}`);
          return null;
        }

        yield {
          type: 'expert_started',
          expertId: expertConfig.id,
          timestamp: Date.now()
        };

        try {
          const analysis = await expert.analyze(context);
          expertAnalyses.set(expertConfig.id, analysis);

          yield {
            type: 'expert_completed',
            expertId: expertConfig.id,
            data: analysis,
            timestamp: Date.now()
          };

          return analysis;
        } catch (error) {
          logger.moe.error(`Expert ${expertConfig.id} failed during streaming`, { error });
          return null;
        }
      }
    );

    // Wait for all experts to complete
    await Promise.all(expertPromises);

    // Build consensus
    yield {
      type: 'consensus_building',
      stage: 'building',
      progress: 0.1,
      timestamp: Date.now()
    };

    const consensusBuilder = new ConsensusBuilder(consensusConfig!);
    const consensus = await consensusBuilder.buildConsensus(expertAnalyses);

    yield {
      type: 'consensus_building',
      stage: 'complete',
      progress: 1.0,
      data: consensus,
      timestamp: Date.now()
    };

    // Generate visualizations
    const sankeyData = await this.sankeyGenerator.generateSankeyData(
      consensus,
      expertAnalyses
    );

    yield {
      type: 'visualization_ready',
      data: { sankey: sankeyData },
      timestamp: Date.now()
    };

    // Final complete event
    yield {
      type: 'complete',
      data: {
        analysis: {
          symptoms: this.aggregateSymptoms(expertAnalyses),
          diagnoses: consensus.diagnoses,
          treatments: consensus.treatments,
          medications: this.extractMedications(consensus.treatments),
          inquiries: consensus.inquiries,
          recommendations: this.generateRecommendations(consensus)
        },
        consensus,
        visualizations: { sankey: sankeyData },
        metadata: {
          processingTime: Date.now() - startTime,
          expertsConsulted: Array.from(expertAnalyses.keys()),
          expertSet: selectedExpertSetKey,
          modelVersions: this.getModelVersions(expertAnalyses),
          language: context.language
        }
      },
      timestamp: Date.now()
    };
  }

  private aggregateSymptoms(expertAnalyses: Map<string, ExpertAnalysis>): any[] {
    const symptomMap = new Map();

    for (const [_, analysis] of expertAnalyses) {
      analysis.findings.symptoms.forEach(symptom => {
        const existing = symptomMap.get(symptom.id) || symptom;
        symptomMap.set(symptom.id, {
          ...existing,
          confidence: Math.max(existing.confidence || 0, symptom.confidence || 0)
        });
      });
    }

    return Array.from(symptomMap.values());
  }

  private extractMedications(treatments: any[]): any[] {
    return treatments.filter(t => t.type === 'medication');
  }

  private generateRecommendations(consensus: any): any[] {
    // Generate doctor recommendations based on consensus
    const recommendations = [];

    if (consensus.conflicts.length > 0) {
      recommendations.push({
        id: 'review_conflicts',
        recommendation: 'Review conflicting expert opinions for clinical correlation',
        category: 'diagnostic_workup',
        priority: 'high',
        timeframe: 'immediate',
        rationale: 'Significant disagreement between experts requires clinical judgment'
      });
    }

    if (consensus.uncertainties.length > 0) {
      recommendations.push({
        id: 'address_uncertainties',
        recommendation: 'Obtain additional information to clarify uncertain diagnoses',
        category: 'diagnostic_workup',
        priority: 'medium',
        timeframe: 'within_24h',
        rationale: 'Low confidence areas need additional clinical data'
      });
    }

    return recommendations;
  }

  private getModelVersions(expertAnalyses: Map<string, ExpertAnalysis>): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const [key, _] of expertAnalyses) {
      const expert = this.experts.get(key);
      versions[key] = expert?.modelConfig?.name || 'unknown';
    }

    return versions;
  }
}

// Export singleton instance
let analyzerInstance: MoESessionAnalyzerImpl | null = null;

export async function getMoESessionAnalyzer(): Promise<MoESessionAnalyzer> {
  if (!analyzerInstance) {
    analyzerInstance = new MoESessionAnalyzerImpl();
    await analyzerInstance.initialize();
  }
  return analyzerInstance;
}

// Missing type definitions for interface compatibility
export interface ExpertContext {
  transcript: string;
  language: string;
  metadata?: any;
}

export interface ExpertAnalysis {
  findings: {
    symptoms: any[];
    diagnoses?: any[];
    treatments?: any[];
    inquiries?: any[];
  };
  confidence: number;
  reasoning: string;
}

export interface MoEAnalysisOutput {
  analysis: {
    symptoms: any[];
    diagnoses: any[];
    treatments: any[];
    medications: any[];
    inquiries: any[];
    recommendations: any[];
  };
  consensus: {
    agreementScore: number;
    conflictingOpinions: any[];
    highConfidenceFindings: any[];
    uncertainAreas: any[];
  };
  visualizations: {
    sankey: any;
    decisionTree: any;
    evidenceMap: any;
    timeline: any;
    confidenceHeatmap: any;
  };
  metadata: {
    processingTime: number;
    expertsConsulted: string[];
    expertSet: string;
    modelVersions: Record<string, string>;
    language: string;
  };
}

// Export types and interfaces
export type { ExpertContext as BaseExpertContext, ExpertAnalysis as BaseExpertAnalysis } from './experts/base';
export type { ConsensusAnalysis } from './consensus/builder';
export type { SankeyData, SankeyNode, SankeyLink } from './visualization/sankey-generator';
export type { MoEConfig } from './config/loader';