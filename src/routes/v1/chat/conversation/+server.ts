import { json, error, type RequestHandler } from '@sveltejs/kit';
import { enhancedAIProvider } from '$lib/ai/providers/enhanced-abstraction';
import type { Content } from '$lib/ai/types.d';
import { generateId } from '$lib/utils/id';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { chatConfigManager } from '$lib/config/chat-config';

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
      pageContext,
      provider // Optional provider override
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
          provider,
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
  provider: string | undefined,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const tokenUsage = { total: 0 };

  try {
    // Build system prompt based on mode using configuration
    const systemPrompt = chatConfigManager.buildSystemPrompt(mode, language, pageContext);
    
    // Phase 1: Stream the text response using configured model
    const streamingModel = chatConfigManager.createStreamingModel(provider);

    // Get conversation configuration
    const conversationConfig = chatConfigManager.getConversationConfig();
    
    const messages = [
      new SystemMessage(systemPrompt),
      // Add conversation history based on configuration
      ...conversationHistory.slice(-conversationConfig.maxMessages).flatMap(msg => {
        if (msg.role === 'user') return [new HumanMessage(msg.content)];
        if (msg.role === 'assistant' && conversationConfig.includeSystemMessages) {
          return [new SystemMessage(msg.content)];
        }
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
      ...conversationHistory.slice(-conversationConfig.maxMessages).map(msg => ({
        type: 'text' as const,
        text: `${msg.role}: ${msg.content}`
      })),
      { type: 'text', text: `user: ${userMessage}` },
      { type: 'text', text: `assistant: ${fullResponse}` }
    ];

    const schema = chatConfigManager.createResponseSchema(mode);
    
    // Get structured data (anatomy references, etc.)
    const structuredData = await enhancedAIProvider.analyzeDocument(
      content,
      schema,
      tokenUsage,
      {
        language: chatConfigManager.getLanguageName(language),
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

// All prompt building, schema creation, and utility functions are now handled by chatConfigManager
// Configuration is loaded from config/chat.json and managed by src/lib/config/chat-config.ts

