/**
 * Server-Only OpenAI Embedding Provider
 * 
 * This provider can ONLY be used on the server side as it accesses API keys.
 * Do not import this into any client-side code.
 */

import { env } from '$env/dynamic/private';
import { logger } from '$lib/logging/logger';

export interface OpenAIEmbeddingResponse {
  success: boolean;
  embedding?: Float32Array;
  error?: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class ServerOnlyOpenAIProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private dimensions: number;
  private embeddingLogger = logger.namespace('OpenAIEmbedding');

  constructor(config: {
    model?: string;
    dimensions?: number;
    baseUrl?: string;
  } = {}) {
    this.apiKey = env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;
  }

  /**
   * Check if the provider is available (has API key)
   */
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<OpenAIEmbeddingResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Text cannot be empty'
      };
    }

    try {
      this.embeddingLogger.debug('Generating OpenAI embedding', {
        model: this.model,
        textLength: text.length
      });

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: this.model,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        this.embeddingLogger.error('OpenAI API error', {
          status: response.status,
          error: errorMessage
        });

        return {
          success: false,
          error: `OpenAI API error: ${errorMessage}`
        };
      }

      const data = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        return {
          success: false,
          error: 'Invalid response format from OpenAI API'
        };
      }

      const embeddingArray = data.data[0].embedding;
      const embedding = new Float32Array(embeddingArray);
      
      // Normalize the embedding vector
      const normalizedEmbedding = this.normalizeVector(embedding);

      this.embeddingLogger.debug('Successfully generated OpenAI embedding', {
        model: this.model,
        dimensions: normalizedEmbedding.length,
        usage: data.usage
      });

      return {
        success: true,
        embedding: normalizedEmbedding,
        usage: data.usage
      };

    } catch (error) {
      this.embeddingLogger.error('Failed to generate OpenAI embedding', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate embeddings for multiple texts in a single API call
   */
  async generateBatchEmbeddings(texts: string[]): Promise<{
    success: boolean;
    embeddings?: Float32Array[];
    error?: string;
    usage?: any;
  }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    if (!texts || texts.length === 0) {
      return {
        success: false,
        error: 'Texts array cannot be empty'
      };
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      return {
        success: false,
        error: 'No valid texts provided'
      };
    }

    try {
      this.embeddingLogger.debug('Generating OpenAI batch embeddings', {
        model: this.model,
        count: validTexts.length
      });

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: validTexts,
          model: this.model,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        this.embeddingLogger.error('OpenAI batch API error', {
          status: response.status,
          error: errorMessage
        });

        return {
          success: false,
          error: `OpenAI API error: ${errorMessage}`
        };
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        return {
          success: false,
          error: 'Invalid response format from OpenAI API'
        };
      }

      // Sort by index to maintain order and convert to Float32Arrays
      const embeddings = data.data
        .sort((a: any, b: any) => a.index - b.index)
        .map((item: any) => {
          const embedding = new Float32Array(item.embedding);
          return this.normalizeVector(embedding);
        });

      this.embeddingLogger.debug('Successfully generated OpenAI batch embeddings', {
        model: this.model,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        usage: data.usage
      });

      return {
        success: true,
        embeddings,
        usage: data.usage
      };

    } catch (error) {
      this.embeddingLogger.error('Failed to generate OpenAI batch embeddings', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: Float32Array): Float32Array {
    let magnitude = 0;
    
    // Calculate magnitude
    for (let i = 0; i < vector.length; i++) {
      magnitude += vector[i] * vector[i];
    }
    
    magnitude = Math.sqrt(magnitude);
    
    // Avoid division by zero
    if (magnitude === 0) {
      return vector;
    }
    
    // Normalize
    const normalized = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / magnitude;
    }
    
    return normalized;
  }

  /**
   * Get provider information
   */
  getInfo() {
    return {
      provider: 'openai',
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: 8191,
      costPer1kTokens: this.model === 'text-embedding-3-small' ? 0.00002 : 0.0001
    };
  }
}