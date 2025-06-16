import { error, json } from '@sveltejs/kit';
import { getSession, addTranscript, updateAnalysis, setAnalysisInProgress } from '$lib/session/manager';
import { transcribeAudioChunk } from '$lib/session/realtime-transcription';
import type { PartialTranscript } from '$lib/session/manager';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY
});

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ params, request, locals: { supabase, safeGetSession, user } }) {
    const { session } = await safeGetSession();

    if (!session || !user) {
        error(401, { message: 'Unauthorized' });
    }

    const sessionId = params.sessionId!;
    console.log('📡 Processing audio chunk for session:', sessionId);

    try {
        const sessionData = getSession(sessionId);
        
        if (!sessionData) {
            error(404, { message: 'Session not found' });
        }

        // Verify session belongs to user
        if (sessionData.userId !== user.id) {
            error(403, { message: 'Access denied to this session' });
        }

        // Get form data
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const timestamp = formData.get('timestamp') as string;

        if (!audioFile) {
            error(400, { message: 'No audio file provided' });
        }

        console.log('📡 Processing audio file:', {
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type,
            timestamp,
            hasOpenAIThread: !!sessionData.openaiThreadId
        });

        // Process transcription
        const transcript = await transcribeAudioChunk(audioFile, sessionData.language);
        
        let response: any = {
            sessionId,
            processed: true,
            timestamp: Date.now(),
            hasTranscript: !!transcript,
            analysisTriggered: false
        };

        if (transcript) {
            // Create partial transcript
            const partialTranscript: PartialTranscript = {
                id: generateTranscriptId(),
                text: transcript.text,
                confidence: transcript.confidence || 0.8,
                timestamp: Date.now(),
                is_final: transcript.is_final || true,
                speaker: transcript.speaker
            };

            // Add to session (this triggers SSE update automatically)
            addTranscript(sessionId, partialTranscript);
            response.transcript = partialTranscript;

            console.log('📝 Transcript added:', {
                id: partialTranscript.id,
                text: partialTranscript.text.substring(0, 100) + '...',
                confidence: partialTranscript.confidence
            });

            // Trigger incremental analysis if we have enough content
            if (partialTranscript.is_final && shouldTriggerAnalysis(sessionData)) {
                console.log('🔬 Triggering incremental analysis...');
                response.analysisTriggered = true;
                
                // Don't await - let analysis run in background and stream via SSE
                triggerIncrementalAnalysis(sessionId, partialTranscript.text).catch(error => {
                    console.error('❌ Analysis error:', error);
                });
            }
        } else {
            console.log('⚠️ No transcript generated from audio chunk');
        }

        return json(response);
    } catch (err) {
        console.error('❌ Failed to process audio chunk:', err);
        error(500, { message: 'Failed to process audio chunk' });
    }
}

// Determine if we should trigger analysis
function shouldTriggerAnalysis(sessionData: any): boolean {
    if (!sessionData.transcripts || sessionData.transcripts.length === 0) {
        console.log('🚫 No transcripts to analyze');
        return false;
    }

    // Don't trigger if analysis is already in progress
    if (sessionData.analysisState?.analysisInProgress) {
        console.log('⏳ Analysis already in progress, skipping...');
        return false;
    }

    // Get unprocessed content since last analysis
    const lastProcessedIndex = sessionData.analysisState?.lastProcessedTranscriptIndex || 0;
    const unprocessedTranscripts = sessionData.transcripts.slice(lastProcessedIndex);
    const unprocessedText = unprocessedTranscripts
        .filter(t => t.is_final)
        .map(t => t.text)
        .join(' ');

    // Smart batching strategy
    const unprocessedLength = unprocessedText.length;
    const timeSinceLastAnalysis = Date.now() - (sessionData.analysisState?.lastAnalysisTime || 0);
    
    // Meaningful content thresholds
    const minMeaningfulContent = 100; // At least 100 characters for analysis
    const maxWaitTime = 15000; // Maximum 15 seconds before forcing analysis
    const hasEnoughContent = unprocessedLength >= minMeaningfulContent;
    const hasWaitedLongEnough = timeSinceLastAnalysis > maxWaitTime;
    
    // Also trigger on significant content accumulation
    const significantContent = unprocessedLength >= 200; // Large chunk = immediate analysis
    
    console.log('🤔 Smart batching analysis decision:', {
        unprocessedTranscripts: unprocessedTranscripts.length,
        unprocessedLength,
        timeSinceLastAnalysis: Math.round(timeSinceLastAnalysis / 1000) + 's',
        conditions: {
            hasEnoughContent: `${unprocessedLength} >= ${minMeaningfulContent}`,
            hasWaitedLongEnough: `${Math.round(timeSinceLastAnalysis / 1000)}s >= ${maxWaitTime/1000}s`,
            significantContent: `${unprocessedLength} >= 200`
        },
        willTrigger: hasEnoughContent || hasWaitedLongEnough || significantContent,
        unprocessedText: unprocessedText.substring(0, 100) + (unprocessedText.length > 100 ? '...' : '')
    });

    return hasEnoughContent || hasWaitedLongEnough || significantContent;
}

