import { enhancedAIProvider } from '$lib/ai/providers/enhanced-abstraction';
import { serenityFormExtractionSchema } from './serenity-schema';
import type { TokenUsage } from '$lib/ai/types.d';
import type { SerenityFormResponse } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function analyzeSerenityForm(
  transcript: string,
  formType: 'pre' | 'post',
  language: string = 'en'
): Promise<SerenityFormResponse> {
  // Load prompt template
  const promptPath = join(process.cwd(), 'src/lib/prompts/serenity-form-analysis.md');
  const promptTemplate = readFileSync(promptPath, 'utf-8');

  // Construct content with prompt + transcript
  const content = [
    {
      type: 'text' as const,
      text: `${promptTemplate}\n\n## Transcript to Analyze\n\n${transcript}\n\nForm Type: ${formType === 'pre' ? 'Pre-Session' : 'Post-Session'}`
    }
  ];

  // Token tracking
  const tokenUsage: TokenUsage = { total: 0 };

  // Call LLM using enhanced abstraction
  const result = await enhancedAIProvider.analyzeDocument(
    content,
    serenityFormExtractionSchema,
    tokenUsage,
    {
      language,
      flowType: 'serenity_form_analysis',
      temperature: 0, // Deterministic extraction
    }
  );

  // Calculate total score
  const scores = [
    result.facialExpression,
    result.eyeMovement,
    result.bodyMovement,
    result.vocalizationBreathing,
    result.environmentalEngagement
  ].filter(s => s !== undefined);

  const totalScore = scores.reduce((sum, s) => sum + s, 0);

  // Load form schema for interpretation
  const formSchemaPath = join(
    process.cwd(),
    `src/lib/selfassess/forms/form.serenity-therapeutic-${formType}.json`
  );
  const formSchema = JSON.parse(readFileSync(formSchemaPath, 'utf-8'));

  // Find interpretation range
  const interpretation = formSchema.scoringInterpretation.ranges.find(
    (range: any) => totalScore >= range.minScore && totalScore <= range.maxScore
  );

  return {
    success: true,
    formResponses: {
      facialExpression: result.facialExpression,
      eyeMovement: result.eyeMovement,
      bodyMovement: result.bodyMovement,
      vocalizationBreathing: result.vocalizationBreathing,
      environmentalEngagement: result.environmentalEngagement
    },
    totalScore,
    interpretation: {
      range: interpretation?.interpretation || 'Unknown',
      guidance: interpretation?.guidance || ''
    },
    confidence: result.confidence || 0.8,
    unansweredQuestions: result.unansweredQuestions || [],
    reasoning: result.reasoning
  };
}
