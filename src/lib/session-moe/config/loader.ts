// Configuration loader for MoE session analysis
import fs from 'fs/promises';
import path from 'path';
import { logger } from '$lib/logging/logger';

export interface MoEConfig {
  providers: Record<string, ProviderConfig>;
  experts: Record<string, ExpertConfig>;
  defaultExpertSet: string;
  visualization: VisualizationConfig;
  performance: PerformanceConfig;
  prompts: PromptsConfig;
  languages: LanguageConfig;
  errorHandling: ErrorHandlingConfig;
  monitoring: MonitoringConfig;
}

export interface ExpertSetConfig {
  name: string;
  description: string;
  targetAudience: string;
  complexity: 'basic' | 'advanced' | 'specialized';
  experts: string[];
  consensus: ConsensusConfig;
}

export interface ProviderConfig {
  enabled: boolean;
  apiKeyEnv: string;
  models: Record<string, ModelConfig>;
}

export interface ModelConfig {
  name: string;
  temperature: number;
  maxTokens: number;
}

export interface ExpertConfig {
  id: string;
  name: string;
  specialty: string;
  baseConfidence: number;
  reasoningStyle: 'differential' | 'probabilistic' | 'evidence-based' | 'pattern-matching';
  provider: string;
  modelType: string;
  schema: {
    configPath: string;  // Path to the schema configuration file
    variant?: string;     // Optional variant (like 'enhanced', 'simple', 'fast')
  };
  settings: Record<string, any>;
}

export interface ConsensusConfig {
  algorithm: string;
  expertWeights: Record<string, number>;
  settings: {
    minimumAgreement: number;
    conflictThreshold: number;
    requireMajorityForCritical: boolean;
    uncertaintyThreshold: number;
  };
}

export interface VisualizationConfig {
  sankey: {
    enabled: boolean;
    settings: {
      minLinkStrength: number;
      maxNodes: number;
      colorScheme: string;
      nodeCategories: Record<string, { color: string; shape: string }>;
    };
  };
  decisionTree: {
    enabled: boolean;
    maxDepth: number;
    branchingFactor: number;
  };
  evidenceMap: {
    enabled: boolean;
    clusterByStrength: boolean;
  };
  timeline: {
    enabled: boolean;
    resolution: string;
  };
}

export interface PerformanceConfig {
  parallelExecution: boolean;
  expertTimeout: number;
  cacheResults: boolean;
  cacheTTL: number;
  streamingEnabled: boolean;
  streamingInterval: number;
}

export interface PromptsConfig {
  templates: Record<string, {
    system: string;
    sections?: string[];
    methodology?: string[];
    approach?: string[];
    focus?: string[];
    strategy?: string[];
  }>;
}

export interface LanguageConfig {
  supported: string[];
  default: string;
  autoDetect: boolean;
}

export interface ErrorHandlingConfig {
  expertFailureStrategy: 'continue' | 'abort';
  minimumExperts: number;
  retryAttempts: number;
  fallbackToCache: boolean;
}

export interface MonitoringConfig {
  logLevel: string;
  metricsEnabled: boolean;
  trackExpertLatency: boolean;
  trackConsensusAgreement: boolean;
  alertOnLowAgreement: boolean;
  agreementThreshold: number;
}

class MoEConfigLoader {
  private static instance: MoEConfigLoader;
  private config: MoEConfig | null = null;
  private expertSets: Record<string, ExpertSetConfig> = {};
  private configPath: string;
  private expertSetsPath: string;

  private constructor() {
    // Look for config in multiple locations
    const possiblePaths = [
      path.join(process.cwd(), 'config', 'session-moe.json'),
      path.join(process.cwd(), 'session-moe.config.json'),
      '/app/config/session-moe.json' // Docker/production path
    ];
    
    this.configPath = possiblePaths[0]; // Default
    this.expertSetsPath = path.join(process.cwd(), 'config');
  }