// Incremental analysis using ChatGPT thread
async function triggerIncrementalAnalysis(sessionId: string, newStatement: string) {
    console.log('🔬 triggerIncrementalAnalysis called', { sessionId, newStatement });
    
    const sessionData = getSession(sessionId);
    if (!sessionData) {
        console.error('❌ No session data in triggerIncrementalAnalysis');
        return;
    }

    console.log('🔬 Session data for analysis:', {
        hasOpenAIThread: !!sessionData.openaiThreadId,
        openaiThreadId: sessionData.openaiThreadId,
        transcriptCount: sessionData.transcripts?.length || 0,
        analysisInProgress: sessionData.analysisState?.analysisInProgress
    });

    // Mark analysis as in progress
    console.log('🔬 Setting analysis in progress...');
    setAnalysisInProgress(sessionId, true);

    try {
        if (sessionData.openaiThreadId) {
            console.log('🤖 Using ChatGPT analysis with thread:', sessionData.openaiThreadId);
            await runChatGPTAnalysis(sessionId, sessionData.openaiThreadId, newStatement);
        } else {
            console.log('🔄 No OpenAI thread, using fallback analysis...');
            await runFallbackAnalysis(sessionId);
        }
        console.log('✅ Analysis completed successfully');
    } catch (error) {
        console.error('❌ Analysis failed:', error);
    } finally {
        // Mark analysis as complete
        console.log('🔬 Setting analysis complete...');
        setAnalysisInProgress(sessionId, false);
    }
}

// ChatGPT thread-based analysis
async function runChatGPTAnalysis(sessionId: string, threadId: string, newStatement: string) {
    console.log('🤖 Running ChatGPT incremental analysis...');

    try {
        // Add new statement to thread
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: `New patient statement: "${newStatement}"`
        });

        // Check if we have a valid assistant ID
        const assistantId = env.OPENAI_MEDICAL_ASSISTANT_ID;
        if (!assistantId || assistantId === 'asst_default') {
            console.log('⚠️ No valid ChatGPT assistant configured, falling back to traditional analysis');
            await runFallbackAnalysis(sessionId);
            return;
        }

        console.log('🤖 Using ChatGPT assistant:', assistantId);

        // Run analysis with streaming
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
            instructions: `
                Analyze this new patient statement in the context of our ongoing conversation.
                Provide ONLY INCREMENTAL UPDATES to your previous analysis.
                Focus on: diagnosis updates, treatment modifications, new medication suggestions, follow-up changes.
                Return updates in JSON format with fields: diagnosis, treatment, medication, followUp.
                Be concise and only mention changes or new insights.
            `,
            stream: true
        });

        let analysisContent = '';
        
        // Process streaming response
        for await (const chunk of run) {
            if (chunk.event === 'thread.message.delta') {
                const deltaContent = chunk.data.delta.content?.[0];
                if (deltaContent?.type === 'text') {
                    analysisContent += deltaContent.text?.value || '';
                }
            }
            
            if (chunk.event === 'thread.run.completed') {
                console.log('✅ ChatGPT analysis completed');
                break;
            }
        }

        // Parse and update analysis
        if (analysisContent) {
            const analysis = parseAnalysisResponse(analysisContent);
            updateAnalysis(sessionId, analysis);
            
            // Update processed transcript index
            const session = getSession(sessionId);
            if (session) {
                session.analysisState.lastProcessedTranscriptIndex = session.transcripts?.length || 0;
            }
        }

    } catch (error) {
        console.error('❌ ChatGPT analysis error:', error);
        console.log('🔄 Falling back to traditional analysis due to ChatGPT error...');
        // Fallback to traditional analysis
        await runFallbackAnalysis(sessionId);
    }
}

