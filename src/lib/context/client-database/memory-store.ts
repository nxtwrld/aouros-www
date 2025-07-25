/**
 * In-memory embedding database for fast client-side search
 * 
 * Stores decrypted embeddings in optimized data structures
 * for efficient similarity search and retrieval.
 */

import type { DocumentEmbedding, EmbeddingMetadata, EmbeddingVector } from '../types';
import { logger } from '$lib/logging/logger';

export class ClientContextDatabase {
  // Core data structures
  private embeddings: Map<string, DocumentEmbedding>;
  private vectors: Map<string, Float32Array>;
  private metadata: Map<string, EmbeddingMetadata>;
  private summaries: Map<string, string>;
  
  // Indexes for fast lookup
  private typeIndex: Map<string, Set<string>>; // documentType -> documentIds
  private dateIndex: Map<string, Set<string>>; // YYYY-MM -> documentIds
  private tagIndex: Map<string, Set<string>>;  // tag -> documentIds
  
  // Memory management
  private maxMemoryMB: number;
  private currentMemoryMB: number;
  
  constructor(maxMemoryMB: number = 50) {
    this.embeddings = new Map();
    this.vectors = new Map();
    this.metadata = new Map();
    this.summaries = new Map();
    
    this.typeIndex = new Map();
    this.dateIndex = new Map();
    this.tagIndex = new Map();
    
    this.maxMemoryMB = maxMemoryMB;
    this.currentMemoryMB = 0;
    
    logger.context?.debug('ClientContextDatabase initialized', { maxMemoryMB });
  }
  
  /**
   * Add a document embedding to the database
   */
  addEmbedding(embedding: DocumentEmbedding): void {
    const { documentId } = embedding;
    
    // Store in primary collections
    this.embeddings.set(documentId, embedding);
    this.vectors.set(documentId, embedding.vector.vector);
    this.metadata.set(documentId, embedding.metadata);
    this.summaries.set(documentId, embedding.metadata.summary);
    
    // Update indexes
    this.updateIndexes(documentId, embedding.metadata);
    
    // Update memory usage
    this.updateMemoryUsage();
    
    logger.context?.debug('Added embedding', { 
      documentId, 
      dimensions: embedding.vector.dimensions 
    });
  }
  
  /**
   * Add multiple embeddings in batch
   */
  addBatch(embeddings: DocumentEmbedding[]): void {
    embeddings.forEach(embedding => this.addEmbedding(embedding));
    logger.context?.info('Added embedding batch', { count: embeddings.length });
  }
  
  /**
   * Get embedding by document ID
   */
  getEmbedding(documentId: string): DocumentEmbedding | undefined {
    return this.embeddings.get(documentId);
  }
  
  /**
   * Get vector by document ID
   */
  getVector(documentId: string): Float32Array | undefined {
    return this.vectors.get(documentId);
  }
  
  /**
   * Get all document IDs
   */
  getAllDocumentIds(): string[] {
    return Array.from(this.embeddings.keys());
  }
  
  /**
   * Get documents by type
   */
  getDocumentsByType(type: string): string[] {
    return Array.from(this.typeIndex.get(type) || []);
  }
  
  /**
   * Get documents by date range
   */
  getDocumentsByDateRange(startDate: string, endDate: string): string[] {
    const documents = new Set<string>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    this.metadata.forEach((meta, docId) => {
      const docDate = new Date(meta.date);
      if (docDate >= start && docDate <= end) {
        documents.add(docId);
      }
    });
    
    return Array.from(documents);
  }
  
  /**
   * Get documents by tag
   */
  getDocumentsByTag(tag: string): string[] {
    return Array.from(this.tagIndex.get(tag) || []);
  }
  
