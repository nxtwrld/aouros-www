import { json, error, type RequestHandler } from '@sveltejs/kit';
import { enhancedAIProvider } from '$lib/ai/providers/enhanced-abstraction';
import type { Content } from '$lib/ai/types.d';
import { generateId } from '$lib/utils/id';
import anatomyObjects from '$components/anatomy/objects.json';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { modelConfig } from '$lib/config/model-config';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
  // Check authentication
  const { session } = await safeGetSession();
  if (!session) {
    error(401, { message: 'Unauthorized' });
  }

  try {
    const { 
      message, 
      mode, 
      profileId, 
      conversationHistory, 
      language = 'en',
      pageContext 
    } = await request.json();

    // Validate required fields
    if (!message || !mode || !profileId) {
      error(400, { message: 'Missing required fields: message, mode, profileId' });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Process AI request
        processAIRequest(
          message,
          mode,
          profileId,
          conversationHistory || [],
          language,
          pageContext,
          controller,
          encoder
        ).catch((err) => {
          console.error('AI processing error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              message: 'Failed to process message' 
            })}\n\n`)
          );
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (err) {
    console.error('Chat conversation error:', err);
    error(500, { message: 'Internal server error' });
  }
};

async function processAIRequest(
  userMessage: string,
  mode: 'patient' | 'clinical',
  profileId: string,
  conversationHistory: any[],
  language: string,
  pageContext: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const tokenUsage = { total: 0 };

  try {
    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode, language, pageContext);
    
    // Phase 1: Stream the text response
    const streamingModel = new ChatOpenAI({
      model: 'gpt-4o-2024-08-06',
      apiKey: modelConfig.getProviderApiKey('openai'),
      temperature: 0.7,
      streaming: true,
    });

    const messages = [
      new SystemMessage(systemPrompt),
      // Add conversation history
      ...conversationHistory.slice(-10).flatMap(msg => {
        if (msg.role === 'user') return [new HumanMessage(msg.content)];
        if (msg.role === 'assistant') return [new SystemMessage(msg.content)];
        return [];
      }),
      new HumanMessage(userMessage)
    ];

    // Start streaming the response
    let fullResponse = '';
    const stream = await streamingModel.stream(messages);
    
    for await (const chunk of stream) {
      const text = chunk.content.toString();
      fullResponse += text;
      
      // Send chunk to client
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ 
          type: 'chunk',
          content: text 
        })}\n\n`)
      );
    }

    // Phase 2: Get structured data using the full response
    const content: Content[] = [
      { type: 'text', text: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        type: 'text' as const,
        text: `${msg.role}: ${msg.content}`
      })),
      { type: 'text', text: `user: ${userMessage}` },
      { type: 'text', text: `assistant: ${fullResponse}` }
    ];

    const schema = createResponseSchema(mode);
    
    // Get structured data (anatomy references, etc.)
    const structuredData = await enhancedAIProvider.analyzeDocument(
      content,
      schema,
      tokenUsage,
      {
        language: getLanguageName(language),
        temperature: 0,
        flowType: mode === 'patient' ? 'medical_analysis' : 'medical_analysis'
      }
    );

    // Send the structured data as metadata
    const metadata = {
      type: 'metadata',
      data: {
        anatomyReferences: structuredData.anatomyReferences || [],
        documentReferences: structuredData.documentReferences || [],
        consentRequests: structuredData.consentRequests || [],
        tokenUsage: tokenUsage.total,
        mode
      }
    };

    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
    );

    // Send completion signal
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
    );

    // Close the stream
    controller.close();

  } catch (err) {
    console.error('AI processing error:', err);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process AI request' 
      })}\n\n`)
    );
    controller.close();
  }
}

function buildSystemPrompt(mode: 'patient' | 'clinical', language: string, pageContext: any): string {
  const basePrompt = `You are an AI medical assistant integrated with a 3D anatomy model. IMPORTANT: Never include technical IDs, anatomy references, or mention "AnatomyReferences" in your text responses. These are handled automatically by the system.`;
  
  // Extract document content if available
  let documentContext = '';
  if (pageContext?.documentsContent && Array.isArray(pageContext.documentsContent)) {
    const documents = pageContext.documentsContent;
    if (documents.length > 0) {
      documentContext = '\n\nAVAILABLE MEDICAL DOCUMENTS:\n';
      documents.forEach(([docId, doc]) => {
        if (doc?.content) {
          documentContext += `\nDocument: ${doc.content.title || doc.metadata?.title || 'Untitled'}\n`;
          // Include key medical information from the document
          if (doc.content.diagnosis) {
            documentContext += `- Diagnosis: ${JSON.stringify(doc.content.diagnosis)}\n`;
          }
          if (doc.content.medications) {
            documentContext += `- Medications: ${JSON.stringify(doc.content.medications)}\n`;
          }
          if (doc.content.vitals) {
            documentContext += `- Vitals: ${JSON.stringify(doc.content.vitals)}\n`;
          }
          if (doc.content.recommendations) {
            documentContext += `- Recommendations: ${JSON.stringify(doc.content.recommendations)}\n`;
          }
          // Include any other relevant content
          const { title, diagnosis, medications, vitals, recommendations, ...otherContent } = doc.content;
          if (Object.keys(otherContent).length > 0) {
            documentContext += `- Additional Information: ${JSON.stringify(otherContent)}\n`;
          }
        }
      });
    }
  }
  
  if (mode === 'patient') {
    return `${basePrompt}