// Fallback analysis using existing system
async function runFallbackAnalysis(sessionId: string) {
    console.log('🔄 Running fallback analysis...');
    
    try {
        const sessionData = getSession(sessionId);
        if (!sessionData) {
            console.error('❌ No session data found for fallback analysis');
            return;
        }

        // Get all final transcripts
        const finalTranscripts = sessionData.transcripts?.filter(t => t.is_final) || [];
        const fullText = finalTranscripts.map(t => t.text).join(' ');

        console.log('📝 Fallback analysis input:', {
            transcriptCount: finalTranscripts.length,
            textLength: fullText.length,
            text: fullText.substring(0, 200) + (fullText.length > 200 ? '...' : '')
        });

        if (fullText.length < 20) {
            console.log('⚠️ Not enough content for analysis (need >20 chars)');
            return;
        }

        // Use existing analysis system
        console.log('🔍 Importing realtime analysis module...');
        const { analyzeTranscriptionRealtime } = await import('$lib/session/realtime-analysis');
        
        console.log('🔍 Calling analyzeTranscriptionRealtime...');
        const analysis = await analyzeTranscriptionRealtime(
            fullText,
            sessionData.language,
            sessionData.models
        );

        console.log('📊 Fallback analysis result:', {
            hasResult: !!analysis,
            isMedical: analysis?.isMedicalConversation,
            diagnosisCount: analysis?.diagnosis?.length || 0,
            treatmentCount: analysis?.treatment?.length || 0,
            medicationCount: analysis?.medication?.length || 0,
            followUpCount: analysis?.followUp?.length || 0
        });

        if (analysis && analysis.isMedicalConversation !== false) {
            console.log('✅ Updating analysis with fallback results...');
            
            // Ensure we have arrays even if empty
            const structuredAnalysis = {
                diagnosis: analysis.diagnosis || [],
                treatment: analysis.treatment || [],
                medication: analysis.medication || [],
                followUp: analysis.followUp || [],
                source: 'fallback_analysis',
                timestamp: Date.now()
            };

            console.log('📤 Sending structured analysis update:', structuredAnalysis);
            updateAnalysis(sessionId, structuredAnalysis);
            
            // Update processed transcript index
            const session = getSession(sessionId);
            if (session) {
                session.analysisState.lastProcessedTranscriptIndex = session.transcripts?.length || 0;
                console.log('✅ Updated lastProcessedTranscriptIndex to:', session.analysisState.lastProcessedTranscriptIndex);
            }
        } else {
            console.log('❌ Analysis indicated non-medical conversation or no results');
        }
    } catch (error) {
        console.error('❌ Fallback analysis error:', error);
    }
}

// Parse ChatGPT analysis response
function parseAnalysisResponse(content: string) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // Fallback: create structured response from text
        return {
            diagnosis: extractItems(content, /diagnosis|diagnose/i),
            treatment: extractItems(content, /treatment|treat/i),
            medication: extractItems(content, /medication|medicine|drug/i),
            followUp: extractItems(content, /follow.?up|next.?step/i)
        };
    } catch (error) {
        console.error('❌ Error parsing analysis response:', error);
        return { notes: content };
    }
}

// Helper to extract items from text
function extractItems(text: string, pattern: RegExp) {
    const matches = text.split('\n').filter(line => pattern.test(line));
    return matches.map((match, index) => ({
        id: `item_${Date.now()}_${index}`,
        description: match.trim(),
        confidence: 0.8,
        source: 'chatgpt'
    }));
}

function generateTranscriptId(): string {
    return `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 