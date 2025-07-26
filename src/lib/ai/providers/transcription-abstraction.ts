// Transcription Provider Abstraction - Unified interface for audio transcription
// Extends the existing AI provider abstractions to support audio transcription

import OpenAI from "openai";
import fs from 'fs/promises';
import path from 'path';
import { OPENAI_API_KEY, AZURE_SPEECH_KEY, GOOGLE_API_KEY } from "$env/static/private";

export interface TranscriptionConfig {
  providers: Record<string, ProviderConfig>;
  defaultProvider: string;
  defaultModel: string;
  transcriptionSettings: TranscriptionSettings;
  performance: PerformanceConfig;
  fallback: FallbackConfig;
  quality: QualityConfig;
  monitoring: MonitoringConfig;
}

export interface ProviderConfig {
  enabled: boolean;
  apiKeyEnv: string;
  models: Record<string, ModelConfig>;
}

export interface ModelConfig {
  name: string;
  description: string;
  supportedFormats: string[];
  maxFileSize: string;
  languages: string[];
  responseFormats: string[];
  temperature?: number;
  timestampGranularities?: string[];
}

export interface TranscriptionSettings {
  defaultLanguage: string;
  responseFormat: string;
  includeTimestamps: boolean;
  medicalContext: {
    enabled: boolean;
    prompt: string;
    medicalTermsBoost: boolean;
    speakerIdentification: boolean;
  };
}

export interface PerformanceConfig {
  maxRetries: number;
  timeoutMs: number;
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeoutMs: number;
  };
}

export interface FallbackConfig {
  enableFallback: boolean;
  fallbackProviders: string[];
  fallbackOnError: boolean;
  fallbackOnTimeout: boolean;
}

export interface QualityConfig {
  confidenceThreshold: number;
  enableQualityFiltering: boolean;
  profanityFilter: boolean;
  medicalTermsValidation: boolean;
}

export interface MonitoringConfig {
  logTranscriptions: boolean;
  trackTokenUsage: boolean;
  performanceMetrics: boolean;
  errorTracking: boolean;
}

