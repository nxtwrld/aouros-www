/**
 * OpenAI Embedding Provider
 * 
 * Implements embedding generation using OpenAI's text-embedding models
 */

import { EmbeddingProvider } from './abstraction';
import type { EmbeddingGenerationOptions } from '../../types';
import { logger } from '$lib/logging/logger';
import { env } from '$env/dynamic/private';

export class OpenAIEmbeddingProvider extends EmbeddingProvider {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: any) {
    super({
      provider: 'openai',
      model: config.model || 'text-embedding-3-small',
      dimensions: config.dimensions || 1536,
      maxTokens: config.maxTokens || 8191,
      costPer1kTokens: config.costPer1kTokens || 0.00002
    });
    
    this.apiKey = config.apiKey || env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  async generateEmbedding(
    text: string, 
    options?: EmbeddingGenerationOptions
  ): Promise<Float32Array> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: options?.model || this.config.model,
          encoding_format: 'float'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const embedding = new Float32Array(data.data[0].embedding);
      
      // Validate and normalize
      this.validateDimensions(embedding);
      const normalized = this.normalizeVector(embedding);
      
      logger.context?.debug('Generated OpenAI embedding', {
        model: this.config.model,
        inputLength: text.length,
        usage: data.usage
      });
      
      return normalized;
    } catch (error) {
      logger.context?.error('OpenAI embedding generation failed', { error });
      throw error;
    }
  }
  
  async generateBatchEmbeddings(
    texts: string[], 
    options?: EmbeddingGenerationOptions
  ): Promise<Float32Array[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (texts.length === 0) {
      return [];
    }
    
    // OpenAI supports batch embedding in a single request
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: texts,
          model: options?.model || this.config.model,
          encoding_format: 'float'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract and process embeddings
      const embeddings = data.data
        .sort((a: any, b: any) => a.index - b.index)
        .map((item: any) => {
          const embedding = new Float32Array(item.embedding);
          this.validateDimensions(embedding);
          return this.normalizeVector(embedding);
        });
      
      logger.context?.info('Generated OpenAI batch embeddings', {
        model: this.config.model,
        count: texts.length,
        usage: data.usage
      });
      
      return embeddings;
    } catch (error) {
      logger.context?.error('OpenAI batch embedding generation failed', { error });
      throw error;
    }
  }
}

/**
 * Factory function to create OpenAI embedding providers
 */
export function createOpenAIProviders() {
  return [
    {
      name: 'openai',
      provider: new OpenAIEmbeddingProvider({
        model: 'text-embedding-3-small',
        dimensions: 1536,
        costPer1kTokens: 0.00002
      })
    },
    {
      name: 'openai-fallback',
      provider: new OpenAIEmbeddingProvider({
        model: 'text-embedding-ada-002',
        dimensions: 1536,
        costPer1kTokens: 0.0001
      })
    },
    {
      name: 'openai-large',
      provider: new OpenAIEmbeddingProvider({
        model: 'text-embedding-3-large',
        dimensions: 3072,
        costPer1kTokens: 0.00013
      })
    }
  ];
}