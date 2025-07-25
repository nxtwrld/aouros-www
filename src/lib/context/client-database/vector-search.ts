/**
 * Client-side Vector Search
 * 
 * Performs similarity search on embeddings entirely in the browser
 * with support for time decay, metadata filtering, and relevance ranking.
 */

import { ClientContextDatabase } from './memory-store';
import type { 
  ContextMatch, 
  SearchOptions, 
  TimeDecayConfig,
  SearchFilters 
} from '../types';
import { logger } from '$lib/logging/logger';

export class VectorSearch {
  constructor(private database: ClientContextDatabase) {}
  
  /**
   * Search for similar documents using cosine similarity
   */
  async searchSimilar(
    queryVector: Float32Array,
    options: SearchOptions = {}
  ): Promise<ContextMatch[]> {
    const startTime = performance.now();
    
    // Get candidate documents based on filters
    const candidateIds = this.getFilteredCandidates(options.filters);
    
    // Calculate similarities
    const similarities: ContextMatch[] = [];
    
    for (const docId of candidateIds) {
      const docVector = this.database.getVector(docId);
      const metadata = this.database.getEmbedding(docId)?.metadata;
      
      if (!docVector || !metadata) continue;
      
      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryVector, docVector);
      
      // Apply threshold filter
      if (options.threshold && similarity < options.threshold) continue;
      
      // Calculate relevance score with time decay
      const relevanceScore = this.calculateRelevanceScore(
        similarity,
        metadata.date,
        options.timeDecay
      );
      
      similarities.push({
        documentId: docId,
        similarity,
        metadata,
        relevanceScore,
        excerpt: metadata.summary.substring(0, 200) + '...'
      });
    }
    
    // Sort by relevance score
    similarities.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Apply result limit
    const results = similarities.slice(0, options.maxResults || 10);
    
    const searchTime = performance.now() - startTime;
    logger.context?.debug('Vector search completed', {
      candidates: candidateIds.length,
      results: results.length,
      timeMs: searchTime.toFixed(2)
    });
    
    return results;
  }
  
  /**
   * Hybrid search combining vector similarity with keyword matching
   */
  async hybridSearch(
    query: string,
    queryVector: Float32Array,
    options: SearchOptions = {}
  ): Promise<ContextMatch[]> {
    // Get vector similarity results
    const vectorResults = await this.searchSimilar(queryVector, {
      ...options,
      maxResults: (options.maxResults || 10) * 2 // Get more for re-ranking
    });
    
    // Score based on keyword matches in summaries
    const keywords = this.extractKeywords(query);
    const hybridResults = vectorResults.map(result => {
      const keywordScore = this.calculateKeywordScore(
        result.metadata.summary,
        keywords
      );
      
      // Combine vector and keyword scores
      const hybridScore = result.relevanceScore * 0.7 + keywordScore * 0.3;
      
      return {
        ...result,
        relevanceScore: hybridScore
      };
    });
    
    // Re-sort by hybrid score
    hybridResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return hybridResults.slice(0, options.maxResults || 10);
  }
  
  /**
   * Find documents most similar to a given document
   */
  async findSimilarDocuments(
    documentId: string,
    options: SearchOptions = {}
  ): Promise<ContextMatch[]> {
    const sourceVector = this.database.getVector(documentId);
    if (!sourceVector) {
      throw new Error(`Document ${documentId} not found in database`);
    }
    
    // Search but exclude the source document
    const results = await this.searchSimilar(sourceVector, options);
    return results.filter(r => r.documentId !== documentId);
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  }
  
  /**
   * Calculate relevance score with optional time decay
   */
  private calculateRelevanceScore(
    similarity: number,
    documentDate: string,
    timeDecay?: TimeDecayConfig
  ): number {
    if (!timeDecay?.enabled) {
      return similarity;
    }
    
    const docDate = new Date(documentDate);
    const now = new Date();
    const daysSince = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay function
    const decayFactor = Math.exp(-daysSince / timeDecay.halfLifeDays);
    const weightedDecay = Math.max(decayFactor, timeDecay.minWeight || 0.1);
    
    return similarity * weightedDecay;
  }
  
  /**
   * Get filtered candidate documents based on search filters
   */
  private getFilteredCandidates(filters?: SearchFilters): string[] {
    if (!filters) {
      return this.database.getAllDocumentIds();
    }
    
    let candidates = new Set(this.database.getAllDocumentIds());
    
    // Filter by document type
    if (filters.documentTypes && filters.documentTypes.length > 0) {
      const typeFiltered = new Set<string>();
      filters.documentTypes.forEach(type => {
        this.database.getDocumentsByType(type).forEach(id => typeFiltered.add(id));
      });
      candidates = this.intersection(candidates, typeFiltered);
    }
    
    // Filter by date range
    if (filters.dateRange) {
      const dateFiltered = new Set(
        this.database.getDocumentsByDateRange(
          filters.dateRange.start,
          filters.dateRange.end
        )
      );
      candidates = this.intersection(candidates, dateFiltered);
    }
    
    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const tagFiltered = new Set<string>();
      filters.tags.forEach(tag => {
        this.database.getDocumentsByTag(tag).forEach(id => tagFiltered.add(id));
      });
      candidates = this.intersection(candidates, tagFiltered);
    }
    
    return Array.from(candidates);
  }
  
  /**
   * Extract keywords from query for hybrid search
   */
  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'
    ]);
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
  
  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(text: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    
    const lowerText = text.toLowerCase();
    let matches = 0;
    
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        matches++;
      }
    });
    
    return matches / keywords.length;
  }
  
  /**
   * Set intersection helper
   */
  private intersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const result = new Set<T>();
    set1.forEach(item => {
      if (set2.has(item)) {
        result.add(item);
      }
    });
    return result;
  }
}