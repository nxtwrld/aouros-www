import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { feedbackStore, logFeedbackAnalytics, generateFeedbackAnalytics } from '$lib/ai/feedback.js';
import type { FeedbackData } from '$lib/ai/feedback.js';

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