  static getInstance(): MoEConfigLoader {
    if (!MoEConfigLoader.instance) {
      MoEConfigLoader.instance = new MoEConfigLoader();
    }
    return MoEConfigLoader.instance;
  }

  async loadConfig(customPath?: string): Promise<MoEConfig> {
    if (this.config && !customPath) {
      return this.config;
    }

    const configPath = customPath || this.configPath;
    
    try {
      // Load main configuration
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
      
      // Load expert sets from separate files
      await this.loadExpertSets();
      
      // Validate configuration
      this.validateConfig(this.config!);
      
      // Apply environment variable overrides
      this.applyEnvironmentOverrides(this.config!);
      
      logger.moe?.info('MoE configuration loaded successfully', {
        path: configPath,
        expertsCount: Object.keys(this.config!.experts).length,
        expertSetsCount: Object.keys(this.expertSets).length,
        providersEnabled: Object.entries(this.config!.providers)
          .filter(([_, p]) => p.enabled)
          .map(([name]) => name)
      });
      
      return this.config!;
    } catch (error) {
      logger.moe?.error('Failed to load MoE configuration', { error, path: configPath });
      
      // Return default configuration
      return this.getDefaultConfig();
    }
  }

  private async loadExpertSets(): Promise<void> {
    try {
      // Look for expert set files in the config directory
      const files = await fs.readdir(this.expertSetsPath);
      const expertSetFiles = files.filter(file => 
        file.startsWith('session-moe-') && 
        file.endsWith('.json') && 
        file !== 'session-moe.json'
      );

      for (const file of expertSetFiles) {
        const expertSetKey = file.replace('session-moe-', '').replace('.json', '');
        const filePath = path.join(this.expertSetsPath, file);
        
        try {
          const expertSetData = await fs.readFile(filePath, 'utf-8');
          const expertSetConfig: ExpertSetConfig = JSON.parse(expertSetData);
          this.expertSets[expertSetKey] = expertSetConfig;
          
          logger.moe?.debug(`Loaded expert set: ${expertSetKey}`, { filePath });
        } catch (error) {
          logger.moe?.warn(`Failed to load expert set file: ${file}`, { error });
        }
      }
      
      logger.moe?.info(`Loaded ${Object.keys(this.expertSets).length} expert sets`);
      
      // If no expert sets were loaded, create a default one
      if (Object.keys(this.expertSets).length === 0) {
        this.expertSets['gp_basic'] = {
          name: 'GP Basic Analysis',
          description: 'Essential medical analysis for general practice settings',
          targetAudience: 'general_practitioners',
          complexity: 'basic',
          experts: ['generalPractitioner'],
          consensus: {
            algorithm: 'weighted_voting',
            expertWeights: {
              generalPractitioner: 1.0
            },
            settings: {
              minimumAgreement: 0.6,
              conflictThreshold: 0.3,
              requireMajorityForCritical: true,
              uncertaintyThreshold: 0.5
            }
          }
        };
        logger.moe?.warn('No expert set files found, created default expert set');
      }
    } catch (error) {
      logger.moe?.warn('Failed to load expert sets directory', { error });
      
      // Create default expert set as fallback
      this.expertSets['gp_basic'] = {
        name: 'GP Basic Analysis',
        description: 'Essential medical analysis for general practice settings',
        targetAudience: 'general_practitioners',
        complexity: 'basic',
        experts: ['generalPractitioner'],
        consensus: {
          algorithm: 'weighted_voting',
          expertWeights: {
            generalPractitioner: 1.0
          },
          settings: {
            minimumAgreement: 0.6,
            conflictThreshold: 0.3,
            requireMajorityForCritical: true,
            uncertaintyThreshold: 0.5
          }
        }
      };
    }
  }

