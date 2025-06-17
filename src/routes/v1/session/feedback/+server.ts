import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Interface for feedback data
interface FeedbackData {
    itemType: 'diagnosis' | 'treatment' | 'clarifyingQuestion' | 'doctorRecommendation' | 'followUp' | 'medication' | 'unknown';
    itemContent: any;
    feedback: 'approved' | 'rejected' | 'neutral';
    timestamp: number;
}

// Temporary in-memory storage for feedback
// In production, this would be stored in a database
let feedbackStore: Map<string, FeedbackData[]> = new Map();

export const POST: RequestHandler = async ({ request }) => {
    try {
        const feedbackData: FeedbackData = await request.json();
        
        // Validate feedback data
        if (!feedbackData.itemType || !feedbackData.feedback || !feedbackData.timestamp) {
            return json(
                { error: 'Missing required feedback fields' },
                { status: 400 }
            );
        }

        // Generate a unique ID for this feedback entry
        const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store feedback
        if (!feedbackStore.has(feedbackData.itemType)) {
            feedbackStore.set(feedbackData.itemType, []);
        }
        
        const typeStore = feedbackStore.get(feedbackData.itemType)!;
        typeStore.push({
            ...feedbackData,
            timestamp: Date.now()
        });

        console.log(`✅ Feedback received for ${feedbackData.itemType}:`, {
            feedback: feedbackData.feedback,
            itemType: feedbackData.itemType,
            timestamp: new Date(feedbackData.timestamp).toISOString()
        });

        // Log feedback analytics
        logFeedbackAnalytics();

        return json({ 
            success: true, 
            feedbackId,
            message: 'Feedback recorded successfully'
        });

    } catch (error) {
        console.error('❌ Error processing feedback:', error);
        return json(
            { error: 'Failed to process feedback' },
            { status: 500 }
        );
    }
};

export const GET: RequestHandler = async ({ url }) => {
    try {
        const itemType = url.searchParams.get('type');
        
        if (itemType) {
            // Return feedback for specific item type
            const typeStore = feedbackStore.get(itemType) || [];
            return json({
                itemType,
                feedback: typeStore,
                count: typeStore.length
            });
        }

        // Return analytics summary
        const analytics = generateFeedbackAnalytics();
        return json(analytics);

    } catch (error) {
        console.error('❌ Error retrieving feedback:', error);
        return json(
            { error: 'Failed to retrieve feedback' },
            { status: 500 }
        );
    }
};

function logFeedbackAnalytics() {
    const analytics = generateFeedbackAnalytics();
    console.log('📊 Feedback Analytics:', analytics);
}

function generateFeedbackAnalytics() {
    const analytics: any = {
        totalFeedback: 0,
        byType: {},
        byFeedback: {
            approved: 0,
            rejected: 0,
            neutral: 0
        },
        approvalRates: {}
    };

    for (const [itemType, feedback] of feedbackStore) {
        analytics.byType[itemType] = {
            total: feedback.length,
            approved: feedback.filter(f => f.feedback === 'approved').length,
            rejected: feedback.filter(f => f.feedback === 'rejected').length,
            neutral: feedback.filter(f => f.feedback === 'neutral').length
        };

        analytics.totalFeedback += feedback.length;
        
        feedback.forEach(f => {
            analytics.byFeedback[f.feedback]++;
        });

        // Calculate approval rate
        const total = analytics.byType[itemType].total;
        const approved = analytics.byType[itemType].approved;
        analytics.approvalRates[itemType] = total > 0 ? Math.round((approved / total) * 100) : 0;
    }

    return analytics;
}

// Export function to get feedback for AI context
export function getFeedbackForAI(itemType?: string): string {
    if (itemType && feedbackStore.has(itemType)) {
        const feedback = feedbackStore.get(itemType)!;
        const approved = feedback.filter(f => f.feedback === 'approved');
        const rejected = feedback.filter(f => f.feedback === 'rejected');

        if (approved.length > 0 || rejected.length > 0) {
            return `Doctor feedback history for ${itemType}:
            - Approved suggestions: ${approved.length}
            - Rejected suggestions: ${rejected.length}
            
            Recent approved patterns: ${approved.slice(-3).map(f => f.itemContent.description || f.itemContent.diagnosis || f.itemContent.question || 'suggestion').join(', ')}
            Recent rejected patterns: ${rejected.slice(-3).map(f => f.itemContent.description || f.itemContent.diagnosis || f.itemContent.question || 'suggestion').join(', ')}`;
        }
    }

    const analytics = generateFeedbackAnalytics();
    return `Overall doctor feedback patterns:
    - Total feedback entries: ${analytics.totalFeedback}
    - Overall approval rates: ${Object.entries(analytics.approvalRates).map(([type, rate]) => `${type}: ${rate}%`).join(', ')}
    - Doctor prefers suggestions that align with previous approved patterns`;
} 