/**
 * Embedding Provider Abstraction
 * 
 * Defines the interface for embedding providers and manages
 * provider selection, fallbacks, and error handling.
 */

import type { EmbeddingProviderConfig, EmbeddingGenerationOptions } from '../../types';
import { logger } from '$lib/logging/logger';

export abstract class EmbeddingProvider {
  protected config: EmbeddingProviderConfig;
  
  constructor(config: EmbeddingProviderConfig) {
    this.config = config;
  }
  
  /**
   * Generate embedding for text
   */
  abstract generateEmbedding(
    text: string, 
    options?: EmbeddingGenerationOptions
  ): Promise<Float32Array>;
  
  /**
   * Generate embeddings for multiple texts (batch)
   */
  abstract generateBatchEmbeddings(
    texts: string[], 
    options?: EmbeddingGenerationOptions
  ): Promise<Float32Array[]>;
  
  /**
   * Check if provider is available
   */
  abstract isAvailable(): Promise<boolean>;
  
  /**
   * Get provider info
   */
  getInfo() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      dimensions: this.config.dimensions,
      costPer1kTokens: this.config.costPer1kTokens
    };
  }
  
  /**
   * Normalize vector to unit length
   */
  protected normalizeVector(vector: Float32Array): Float32Array {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    
    if (magnitude === 0) return vector;
    
    return vector.map(val => val / magnitude);
  }
  
  /**
   * Validate embedding dimensions
   */
  protected validateDimensions(vector: Float32Array): void {
    if (vector.length !== this.config.dimensions) {
      throw new Error(
        `Invalid embedding dimensions: expected ${this.config.dimensions}, got ${vector.length}`
      );
    }
  }
}

/**
 * Embedding Provider Manager
 * 
 * Handles provider selection, fallbacks, and caching
 */
export class EmbeddingProviderManager {
  private providers: Map<string, EmbeddingProvider>;
  private primaryProvider: string;
  private fallbackProviders: string[];
  
  constructor() {
    this.providers = new Map();
    this.primaryProvider = 'openai';
    this.fallbackProviders = ['openai-fallback'];
  }
  
  /**
   * Register a provider
   */
  registerProvider(name: string, provider: EmbeddingProvider): void {
    this.providers.set(name, provider);
    logger.context?.info('Registered embedding provider', { name, ...provider.getInfo() });
  }
  
  /**
   * Set primary provider
   */
  setPrimaryProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.primaryProvider = name;
  }
  
  /**
   * Set fallback providers
   */
  setFallbackProviders(names: string[]): void {
    this.fallbackProviders = names.filter(name => this.providers.has(name));
  }
  
  /**
   * Generate embedding with automatic fallback
   */
  async generateEmbedding(
    text: string, 
    options?: EmbeddingGenerationOptions
  ): Promise<{ embedding: Float32Array; provider: string }> {
    const providerName = options?.provider || this.primaryProvider;
    const providers = [providerName, ...this.fallbackProviders];
    
    for (const name of providers) {
      const provider = this.providers.get(name);
      if (!provider) continue;
      
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;
        
        const embedding = await provider.generateEmbedding(text, options);
        
        logger.context?.debug('Generated embedding', { 
          provider: name, 
          textLength: text.length,
          dimensions: embedding.length 
        });
        
        return { embedding, provider: name };
      } catch (error) {
        logger.context?.error('Embedding generation failed', { 
          provider: name, 
          error: error.message 
        });
        continue;
      }
    }
    
    throw new Error('All embedding providers failed');
  }
  
  /**
   * Generate batch embeddings
   */
  async generateBatchEmbeddings(
    texts: string[], 
    options?: EmbeddingGenerationOptions
  ): Promise<{ embeddings: Float32Array[]; provider: string }> {
    const providerName = options?.provider || this.primaryProvider;
    const providers = [providerName, ...this.fallbackProviders];
    
    for (const name of providers) {
      const provider = this.providers.get(name);
      if (!provider) continue;
      
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;
        
        const embeddings = await provider.generateBatchEmbeddings(texts, options);
        
        logger.context?.info('Generated batch embeddings', { 
          provider: name, 
          count: texts.length 
        });
        
        return { embeddings, provider: name };
      } catch (error) {
        logger.context?.error('Batch embedding generation failed', { 
          provider: name, 
          error: error.message 
        });
        continue;
      }
    }
    
    throw new Error('All embedding providers failed for batch');
  }
  
  /**
   * Get provider by name
   */
  getProvider(name: string): EmbeddingProvider | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Get all registered providers
   */
  getAllProviders(): { name: string; info: any }[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      info: provider.getInfo()
    }));
  }
}

// Export singleton instance
export const embeddingProviderManager = new EmbeddingProviderManager();