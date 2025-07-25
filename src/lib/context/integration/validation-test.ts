/**
 * Context Assembly Integration Validation Test
 * 
 * Tests the complete flow from document save → embedding generation → context assembly → chat integration
 */

import { contextInitializer } from '../client-database/initialization';
import { embeddingManager } from '../embeddings/manager';
import { profileContextManager } from './profile-context';
import { chatContextService } from './chat-service';
import { sessionContextService } from './session-context';
import { medicalExpertTools } from '../mcp-tools/medical-expert-tools';
import type { Document } from '$lib/documents/types.d';
import { logger } from '$lib/logging/logger';

export interface ValidationResult {
  success: boolean;
  details: {
    initialization: boolean;
    embeddingGeneration: boolean;
    contextAssembly: boolean;
    chatIntegration: boolean;
    sessionIntegration: boolean;
    mcpTools: boolean;
  };
  errors: string[];
  performance: {
    initializationTime: number;
    embeddingTime: number;
    assemblyTime: number;
    totalTime: number;
  };
}

/**
 * Comprehensive validation of context assembly integration
 */
export async function validateContextAssemblyIntegration(
  profileId: string,
  testDocument?: Partial<Document>
): Promise<ValidationResult> {
  const startTime = Date.now();
  const result: ValidationResult = {
    success: false,
    details: {
      initialization: false,
      embeddingGeneration: false,
      contextAssembly: false,
      chatIntegration: false,
      sessionIntegration: false,
      mcpTools: false
    },
    errors: [],
    performance: {
      initializationTime: 0,
      embeddingTime: 0,
      assemblyTime: 0,
      totalTime: 0
    }
  };

  const testLogger = logger.namespace('ContextValidation');
  testLogger.info('Starting context assembly integration validation', { profileId });

  try {
    // Test 1: Context Initialization
    testLogger.info('Testing context initialization...');
    const initStart = Date.now();
    
    try {
      await contextInitializer.initialize(profileId, {
        onProgress: (status, progress) => {
          testLogger.debug('Initialization progress', { status, progress });
        }
      });
      result.performance.initializationTime = Date.now() - initStart;
      result.details.initialization = true;
      testLogger.info('✅ Context initialization successful');
    } catch (error) {
      result.errors.push(`Context initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      testLogger.error('❌ Context initialization failed', { error });
    }

    // Test 2: Embedding Generation (if test document provided)
    if (testDocument) {
      testLogger.info('Testing embedding generation...');
      const embeddingStart = Date.now();
      
      try {
        const mockDocument: Document = {
          id: 'test-doc-' + Date.now(),
          user_id: profileId,
          type: 'document',
          content: {
            title: 'Test Medical Report',
            text: testDocument.content?.text || 'Patient presents with chest pain and shortness of breath. Blood pressure elevated at 140/90. Recommend ECG and chest X-ray.',
            date: new Date().toISOString(),
            tags: ['cardiology', 'chest-pain']
          },
          metadata: {
            title: 'Test Medical Report',
            date: new Date().toISOString(),
            tags: ['test']
          },
          owner_id: profileId,
          author_id: profileId,
          key: 'test-key',
          attachments: []
        };

        await profileContextManager.addDocumentToContext(profileId, mockDocument, {
          generateEmbedding: true
        });
        
        result.performance.embeddingTime = Date.now() - embeddingStart;
        result.details.embeddingGeneration = true;
        testLogger.info('✅ Embedding generation successful');
      } catch (error) {
        result.errors.push(`Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`);
        testLogger.error('❌ Embedding generation failed', { error });
      }
    } else {
      result.details.embeddingGeneration = true; // Skip if no test document
      testLogger.info('⏭️ Skipping embedding generation test (no test document)');
    }

    // Test 3: Context Assembly
    testLogger.info('Testing context assembly...');
    const assemblyStart = Date.now();
    
    try {
      const contextResult = await chatContextService.prepareContextForChat(
        'Tell me about recent medical findings',
        {
          profileId,
          maxTokens: 2000,
          includeDocuments: true,
          contextThreshold: 0.3
        }
      );
      
      if (contextResult.assembledContext && contextResult.availableTools) {
        result.details.contextAssembly = true;
        testLogger.info('✅ Context assembly successful', {
          documentsFound: contextResult.assembledContext.documents?.length || 0,
          toolsAvailable: contextResult.availableTools.length
        });
      } else {
        result.errors.push('Context assembly returned incomplete results');
      }
      
      result.performance.assemblyTime = Date.now() - assemblyStart;
    } catch (error) {
      result.errors.push(`Context assembly failed: ${error instanceof Error ? error.message : String(error)}`);
      testLogger.error('❌ Context assembly failed', { error });
    }

    // Test 4: Chat Integration
    testLogger.info('Testing chat integration...');
    try {
      const chatResult = await chatContextService.prepareContextForChat(
        'What are the latest test results?',
        {
          profileId,
          maxTokens: 1500,
          includeDocuments: true,
          contextThreshold: 0.5
        }
      );
      
      if (chatResult && chatResult.availableTools && chatResult.availableTools.length > 0) {
        result.details.chatIntegration = true;
        testLogger.info('✅ Chat integration successful');
      } else {
        result.errors.push('Chat integration failed to provide tools');
      }
    } catch (error) {
      result.errors.push(`Chat integration failed: ${error instanceof Error ? error.message : String(error)}`);
      testLogger.error('❌ Chat integration failed', { error });
    }

    // Test 5: Session Integration
    testLogger.info('Testing session integration...');
    try {
      const sessionResult = await sessionContextService.initializeSessionContext(
        'test-session-' + Date.now(),
        {
          profileId,
          sessionType: 'consultation',
          metadata: { testMode: true }
        },
        {
          includeRecentDocuments: true,
          maxContextTokens: 1000
        }
      );
      
      if (sessionResult && sessionResult.contextSummary) {
        result.details.sessionIntegration = true;
        testLogger.info('✅ Session integration successful');
      } else {
        result.errors.push('Session integration failed to provide context');
      }
    } catch (error) {
      result.errors.push(`Session integration failed: ${error instanceof Error ? error.message : String(error)}`);
      testLogger.error('❌ Session integration failed', { error });
    }

    // Test 6: MCP Tools
    testLogger.info('Testing MCP tools...');
    try {
      const tools = await medicalExpertTools.generateMCPTools(profileId);
      
      if (tools && tools.length > 0) {
        // Test a simple tool execution
        const searchTool = tools.find(tool => tool.name === 'searchDocuments');
        if (searchTool) {
          const searchResult = await medicalExpertTools.searchDocuments({
            profileId,
            query: 'medical',
            limit: 5
          });
          
          if (searchResult && !searchResult.isError) {
            result.details.mcpTools = true;
            testLogger.info('✅ MCP tools successful', {
              toolsCount: tools.length,
              searchResults: searchResult.content.length
            });
          } else {
            result.errors.push('MCP tool execution failed');
          }
        } else {
          result.errors.push('Required MCP tools not found');
        }
      } else {
        result.errors.push('No MCP tools generated');
      }
    } catch (error) {
      result.errors.push(`MCP tools failed: ${error instanceof Error ? error.message : String(error)}`);
      testLogger.error('❌ MCP tools failed', { error });
    }

    // Calculate overall success
    const allTests = Object.values(result.details);
    const successfulTests = allTests.filter(test => test).length;
    result.success = successfulTests === allTests.length;
    
    result.performance.totalTime = Date.now() - startTime;
    
    testLogger.info('Context assembly validation completed', {
      success: result.success,
      successfulTests: `${successfulTests}/${allTests.length}`,
      totalTime: result.performance.totalTime,
      errors: result.errors.length
    });

  } catch (error) {
    result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    result.performance.totalTime = Date.now() - startTime;
    testLogger.error('❌ Context assembly validation failed', { error });
  }

  return result;
}

/**
 * Quick health check of context assembly system
 */
export async function quickHealthCheck(profileId: string): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    // Check if context is initialized
    const isInitialized = await contextInitializer.isInitialized(profileId);
    if (!isInitialized) {
      issues.push('Context not initialized');
    }
    
    // Check if embedding manager is available
    const embeddingStatus = await embeddingManager.getStatus();
    if (!embeddingStatus.available) {
      issues.push('Embedding manager not available');
    }
    
    // Check if chat context service can prepare basic context
    try {
      await chatContextService.prepareContextForChat('test', {
        profileId,
        maxTokens: 100,
        includeDocuments: false
      });
    } catch {
      issues.push('Chat context service not responding');
    }
    
  } catch (error) {
    issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}

/**
 * Performance benchmark of context assembly operations
 */
export async function performanceBenchmark(profileId: string): Promise<{
  results: {
    contextAssembly: number;
    embeddingSearch: number;
    toolGeneration: number;
  };
  recommendations: string[];
}> {
  const results = {
    contextAssembly: 0,
    embeddingSearch: 0,
    toolGeneration: 0
  };
  
  const recommendations: string[] = [];
  
  // Benchmark context assembly
  const contextStart = Date.now();
  try {
    await chatContextService.prepareContextForChat('benchmark test', {
      profileId,
      maxTokens: 2000,
      includeDocuments: true
    });
    results.contextAssembly = Date.now() - contextStart;
  } catch {
    results.contextAssembly = -1;
  }
  
  // Benchmark embedding search
  const embeddingStart = Date.now();
  try {
    await embeddingManager.searchSimilar(profileId, 'test query', { limit: 10 });
    results.embeddingSearch = Date.now() - embeddingStart;
  } catch {
    results.embeddingSearch = -1;
  }
  
  // Benchmark tool generation
  const toolStart = Date.now();
  try {
    await medicalExpertTools.generateMCPTools(profileId);
    results.toolGeneration = Date.now() - toolStart;
  } catch {
    results.toolGeneration = -1;
  }
  
  // Generate recommendations
  if (results.contextAssembly > 2000) {
    recommendations.push('Context assembly is slow (>2s), consider optimizing document retrieval');
  }
  if (results.embeddingSearch > 500) {
    recommendations.push('Embedding search is slow (>500ms), consider indexing optimization');
  }
  if (results.toolGeneration > 1000) {
    recommendations.push('Tool generation is slow (>1s), consider caching MCP tools');
  }
  
  return { results, recommendations };
}