  /**
   * Remove embedding from database
   */
  removeEmbedding(documentId: string): void {
    const embedding = this.embeddings.get(documentId);
    if (!embedding) return;
    
    // Remove from primary collections
    this.embeddings.delete(documentId);
    this.vectors.delete(documentId);
    this.metadata.delete(documentId);
    this.summaries.delete(documentId);
    
    // Update indexes
    this.removeFromIndexes(documentId, embedding.metadata);
    
    // Update memory usage
    this.updateMemoryUsage();
    
    logger.context?.debug('Removed embedding', { documentId });
  }
  
  /**
   * Clear all data
   */
  clear(): void {
    this.embeddings.clear();
    this.vectors.clear();
    this.metadata.clear();
    this.summaries.clear();
    
    this.typeIndex.clear();
    this.dateIndex.clear();
    this.tagIndex.clear();
    
    this.currentMemoryMB = 0;
    
    logger.context?.info('Cleared context database');
  }
  
  /**
   * Get database statistics
   */
  getStats() {
    return {
      documentCount: this.embeddings.size,
      memoryUsageMB: this.currentMemoryMB,
      maxMemoryMB: this.maxMemoryMB,
      indexes: {
        types: this.typeIndex.size,
        dates: this.dateIndex.size,
        tags: this.tagIndex.size
      }
    };
  }
  
  /**
   * Check if database has capacity for more embeddings
   */
  hasCapacity(estimatedSizeMB: number = 0.1): boolean {
    return (this.currentMemoryMB + estimatedSizeMB) <= this.maxMemoryMB;
  }
  
  /**
   * Optimize memory by removing least recently used embeddings
   */
  optimizeMemory(targetMB?: number): number {
    const target = targetMB || this.maxMemoryMB * 0.8;
    let removed = 0;
    
    if (this.currentMemoryMB <= target) {
      return removed;
    }
    
    // Sort by date (oldest first)
    const sortedIds = Array.from(this.metadata.entries())
      .sort((a, b) => new Date(a[1].date).getTime() - new Date(b[1].date).getTime())
      .map(([id]) => id);
    
    // Remove oldest until under target
    for (const docId of sortedIds) {
      if (this.currentMemoryMB <= target) break;
      this.removeEmbedding(docId);
      removed++;
    }
    
    logger.context?.info('Optimized memory', { 
      removed, 
      currentMB: this.currentMemoryMB 
    });
    
    return removed;
  }
  
  // Private helper methods
  
  private updateIndexes(documentId: string, metadata: EmbeddingMetadata): void {
    // Type index
    if (!this.typeIndex.has(metadata.documentType)) {
      this.typeIndex.set(metadata.documentType, new Set());
    }
    this.typeIndex.get(metadata.documentType)!.add(documentId);
    
    // Date index (YYYY-MM)
    const dateKey = metadata.date.substring(0, 7);
    if (!this.dateIndex.has(dateKey)) {
      this.dateIndex.set(dateKey, new Set());
    }
    this.dateIndex.get(dateKey)!.add(documentId);
    
    // Tag index
    metadata.tags?.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(documentId);
    });
  }
  
  private removeFromIndexes(documentId: string, metadata: EmbeddingMetadata): void {
    // Type index
    this.typeIndex.get(metadata.documentType)?.delete(documentId);
    
    // Date index
    const dateKey = metadata.date.substring(0, 7);
    this.dateIndex.get(dateKey)?.delete(documentId);
    
    // Tag index
    metadata.tags?.forEach(tag => {
      this.tagIndex.get(tag)?.delete(documentId);
    });
  }
  
  private updateMemoryUsage(): void {
    // Rough estimation: 
    // - Each Float32Array element = 4 bytes
    // - Overhead for maps and metadata ~ 1KB per document
    let totalBytes = 0;
    
    this.vectors.forEach(vector => {
      totalBytes += vector.length * 4; // Float32 = 4 bytes
    });
    
    totalBytes += this.embeddings.size * 1024; // ~1KB overhead per document
    
    this.currentMemoryMB = totalBytes / (1024 * 1024);
  }
}