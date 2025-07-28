/**
 * Base Chat Context Service
 * 
 * Shared functionality for chat context integration that works
 * in both client-side and server-side environments.
 */

import { contextAssembler } from '../../context-assembly/context-composer';
import { profileContextManager } from '../profile-context';
import { mcpTools } from '../../mcp-tools/medical-expert-tools';
import type { AssembledContext } from '../../types';
import { logger } from '$lib/logging/logger';

export interface ChatContextOptions {
  profileId: string;
  maxTokens?: number;
  includeDocuments?: boolean;
  documentTypes?: string[];
  timeframe?: {
    start?: string;
    end?: string;
  };
  contextThreshold?: number;
}

export interface ChatContextResult {
  assembledContext?: AssembledContext;
  availableTools: string[];
  contextSummary: string;
  documentCount: number;
  confidence: number;
  tokenUsage: number;
}

export abstract class BaseChatContextService {
  
  /**
   * Abstract method for generating query embeddings
   * Must be implemented by client/server specific classes
   */
  protected abstract generateQueryEmbedding(query: string): Promise<Float32Array>;

  /**
   * Prepare context for chat conversation
   */
  async prepareContextForChat(
    userMessage: string,
    options: ChatContextOptions
  ): Promise<ChatContextResult> {
    try {
      const startTime = performance.now();
      
      // Check if context is available
      const contextData = profileContextManager.getProfileContext(options.profileId);
      if (!contextData) {
        logger.namespace('ChatContext').warn('No context available for chat', { profileId: options.profileId });
        return this.createEmptyContextResult();
      }
      
      // Generate embedding for user message
      let messageEmbedding: Float32Array;
      try {
        messageEmbedding = await this.generateQueryEmbedding(userMessage);
      } catch (error) {
        logger.namespace('ChatContext').error('Failed to generate query embedding', {
          error: error instanceof Error ? error.message : String(error)
        });
        // Return context result without embedding-based search
        return this.createEmptyContextResult();
      }
      
      // Search for relevant context
      const searchResults = await contextData.search.searchSimilar(
        messageEmbedding,
        {
          maxResults: 20,
          threshold: options.contextThreshold || 0.6,
          includeMetadata: true
        }
      );
      
      // Filter by document types if specified
      let filteredResults = searchResults;
      if (options.documentTypes && options.documentTypes.length > 0) {
        filteredResults = searchResults.filter(result => 
          options.documentTypes!.includes(result.metadata.documentType)
        );
      }
      
      // Filter by timeframe if specified
      if (options.timeframe) {
        filteredResults = this.filterResultsByTimeframe(filteredResults, options.timeframe);
      }
      
      let assembledContext: AssembledContext | undefined;
      let contextSummary = 'No relevant medical context found.';
      let tokenUsage = 0;
      
      if (filteredResults.length > 0) {
        // Assemble context
        assembledContext = await contextAssembler.assembleContextForAI(
          filteredResults,
          userMessage,
          {
            maxTokens: options.maxTokens || 3000,
            includeMetadata: true,
            includeMedicalContext: true,
            priorityTypes: options.documentTypes
          }
        );
        
        contextSummary = this.generateContextSummary(assembledContext);
        tokenUsage = assembledContext.tokenCount;
      }
      
      const processingTime = performance.now() - startTime;
      
      logger.namespace('ChatContext').info('Prepared chat context', {
        profileId: options.profileId,
        messageLength: userMessage.length,
        documentsFound: filteredResults.length,
        tokenUsage,
        processingTimeMs: processingTime.toFixed(2)
      });
      
      return {
        assembledContext,
        availableTools: this.getAvailableTools(),
        contextSummary,
        documentCount: filteredResults.length,
        confidence: assembledContext?.confidence || 0,
        tokenUsage
      };
      
    } catch (error) {
      logger.namespace('ChatContext').error('Failed to prepare chat context', {
        error: error instanceof Error ? error.message : String(error),
        profileId: options.profileId
      });
      return this.createEmptyContextResult();
    }
  }
  
  /**
   * Generate MCP tools for AI chat integration
   */
  getMCPToolsForChat(profileId: string) {
    return {
      searchDocuments: async (query: string, options: any = {}) => {
        // Combine query and options into params object as expected by MCP tools
        const params = {
          query,
          ...options
        };
        return await mcpTools.searchDocuments(profileId, params);
      },
      
      getAssembledContext: async (conversationContext: string, options: any = {}) => {
        // Combine conversationContext and options into params object
        const params = {
          conversationContext,
          ...options
        };
        return await mcpTools.getAssembledContext(profileId, params);
      },
      
      getProfileData: async () => {
        return await mcpTools.getProfileData(profileId, {});
      },
      
      queryMedicalHistory: async (queryType: string, timeframe?: any) => {
        // Combine queryType and timeframe into params object
        const params = {
          queryType,
          timeframe
        };
        return await mcpTools.queryMedicalHistory(profileId, params);
      },
      
      getDocumentById: async (documentId: string) => {
        return await mcpTools.getDocumentById({ documentId });
      }
    };
  }
  
  /**
   * Create context-enhanced system prompt for AI
   */
  createContextAwareSystemPrompt(
    basePrompt: string,
    contextResult: ChatContextResult,
    userRole: 'patient' | 'clinical' = 'patient'
  ): string {
    const contextSection = this.buildContextSection(contextResult);
    const toolsSection = this.buildToolsSection(contextResult.availableTools);
    
    let enhancedPrompt = basePrompt;
    
    // Add context section
    if (contextResult.assembledContext) {
      enhancedPrompt += `\n\n## Medical Context\n${contextSection}`;
    }
    
    // Add available tools
    enhancedPrompt += `\n\n## Available Tools\n${toolsSection}`;
    
    // Add role-specific instructions
    if (userRole === 'clinical') {
      enhancedPrompt += this.getClinicalInstructions();
    } else {
      enhancedPrompt += this.getPatientInstructions();
    }
    
    return enhancedPrompt;
  }
  