export interface TranscriptionOptions {
  language?: string;
  responseFormat?: string;
  includeTimestamps?: boolean;
  temperature?: number;
  prompt?: string;
  provider?: string;
  model?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  segments?: TranscriptionSegment[];
  language?: string;
  duration?: number;
  provider: string;
  modelUsed: string;
  processingTime: number;
  tokenUsage?: number;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
  words?: TranscriptionWord[];
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export class TranscriptionProviderAbstraction {
  private static instance: TranscriptionProviderAbstraction;
  private config: TranscriptionConfig | null = null;
  private providers: Map<string, any> = new Map();
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'audio-transcription.json');
  }

  static getInstance(): TranscriptionProviderAbstraction {
    if (!this.instance) {
      this.instance = new TranscriptionProviderAbstraction();
    }
    return this.instance;
  }

  /**
   * Load configuration and initialize providers
   */
  async initialize(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      
      await this.initializeProviders();
      
      console.log('✅ Transcription providers initialized', {
        providersCount: this.providers.size,
        defaultProvider: this.config.defaultProvider
      });
    } catch (error) {
      console.error('❌ Failed to initialize transcription providers:', error);
      
      // Fallback to default configuration
      this.config = this.getDefaultConfig();
      await this.initializeProviders();
    }
  }

  /**
   * Initialize all available transcription providers
   */
  private async initializeProviders(): Promise<void> {
    if (!this.config) return;

    // Initialize OpenAI Whisper
    if (this.config.providers.openai?.enabled && OPENAI_API_KEY) {
      const openaiClient = new OpenAI({
        apiKey: OPENAI_API_KEY,
      });
      
      this.providers.set('openai', {
        client: openaiClient,
        config: this.config.providers.openai
      });
      
      console.log('🤖 OpenAI Whisper provider initialized');
    }

    // Initialize Azure Speech Services (placeholder)
    if (this.config.providers.azure?.enabled && AZURE_SPEECH_KEY) {
      // TODO: Initialize Azure Speech Services
      console.log('🤖 Azure Speech Services provider initialized (placeholder)');
    }

    // Initialize Google Cloud Speech-to-Text (placeholder)
    if (this.config.providers.google?.enabled && GOOGLE_API_KEY) {
      // TODO: Initialize Google Cloud Speech-to-Text
      console.log('🤖 Google Speech-to-Text provider initialized (placeholder)');
    }
  }

  /**
   * Main transcription method
   */
  async transcribeAudio(
    audioData: File,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.config) {
      await this.initialize();
    }

    const startTime = Date.now();
    const provider = options.provider || this.config!.defaultProvider;
    const model = options.model || this.config!.defaultModel;

    try {
      const result = await this.executeTranscription(provider, model, audioData, options);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Transcription completed with ${provider} in ${processingTime}ms`);

      return {
        ...result,
        provider,
        modelUsed: model,
        processingTime
      };
    } catch (error) {
      console.error(`❌ Transcription failed with ${provider}:`, error);
      
      // Try fallback providers if enabled
      if (this.config!.fallback.enableFallback && this.config!.fallback.fallbackOnError) {
        return this.attemptFallbackTranscription(audioData, options, provider);
      }
      
      throw error;
    }
  }

  /**
   * Execute transcription with specific provider
   */
  private async executeTranscription(
    provider: string,
    model: string,
    audioData: File,
    options: TranscriptionOptions
  ): Promise<Omit<TranscriptionResult, 'provider' | 'modelUsed' | 'processingTime'>> {
    switch (provider) {
      case 'openai':
        return this.executeOpenAITranscription(model, audioData, options);
      
      case 'azure':
        return this.executeAzureTranscription(model, audioData, options);
      
      case 'google':
        return this.executeGoogleTranscription(model, audioData, options);
      
      default:
        throw new Error(`Unsupported transcription provider: ${provider}`);
    }
  }

  /**
   * Execute transcription with OpenAI Whisper
   */
  private async executeOpenAITranscription(
    model: string,
    audioData: File,
    options: TranscriptionOptions
  ): Promise<Omit<TranscriptionResult, 'provider' | 'modelUsed' | 'processingTime'>> {
    const openaiProvider = this.providers.get('openai');
    if (!openaiProvider) {
      throw new Error('OpenAI provider not initialized');
    }

    const modelConfig = openaiProvider.config.models[model];
    if (!modelConfig) {
      throw new Error(`Model ${model} not found in OpenAI provider config`);
    }

    // Prepare transcription parameters
    const language = options.language || this.config!.transcriptionSettings.defaultLanguage;
    const responseFormat = options.responseFormat || this.config!.transcriptionSettings.responseFormat;
    const temperature = options.temperature ?? modelConfig.temperature ?? 0;
    
    // Use medical context prompt if enabled and no custom prompt provided
    let prompt = options.prompt;
    if (!prompt && this.config!.transcriptionSettings.medicalContext.enabled) {
      prompt = this.config!.transcriptionSettings.medicalContext.prompt;
    }

    const transcriptionParams: any = {
      file: audioData,
      model: modelConfig.name,
      language: language,
      response_format: responseFormat,
      temperature: temperature
    };

    if (prompt) {
      transcriptionParams.prompt = prompt;
    }

    // Add timestamp granularities if supported and requested
    if (options.includeTimestamps && modelConfig.timestampGranularities) {
      transcriptionParams.timestamp_granularities = ["segment"];
      if (responseFormat === "verbose_json") {
        transcriptionParams.response_format = "verbose_json";
      }
    }

    const transcription = await openaiProvider.client.audio.transcriptions.create(transcriptionParams);

    // Handle different response formats
    if (typeof transcription === 'string') {
      return {
        text: transcription,
        confidence: 0.8 // OpenAI Whisper doesn't provide confidence scores
      };
    } else if (transcription.text) {
      // Verbose JSON response with segments
      return {
        text: transcription.text,
        confidence: 0.8,
        segments: transcription.segments?.map((segment: any, index: number) => ({
          id: index,
          start: segment.start,
          end: segment.end,
          text: segment.text,
          confidence: 0.8,
          words: segment.words?.map((word: any) => ({
            word: word.word,
            start: word.start,
            end: word.end,
            confidence: 0.8
          }))
        })),
        language: transcription.language,
        duration: transcription.duration
      };
    }

    throw new Error('Unexpected transcription response format');
  }

  /**
   * Execute transcription with Azure Speech Services (placeholder)
   */
  private async executeAzureTranscription(
    model: string,
    audioData: File,
    options: TranscriptionOptions
  ): Promise<Omit<TranscriptionResult, 'provider' | 'modelUsed' | 'processingTime'>> {
    // TODO: Implement Azure Speech Services transcription
    throw new Error('Azure Speech Services not yet implemented');
  }

  /**
   * Execute transcription with Google Cloud Speech-to-Text (placeholder)
   */
  private async executeGoogleTranscription(
    model: string,
    audioData: File,
    options: TranscriptionOptions
  ): Promise<Omit<TranscriptionResult, 'provider' | 'modelUsed' | 'processingTime'>> {
    // TODO: Implement Google Cloud Speech-to-Text transcription
    throw new Error('Google Cloud Speech-to-Text not yet implemented');
  }

  /**
   * Attempt fallback transcription with alternative providers
   */
  private async attemptFallbackTranscription(
    audioData: File,
    options: TranscriptionOptions,
    failedProvider: string
  ): Promise<TranscriptionResult> {
    const fallbackProviders = this.config!.fallback.fallbackProviders.filter(
      provider => provider !== failedProvider && this.providers.has(provider)
    );

    for (const fallbackProvider of fallbackProviders) {
      try {
        console.log(`🔄 Attempting fallback transcription with ${fallbackProvider}`);
        
        const result = await this.transcribeAudio(audioData, {
          ...options,
          provider: fallbackProvider
        });
        
        console.log(`✅ Fallback transcription successful with ${fallbackProvider}`);
        return result;
      } catch (error) {
        console.error(`❌ Fallback transcription failed with ${fallbackProvider}:`, error);
        continue;
      }
    }

    throw new Error('All transcription providers failed');
  }

  /**
   * Get default configuration for fallback
   */
  private getDefaultConfig(): TranscriptionConfig {
    return {
      providers: {
        openai: {
          enabled: true,
          apiKeyEnv: "OPENAI_API_KEY",
          models: {
            whisper: {
              name: "whisper-1",
              description: "OpenAI Whisper ASR model",
              supportedFormats: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
              maxFileSize: "25MB",
              languages: ["en", "cs", "de"],
              responseFormats: ["json", "text", "verbose_json"],
              temperature: 0
            }
          }
        }
      },
      defaultProvider: "openai",
      defaultModel: "whisper",
      transcriptionSettings: {
        defaultLanguage: "en",
        responseFormat: "text",
        includeTimestamps: false,
        medicalContext: {
          enabled: true,
          prompt: "The transcript is a part of a doctor patient session conversation. The doctor is asking the patient about their symptoms and the patient is responding. A nurse or multiple doctors may be part of the conversation.",
          medicalTermsBoost: true,
          speakerIdentification: false
        }
      },
      performance: {
        maxRetries: 3,
        timeoutMs: 30000,
        batchProcessing: {
          enabled: false,
          maxBatchSize: 10,
          batchTimeoutMs: 60000
        }
      },
      fallback: {
        enableFallback: true,
        fallbackProviders: ["openai"],
        fallbackOnError: true,
        fallbackOnTimeout: true
      },
      quality: {
        confidenceThreshold: 0.7,
        enableQualityFiltering: false,
        profanityFilter: false,
        medicalTermsValidation: true
      },
      monitoring: {
        logTranscriptions: false,
        trackTokenUsage: true,
        performanceMetrics: true,
        errorTracking: true
      }
    };
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: string): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get current configuration
   */
  getConfig(): TranscriptionConfig | null {
    return this.config;
  }

  /**
   * Backwards compatible method for existing whisper.ts usage
   */
  async transcribeAudioCompatible(
    audioData: File,
    instructions: { lang: string } = { lang: "en" }
  ): Promise<{ text: string }> {
    const result = await this.transcribeAudio(audioData, {
      language: instructions.lang
    });
    
    return {
      text: result.text
    };
  }
}

// Export singleton instance
export const transcriptionProvider = TranscriptionProviderAbstraction.getInstance();