PATIENT SUPPORT MODE:
- Use empathetic, supportive language
- Focus on education and understanding
- Provide emotional support and coping strategies
- Never provide medical advice or diagnosis
- Always recommend consulting healthcare providers
- Use language appropriate for: ${language}
- Patient name: ${pageContext?.profileName || 'Patient'}

When discussing body parts, include relevant anatomy references in the anatomyReferences field using EXACT IDs from the enum list.
Examples of valid IDs: "heart", "lungs", "brain", "stomach", "L_patella", "R_femur", "lumbar_spine", "liver_left", etc.
DO NOT translate these IDs - use them exactly as they appear in the enum.
DO NOT mention the 3D model in your text response - anatomy buttons will be automatically added by the UI.
NEVER include AnatomyReferences or any technical IDs in your text response - these are only for the structured data field.

${documentContext}

IMPORTANT BOUNDARIES:
- No treatment recommendations
- Always explain difficult concepts
- When using medical advice or diagnosis, or treatment recommendations always defer to healthcare providers at the end.
- Focus on understanding and support`;
  } else {
    return `${basePrompt}

CLINICAL CONSULTATION MODE:
- Use professional, analytical language
- Provide clinical insights and perspectives
- Suggest diagnostic considerations
- Analyze patterns and correlations
- Reference medical literature when appropriate
- Use language appropriate for: ${language}
- Patient profile: ${pageContext?.profileName || 'Patient'}

When discussing anatomical structures, include relevant anatomy references in the anatomyReferences field using EXACT IDs from the enum list.
Examples of valid IDs: "heart", "lungs", "brain", "stomach", "L_patella", "R_femur", "lumbar_spine", "liver_left", etc.
DO NOT translate these IDs - use them exactly as they appear in the enum.
DO NOT mention the 3D model in your text response - anatomy buttons will be automatically added by the UI.
NEVER include AnatomyReferences or any technical IDs in your text response - these are only for the structured data field.

${documentContext}

CLINICAL FOCUS:
- Pattern analysis across patient history
- Differential diagnostic considerations
- Evidence-based insights
- Professional medical terminology`;
  }
}

function createResponseSchema(mode: 'patient' | 'clinical') {
  // Get all valid anatomy object IDs from the configuration
  const allAnatomyObjects: string[] = [];
  Object.values(anatomyObjects).forEach(system => {
    allAnatomyObjects.push(...system.objects);
  });

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
          items: { 
            type: 'string',
            enum: allAnatomyObjects
          },
          description: 'Body parts mentioned that could be visualized. MUST use exact IDs from the enum list (e.g., "heart", "lungs", "L_patella", "R_femur"). DO NOT translate these IDs. DO NOT mention the 3D model in your text response.',
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

function getLanguageName(languageCode: string): string {
  const languages = {
    'en': 'English',
    'cs': 'Czech',
    'de': 'German',
  };
  return languages[languageCode] || 'English';
}

