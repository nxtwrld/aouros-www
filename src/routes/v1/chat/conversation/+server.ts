import { json, error, type RequestHandler } from '@sveltejs/kit';
import { enhancedAIProvider } from '$lib/ai/providers/enhanced-abstraction';
import type { Content } from '$lib/ai/types.d';
import { generateId } from '$lib/utils/id';

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
        
        // Send initial status
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Processing...' })}\n\n`)
        );

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
    
    // Create content array for AI processing
    const content: Content[] = [
      { type: 'text', text: systemPrompt },
      // Add conversation history (last 10 messages)
      ...conversationHistory.slice(-10).map(msg => ({
        type: 'text' as const,
        text: `${msg.role}: ${msg.content}`
      })),
      { type: 'text', text: `user: ${userMessage}` }
    ];

    // Create response schema
    const schema = createResponseSchema(mode);

    // Send progress update
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ 
        type: 'progress', 
        message: 'Analyzing with AI...' 
      })}\n\n`)
    );

    // Get AI response
    const flowType = mode === 'patient' ? 'medical_analysis' : 'medical_analysis';
    const aiResponse = await enhancedAIProvider.analyzeDocument(
      content,
      schema,
      tokenUsage,
      {
        language: getLanguageName(language),
        temperature: 0.7,
        flowType,
        progressCallback: (stage, progress, message) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              stage, 
              progress, 
              message 
            })}\n\n`)
          );
        }
      }
    );

    // Detect body parts in the message
    const bodyPartReferences = detectBodyParts(userMessage);

    // Send final response
    const response = {
      type: 'response',
      data: {
        message: aiResponse.response || aiResponse.message || 'I apologize, but I encountered an issue processing your message.',
        anatomyReferences: bodyPartReferences,
        suggestions: bodyPartReferences.length > 0 ? [
          {
            bodyParts: bodyPartReferences,
            suggestion: `I can show you the ${bodyPartReferences[0]} on our 3D anatomy model to help you understand better.`,
            actionText: `Show ${bodyPartReferences[0]} on 3D model`
          }
        ] : [],
        documentReferences: aiResponse.documentReferences || [],
        consentRequests: aiResponse.consentRequests || [],
        tokenUsage: tokenUsage.total,
        mode
      }
    };

    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(response)}\n\n`)
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
  const basePrompt = `You are an AI medical assistant integrated with a 3D anatomy model. You can suggest anatomy visualizations when discussing body parts.`;
  
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

When discussing body parts, suggest using the 3D anatomy model for better understanding.
Available anatomy systems: skeletal, muscular, vascular, nervous, respiratory, digestive, urogenital.

${documentContext}

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
- Use language appropriate for: ${language}
- Patient profile: ${pageContext?.profileName || 'Patient'}

When discussing anatomical structures, suggest using the 3D model for visualization.
Available anatomy systems: skeletal, muscular, vascular, nervous, respiratory, digestive, urogenital.

${documentContext}

CLINICAL FOCUS:
- Pattern analysis across patient history
- Differential diagnostic considerations
- Evidence-based insights
- Professional medical terminology`;
  }
}

function createResponseSchema(mode: 'patient' | 'clinical') {
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

function getLanguageName(languageCode: string): string {
  const languages = {
    'en': 'English',
    'cs': 'Czech',
    'de': 'German',
  };
  return languages[languageCode] || 'English';
}

function detectBodyParts(text: string): string[] {
  const bodyPartMappings = {
    'knee': ['L_patella', 'R_patella'],
    'back': ['lumbar_spine', 'thoracic_spine'],
    'shoulder': ['L_scapula', 'R_scapula'],
    'heart': ['heart'],
    'lungs': ['lungs'],
    'liver': ['liver_left', 'liver_right'],
    'brain': ['brain'],
    'stomach': ['stomach'],
    'kidney': ['kidneys'],
  };

  const lowercaseText = text.toLowerCase();
  const detected: string[] = [];

  for (const [commonName, anatomyIds] of Object.entries(bodyPartMappings)) {
    if (lowercaseText.includes(commonName)) {
      detected.push(anatomyIds[0]);
    }
  }

  return detected;
}