  private validateConfig(config: MoEConfig): void {
    // Validate required fields
    if (!config.experts || Object.keys(config.experts).length === 0) {
      throw new Error('No experts configured');
    }

    if (!config.providers || Object.keys(config.providers).length === 0) {
      throw new Error('No providers configured');
    }

    if (Object.keys(this.expertSets).length === 0) {
      throw new Error('No expert sets configured');
    }

    // Validate default expert set exists
    if (!this.expertSets[config.defaultExpertSet]) {
      throw new Error(`Default expert set '${config.defaultExpertSet}' not found`);
    }

    // Validate expert configurations
    Object.entries(config.experts).forEach(([key, expert]) => {
      if (!expert.id || !expert.provider || !expert.modelType) {
        throw new Error(`Invalid expert configuration for ${key}`);
      }

      // Ensure provider exists and is enabled
      const provider = config.providers[expert.provider];
      if (!provider || !provider.enabled) {
        throw new Error(`Expert ${key} references disabled or missing provider ${expert.provider}`);
      }

      // Ensure model type exists
      if (!provider.models[expert.modelType]) {
        throw new Error(`Expert ${key} references missing model type ${expert.modelType}`);
      }
    });

    // Validate expert sets
    Object.entries(this.expertSets).forEach(([setKey, expertSet]) => {
      if (!expertSet.experts || expertSet.experts.length === 0) {
        throw new Error(`Expert set '${setKey}' has no experts defined`);
      }

      // Validate all experts in set exist
      expertSet.experts.forEach(expertKey => {
        if (!config.experts[expertKey]) {
          throw new Error(`Expert set '${setKey}' references non-existent expert '${expertKey}'`);
        }
      });

      // Validate consensus weights match experts in set
      Object.keys(expertSet.consensus.expertWeights).forEach(expertKey => {
        if (!expertSet.experts.includes(expertKey)) {
          throw new Error(`Expert set '${setKey}' has consensus weight for expert '${expertKey}' not in set`);
        }
      });
    });
  }

  private applyEnvironmentOverrides(config: MoEConfig): void {
    // Override provider enablement from environment
    Object.keys(config.providers).forEach(provider => {
      const envKey = `MOE_ENABLE_${provider.toUpperCase()}`;
      if (process.env[envKey] !== undefined) {
        config.providers[provider].enabled = process.env[envKey] === 'true';
      }
    });

    // Override performance settings
    if (process.env.MOE_PARALLEL_EXECUTION !== undefined) {
      config.performance.parallelExecution = process.env.MOE_PARALLEL_EXECUTION === 'true';
    }

    if (process.env.MOE_EXPERT_TIMEOUT !== undefined) {
      config.performance.expertTimeout = parseInt(process.env.MOE_EXPERT_TIMEOUT, 10);
    }

    // Override monitoring settings
    if (process.env.MOE_LOG_LEVEL !== undefined) {
      config.monitoring.logLevel = process.env.MOE_LOG_LEVEL;
    }
  }

  private getDefaultConfig(): MoEConfig {
    // Minimal default configuration for fallback
    return {
      providers: {
        openai: {
          enabled: true,
          apiKeyEnv: 'OPENAI_API_KEY',
          models: {
            analytical: {
              name: 'gpt-4o-2024-08-06',
              temperature: 0.3,
              maxTokens: 4096
            }
          }
        }
      },
      experts: {
        generalPractitioner: {
          id: 'gp_expert',
          name: 'Dr. GP AI',
          specialty: 'General Practice',
          baseConfidence: 0.85,
          reasoningStyle: 'pattern-matching',
          provider: 'openai',
          modelType: 'analytical',
          prompt: {
            template: 'gp_analysis',
            focus: ['General assessment']
          },
          settings: {}
        }
      },
      defaultExpertSet: 'gp_basic',
      visualization: {
        sankey: {
          enabled: true,
          settings: {
            minLinkStrength: 0.3,
            maxNodes: 50,
            colorScheme: 'clinical',
            nodeCategories: {}
          }
        },
        decisionTree: { enabled: false, maxDepth: 5, branchingFactor: 3 },
        evidenceMap: { enabled: false, clusterByStrength: true },
        timeline: { enabled: false, resolution: 'daily' }
      },
      performance: {
        parallelExecution: true,
        expertTimeout: 30000,
        cacheResults: false,
        cacheTTL: 3600,
        streamingEnabled: true,
        streamingInterval: 500
      },
      prompts: {
        templates: {}
      },
      languages: {
        supported: ['en'],
        default: 'en',
        autoDetect: false
      },
      errorHandling: {
        expertFailureStrategy: 'continue',
        minimumExperts: 1,
        retryAttempts: 2,
        fallbackToCache: false
      },
      monitoring: {
        logLevel: 'info',
        metricsEnabled: true,
        trackExpertLatency: true,
        trackConsensusAgreement: true,
        alertOnLowAgreement: false,
        agreementThreshold: 0.5
      }
    };
  }

