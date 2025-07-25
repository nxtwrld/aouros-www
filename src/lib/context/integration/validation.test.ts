/**
 * Context Assembly Integration Tests
 * 
 * Unit tests for the context assembly validation system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateContextAssemblyIntegration, quickHealthCheck, performanceBenchmark } from './validation-test';
import { runFullValidation, runLightweightValidation } from './run-validation';

// Mock dependencies
vi.mock('../client-database/initialization', () => ({
  contextInitializer: {
    initialize: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../embeddings/manager', () => ({
  embeddingManager: {
    getStatus: vi.fn().mockResolvedValue({ available: true }),
    searchSimilar: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('./profile-context', () => ({
  profileContextManager: {
    addDocumentToContext: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('./chat-service', () => ({
  chatContextService: {
    prepareContextForChat: vi.fn().mockResolvedValue({
      assembledContext: { documents: [] },
      availableTools: ['searchDocuments', 'getAssembledContext']
    })
  }
}));

vi.mock('./session-context', () => ({
  sessionContextService: {
    initializeSessionContext: vi.fn().mockResolvedValue({
      contextSummary: 'Test context summary'
    })
  }
}));

vi.mock('../mcp-tools/medical-expert-tools', () => ({
  medicalExpertTools: {
    generateMCPTools: vi.fn().mockResolvedValue([
      { name: 'searchDocuments', description: 'Search documents' }
    ]),
    searchDocuments: vi.fn().mockResolvedValue({
      isError: false,
      content: [{ type: 'text', text: 'Mock search result' }]
    })
  }
}));

vi.mock('$lib/logging/logger', () => ({
  logger: {
    namespace: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
  }
}));

describe('Context Assembly Integration Validation', () => {
  const testProfileId = 'test-profile-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateContextAssemblyIntegration', () => {
    it('should successfully validate all components when working correctly', async () => {
      const result = await validateContextAssemblyIntegration(testProfileId);
      
      expect(result.success).toBe(true);
      expect(result.details.initialization).toBe(true);
      expect(result.details.contextAssembly).toBe(true);
      expect(result.details.chatIntegration).toBe(true);
      expect(result.details.sessionIntegration).toBe(true);
      expect(result.details.mcpTools).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.performance.totalTime).toBeGreaterThan(0);
    });

    it('should validate embedding generation when test document provided', async () => {
      const testDocument = {
        content: {
          text: 'Test medical document content',
          title: 'Test Document',
          date: new Date().toISOString(),
          tags: ['test']
        }
      };
      
      const result = await validateContextAssemblyIntegration(testProfileId, testDocument);
      
      expect(result.details.embeddingGeneration).toBe(true);
    });

    it('should handle initialization failure gracefully', async () => {
      const { contextInitializer } = await import('../client-database/initialization');
      vi.mocked(contextInitializer.initialize).mockRejectedValueOnce(new Error('Init failed'));
      
      const result = await validateContextAssemblyIntegration(testProfileId);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Validation failed: Init failed');
    });

    it('should handle context assembly failure', async () => {
      const { chatContextService } = await import('./chat-service');
      vi.mocked(chatContextService.prepareContextForChat).mockRejectedValueOnce(new Error('Assembly failed'));
      
      const result = await validateContextAssemblyIntegration(testProfileId);
      
      expect(result.details.contextAssembly).toBe(false);
      expect(result.errors.some(error => error.includes('Context assembly failed'))).toBe(true);
    });
  });

  describe('quickHealthCheck', () => {
    it('should return healthy status when all components work', async () => {
      const result = await quickHealthCheck(testProfileId);
      
      expect(result.healthy).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect when context is not initialized', async () => {
      const { contextInitializer } = await import('../client-database/initialization');
      vi.mocked(contextInitializer.isInitialized).mockResolvedValueOnce(false);
      
      const result = await quickHealthCheck(testProfileId);
      
      expect(result.healthy).toBe(false);
      expect(result.issues).toContain('Context not initialized');
    });

    it('should detect when embedding manager is not available', async () => {
      const { embeddingManager } = await import('../embeddings/manager');
      vi.mocked(embeddingManager.getStatus).mockResolvedValueOnce({ available: false });
      
      const result = await quickHealthCheck(testProfileId);
      
      expect(result.healthy).toBe(false);
      expect(result.issues).toContain('Embedding manager not available');
    });
  });

  describe('performanceBenchmark', () => {
    it('should measure performance of key operations', async () => {
      const result = await performanceBenchmark(testProfileId);
      
      expect(result.results.contextAssembly).toBeGreaterThanOrEqual(0);
      expect(result.results.embeddingSearch).toBeGreaterThanOrEqual(0);
      expect(result.results.toolGeneration).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide recommendations for slow operations', async () => {
      // Mock slow operations
      const { chatContextService } = await import('./chat-service');
      vi.mocked(chatContextService.prepareContextForChat).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          assembledContext: { documents: [] },
          availableTools: []
        }), 2100)) // Simulate >2s delay
      );
      
      const result = await performanceBenchmark(testProfileId);
      
      expect(result.recommendations.some(rec => 
        rec.includes('Context assembly is slow')
      )).toBe(true);
    });
  });

  describe('runFullValidation', () => {
    it('should execute all validation steps successfully', async () => {
      const result = await runFullValidation(testProfileId);
      
      expect(result.success).toBe(true);
      expect(result.healthCheck).toBeDefined();
      expect(result.benchmark).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide recommendations when issues are found', async () => {
      const { contextInitializer } = await import('../client-database/initialization');
      vi.mocked(contextInitializer.isInitialized).mockResolvedValueOnce(false);
      
      const result = await runFullValidation(testProfileId);
      
      expect(result.success).toBe(false);
      expect(result.recommendations.some(rec => 
        rec.includes('Context not initialized')
      )).toBe(true);
    });
  });

  describe('runLightweightValidation', () => {
    it('should run minimal validation for CI/CD', async () => {
      const result = await runLightweightValidation(testProfileId);
      
      expect(result.success).toBe(true);
      expect(result.details.healthy).toBe(true);
      expect(result.details.initialized).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.performance).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const { contextInitializer } = await import('../client-database/initialization');
      vi.mocked(contextInitializer.initialize).mockRejectedValueOnce(new Error('Test error'));
      
      const result = await runLightweightValidation(testProfileId);
      
      expect(result.success).toBe(false);
      expect(result.issues.some(issue => issue.includes('Test error'))).toBe(true);
    });
  });
});

describe('Integration Test Scenarios', () => {
  const testProfileId = 'integration-test-profile';

  it('should handle complete integration workflow', async () => {
    // Simulate a complete workflow from document save to chat
    const testDocument = {
      content: {
        text: 'Patient has diabetes mellitus type 2, well controlled with metformin. Last HbA1c was 6.8%. Blood pressure normal.',
        title: 'Diabetes Follow-up',
        date: new Date().toISOString(),
        tags: ['diabetes', 'endocrinology']
      }
    };

    // This should trigger the entire flow:
    // 1. Context initialization
    // 2. Document embedding generation
    // 3. Context assembly
    // 4. Chat preparation
    // 5. MCP tool generation
    const result = await validateContextAssemblyIntegration(testProfileId, testDocument);
    
    expect(result.success).toBe(true);
    expect(result.details.initialization).toBe(true);
    expect(result.details.embeddingGeneration).toBe(true);
    expect(result.details.contextAssembly).toBe(true);
    expect(result.details.chatIntegration).toBe(true);
    expect(result.details.mcpTools).toBe(true);
  });

  it('should maintain performance within acceptable bounds', async () => {
    const result = await performanceBenchmark(testProfileId);
    
    // Define acceptable performance thresholds
    expect(result.results.contextAssembly).toBeLessThan(5000); // <5s
    expect(result.results.embeddingSearch).toBeLessThan(1000);  // <1s
    expect(result.results.toolGeneration).toBeLessThan(2000);  // <2s
  });
});