  /**
   * Update context during conversation
   */
  async updateContextDuringConversation(
    profileId: string,
    conversationHistory: string[],
    newMessage: string
  ): Promise<ChatContextResult> {
    const conversationContext = [...conversationHistory, newMessage].join('\n\n');
    
    return await this.prepareContextForChat(conversationContext, {
      profileId,
      maxTokens: 2000, // Smaller limit for ongoing conversation
      contextThreshold: 0.7, // Higher threshold for conversation updates
      includeDocuments: true
    });
  }
  
  /**
   * Generate context summary for display
   */
  private generateContextSummary(context: AssembledContext): string {
    const parts = [];
    
    if (context.keyPoints.length > 0) {
      const keyPointsByType = context.keyPoints.reduce((acc, point) => {
        acc[point.type] = (acc[point.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const pointsSummary = Object.entries(keyPointsByType)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
      
      parts.push(`Found ${pointsSummary} from medical history`);
    }
    
    if (context.relevantDocuments.length > 0) {
      parts.push(`${context.relevantDocuments.length} relevant documents identified`);
    }
    
    if (context.medicalContext?.recentChanges?.length) {
      parts.push(`${context.medicalContext.recentChanges.length} recent medical changes noted`);
    }
    
    return parts.join('. ') || 'Medical context assembled successfully';
  }
  
  /**
   * Build context section for system prompt
   */
  private buildContextSection(contextResult: ChatContextResult): string {
    if (!contextResult.assembledContext) {
      return 'No specific medical context available for this conversation.';
    }
    
    const context = contextResult.assembledContext;
    const sections = [];
    
    // Summary
    if (context.summary) {
      sections.push(`**Patient Summary:**\n${context.summary}`);
    }
    
    // Key points by type
    if (context.keyPoints.length > 0) {
      const pointsByType = context.keyPoints.reduce((acc, point) => {
        if (!acc[point.type]) acc[point.type] = [];
        acc[point.type].push(point);
        return acc;
      }, {} as Record<string, typeof context.keyPoints>);
      
      Object.entries(pointsByType).forEach(([type, points]) => {
        const pointsList = points
          .slice(0, 5) // Limit to top 5 per type
          .map(p => `- ${p.text} (${p.date || 'unknown date'})`)
          .join('\n');
        sections.push(`**${type.charAt(0).toUpperCase() + type.slice(1)}s:**\n${pointsList}`);
      });
    }
    
    // Recent changes
    if (context.medicalContext?.recentChanges?.length) {
      const recentList = context.medicalContext.recentChanges
        .slice(0, 3)
        .map(change => `- ${change.date}: ${change.description}`)
        .join('\n');
      sections.push(`**Recent Changes:**\n${recentList}`);
    }
    
    return sections.join('\n\n');
  }
  
  /**
   * Build tools section for system prompt
   */
  private buildToolsSection(availableTools: string[]): string {
    const toolDescriptions: Record<string, string> = {
      searchDocuments: 'Search patient documents by semantic similarity',
      getAssembledContext: 'Get assembled medical context for current conversation',
      getProfileData: 'Access patient profile and basic health information',
      queryMedicalHistory: 'Query specific medical history (medications, conditions, procedures, allergies)',
      getDocumentById: 'Retrieve specific document by ID'
    };
    
    const toolsList = availableTools
      .map(tool => `- **${tool}**: ${toolDescriptions[tool] || 'Medical data access tool'}`)
      .join('\n');
    
    return `You have access to the following tools to help answer questions:\n\n${toolsList}\n\nUse these tools when you need specific medical information about the patient.`;
  }
  
  /**
   * Filter search results by timeframe
   */
  private filterResultsByTimeframe(
    results: any[],
    timeframe: { start?: string; end?: string }
  ): any[] {
    return results.filter(result => {
      const docDate = new Date(result.metadata.date);
      const start = timeframe.start ? new Date(timeframe.start) : null;
      const end = timeframe.end ? new Date(timeframe.end) : null;
      
      return (!start || docDate >= start) && (!end || docDate <= end);
    });
  }
  
  /**
   * Get available MCP tools list
   */
  private getAvailableTools(): string[] {
    return [
      'searchDocuments',
      'getAssembledContext', 
      'getProfileData',
      'queryMedicalHistory',
      'getDocumentById'
    ];
  }
  
  /**
   * Create empty context result
   */
  private createEmptyContextResult(): ChatContextResult {
    return {
      availableTools: this.getAvailableTools(),
      contextSummary: 'No medical context available. Consider loading patient documents first.',
      documentCount: 0,
      confidence: 0,
      tokenUsage: 0
    };
  }
  
  /**
   * Get clinical role instructions
   */
  private getClinicalInstructions(): string {
    return `\n\n## Clinical Assistant Instructions

You are assisting a healthcare professional. Provide:
- Evidence-based medical information
- Detailed clinical analysis when requested
- Differential diagnosis considerations
- Treatment options with rationales
- Drug interaction and contraindication alerts
- Clinical decision support

Always cite relevant medical history and context when available.`;
  }
  
  /**
   * Get patient role instructions
   */
  private getPatientInstructions(): string {
    return `\n\n## Patient Assistant Instructions

You are assisting a patient with their health information. Provide:
- Clear, understandable explanations
- Support for understanding their medical history
- Guidance on health management
- Medication and treatment information
- General health education

Always reference their specific medical context when relevant and encourage them to discuss important matters with their healthcare provider.`;
  }
}