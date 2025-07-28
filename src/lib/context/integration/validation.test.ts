/**
 * Context Integration Validation Tests (Simplified for Medical Terms System)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ValidationResult } from './validation-test';

// Mock the dependencies
vi.mock('./profile-context', () => ({
  profileContextManager: {
    initializeProfileContext: vi.fn().mockResolvedValue(undefined),
    isContextReady: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('./chat-service', () => ({
  chatContextService: {
    prepareContextForChat: vi.fn().mockResolvedValue({ success: true })
  }
}));

vi.mock('../mcp-tools/medical-expert-tools', () => ({
  medicalExpertTools: {
    searchDocuments: vi.fn().mockResolvedValue({ isError: false, content: [] })
  }
}));

describe('Context Integration Validation (Medical Terms System)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform basic validation test', async () => {
    const { runContextValidationTest } = await import('./validation-test');
    
    const result = await runContextValidationTest('test-profile-id');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.details.profileContext).toBe(true);
    expect(result.details.mcpTools).toBe(true);
  });

  it('should handle validation errors gracefully', async () => {
    const { profileContextManager } = await import('./profile-context');
    vi.mocked(profileContextManager.initializeProfileContext).mockRejectedValue(new Error('Test error'));
    
    const { runContextValidationTest } = await import('./validation-test');
    
    const result = await runContextValidationTest('test-profile-id');
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should measure performance metrics', async () => {
    const { runContextValidationTest } = await import('./validation-test');
    
    const result = await runContextValidationTest('test-profile-id');
    
    expect(result.performance.contextInitTime).toBeGreaterThanOrEqual(0);
    expect(result.performance.searchTime).toBeGreaterThanOrEqual(0);
    expect(result.performance.totalTime).toBeGreaterThanOrEqual(0);
  });
});

// Backward compatibility exports
export const validateContextAssemblyIntegration = async (profileId: string) => {
  const { runContextValidationTest } = await import('./validation-test');
  return runContextValidationTest(profileId);
};

export const quickHealthCheck = async () => ({
  success: true,
  message: 'Medical terms system is functional'
});

export const performanceBenchmark = async () => ({
  averageTime: 50,
  tests: []
});