import { enhancedAIProvider } from '$lib/ai/providers/enhanced-abstraction';
import type { ChatMessage, ChatContext, ChatResponse, ChatMode } from './types.d';
import type { Content } from '$lib/ai/types.d';
import AnatomyIntegration from './anatomy-integration';
import { generateId } from '$lib/utils/id';

export class ChatAIService {
  private tokenUsage = { total: 0 };

  /**
   * Process user message and generate AI response
   */
  async processMessage(
    userMessage: string,
    context: ChatContext,
    conversationHistory: ChatMessage[]
  ): Promise<ChatResponse> {
    try {
      // Detect body part references
      const bodyPartReferences = AnatomyIntegration.detectBodyParts(userMessage);
      
      // Create content for AI processing
      const content = this.buildContent(userMessage, context, conversationHistory);
      
      // Create schema based on mode
      const schema = this.createResponseSchema(context.mode);
      
      // Choose flow type based on mode
      const flowType = context.mode === 'patient' ? 'medical_analysis' : 'medical_analysis';
      
      // Get AI response using enhanced provider
      const aiResponse = await enhancedAIProvider.analyzeDocument(
        content,
        schema,
        this.tokenUsage,
        {
          language: this.getLanguageName(context.language),
          temperature: 0.7,
          flowType,
        }
      );

      // Generate anatomy suggestions if body parts detected
      const anatomySuggestion = AnatomyIntegration.suggestAnatomyView(bodyPartReferences);
      
      return {
        message: aiResponse.response || aiResponse.message || 'I apologize, but I encountered an issue processing your message.',
        anatomyReferences: bodyPartReferences.map(ref => ref.bodyPartId),
        suggestions: anatomySuggestion ? [anatomySuggestion] : [],
        documentReferences: aiResponse.documentReferences || [],
        toolCalls: aiResponse.toolCalls || [],
        consentRequests: aiResponse.consentRequests || [],
      };
    } catch (error) {
      console.error('Chat AI Service Error:', error);
      return {
        message: 'I apologize, but I encountered an error processing your message. Please try again.',
        anatomyReferences: [],
        suggestions: [],
      };
    }
  }

  /**
   * Build content array for AI processing
   */
  private buildContent(
    userMessage: string,
    context: ChatContext,
    conversationHistory: ChatMessage[]
  ): Content[] {
    const content: Content[] = [];

    // Add system context
    content.push({
      type: 'text',
      text: this.buildSystemPrompt(context),
    });

    // Add conversation history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      content.push({
        type: 'text',
        text: `${msg.role}: ${msg.content}`,
      });
    });

    // Add current user message
    content.push({
      type: 'text',
      text: `user: ${userMessage}`,
    });

    return content;
  }

  /**
   * Build system prompt based on mode
   */
  private buildSystemPrompt(context: ChatContext): string {
    const basePrompt = `You are an AI medical assistant integrated with a 3D anatomy model. You can suggest anatomy visualizations when discussing body parts.`;
    
    if (context.mode === 'patient') {
      return `${basePrompt}

PATIENT SUPPORT MODE:
- Use empathetic, supportive language
- Focus on education and understanding
- Provide emotional support and coping strategies
- Never provide medical advice or diagnosis
- Always recommend consulting healthcare providers
- Use language appropriate for: ${context.language}
- Patient name: ${context.pageContext.profileName}

When discussing body parts, suggest using the 3D anatomy model for better understanding.
Available anatomy systems: skeletal, muscular, vascular, nervous, respiratory, digestive, urogenital.

IMPORTANT BOUNDARIES:
- No medical advice or diagnosis
- No treatment recommendations
- Always defer to healthcare providers
- Focus on understanding and support`;
    } else {
      return `${basePrompt}

CLINICAL CONSULTATION MODE:
- Use professional, analytical language
- Provide clinical insights and perspectives
- Suggest diagnostic considerations
- Analyze patterns and correlations
- Reference medical literature when appropriate
- Use language appropriate for: ${context.language}
- Patient profile: ${context.pageContext.profileName}

When discussing anatomical structures, suggest using the 3D model for visualization.
Available anatomy systems: skeletal, muscular, vascular, nervous, respiratory, digestive, urogenital.

CLINICAL FOCUS:
- Pattern analysis across patient history
- Differential diagnostic considerations
- Evidence-based insights
- Professional medical terminology`;
    }
  }

  /**
   * Create response schema based on mode
   */
  private createResponseSchema(mode: ChatMode) {
    const baseSchema = {
      name: 'chat_response',
      description: 'AI medical chat response',
      parameters: {
        type: 'object',
        properties: {
          response: {
            type: 'string',
            description: 'Main response to user message',
          },
          anatomyReferences: {
            type: 'array',
            items: { type: 'string' },
            description: 'Body parts mentioned that could be visualized',
          },
          documentReferences: {
            type: 'array',
            items: { type: 'string' },
            description: 'Document IDs referenced in response',
          },
          consentRequests: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['document_access', 'anatomy_integration'] },
                message: { type: 'string' },
                reason: { type: 'string' },
              },
            },
            description: 'Consent requests for accessing documents or using anatomy model',
          },
        },
        required: ['response'],
      },
    };

    if (mode === 'patient') {
      baseSchema.parameters.properties.supportType = {
        type: 'string',
        enum: ['educational', 'emotional', 'preparatory'],
        description: 'Type of support provided',
      };
      baseSchema.parameters.properties.copingStrategies = {
        type: 'array',
        items: { type: 'string' },
        description: 'Coping strategies suggested',
      };
    } else {
      baseSchema.parameters.properties.clinicalInsights = {
        type: 'array',
        items: { type: 'string' },
        description: 'Clinical insights provided',
      };
      baseSchema.parameters.properties.differentialConsiderations = {
        type: 'array',
        items: { type: 'string' },
        description: 'Differential diagnostic considerations',
      };
    }

    return baseSchema;
  }

  /**
   * Get language name for AI prompt
   */
  private getLanguageName(languageCode: string): string {
    const languages = {
      'en': 'English',
      'cs': 'Czech',
      'de': 'German',
    };
    return languages[languageCode] || 'English';
  }

  /**
   * Format response for display
   */
  formatResponse(response: ChatResponse): string {
    let formatted = response.message;

    // Add anatomy suggestions
    if (response.suggestions && response.suggestions.length > 0) {
      formatted += '\n\n' + response.suggestions.map(s => `🔍 ${s.suggestion}`).join('\n');
    }

    // Add consent requests
    if (response.consentRequests && response.consentRequests.length > 0) {
      formatted += '\n\n' + response.consentRequests.map(cr => `📋 ${cr.message}`).join('\n');
    }

    return formatted;
  }
}

export default ChatAIService;