  getConfig(): MoEConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  // Helper methods for common access patterns
  getExpertConfig(expertKey: string): ExpertConfig | undefined {
    return this.config?.experts[expertKey];
  }

  getExpertSetConfig(expertSetKey: string): ExpertSetConfig | undefined {
    return this.expertSets[expertSetKey];
  }

  getDefaultExpertSetKey(): string {
    return this.config?.defaultExpertSet || 'gp_basic';
  }

  getExpertSetExperts(expertSetKey: string): ExpertConfig[] {
    const expertSet = this.getExpertSetConfig(expertSetKey);
    if (!expertSet) return [];
    
    return expertSet.experts
      .map(expertKey => this.getExpertConfig(expertKey))
      .filter((expert): expert is ExpertConfig => expert !== undefined);
  }

  getExpertSetConsensus(expertSetKey: string): ConsensusConfig | undefined {
    const expertSet = this.getExpertSetConfig(expertSetKey);
    return expertSet?.consensus;
  }

  getAllExpertSets(): Record<string, ExpertSetConfig> {
    return this.expertSets;
  }

  getProviderModel(provider: string, modelType: string): ModelConfig | undefined {
    return this.config?.providers[provider]?.models[modelType];
  }

  getPromptTemplate(templateKey: string): any {
    return this.config?.prompts.templates[templateKey];
  }

  /**
   * Load expert schema from configuration
   */
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

  isVisualizationEnabled(type: keyof VisualizationConfig): boolean {
    const vizConfig = this.config?.visualization[type];
    return vizConfig ? vizConfig.enabled : false;
  }
}

// Export singleton instance
export const moeConfig = MoEConfigLoader.getInstance();

// Export convenience functions
export async function loadMoEConfig(customPath?: string): Promise<MoEConfig> {
  return moeConfig.loadConfig(customPath);
}

export function getMoEConfig(): MoEConfig {
  return moeConfig.getConfig();
}

export function getExpertConfig(expertKey: string): ExpertConfig | undefined {
  return moeConfig.getExpertConfig(expertKey);
}

export function getExpertSetConfig(expertSetKey: string): ExpertSetConfig | undefined {
  return moeConfig.getExpertSetConfig(expertSetKey);
}

export function getDefaultExpertSetKey(): string {
  return moeConfig.getDefaultExpertSetKey();
}

export function getExpertSetExperts(expertSetKey: string): ExpertConfig[] {
  return moeConfig.getExpertSetExperts(expertSetKey);
}

export function getExpertSetConsensus(expertSetKey: string): ConsensusConfig | undefined {
  return moeConfig.getExpertSetConsensus(expertSetKey);
}

export function getAllExpertSets(): Record<string, ExpertSetConfig> {
  return moeConfig.getAllExpertSets();
}

export function getProviderModel(provider: string, modelType: string): ModelConfig | undefined {
  return moeConfig.getProviderModel(provider, modelType);
}