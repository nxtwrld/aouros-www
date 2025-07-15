// Interface for feedback data
export interface FeedbackData {
  itemType:
    | "diagnosis"
    | "treatment"
    | "clarifyingQuestion"
    | "doctorRecommendation"
    | "followUp"
    | "medication"
    | "unknown";
  itemContent: any;
  feedback: "approved" | "rejected" | "neutral";
  timestamp: number;
}

// Temporary in-memory storage for feedback
// In production, this would be stored in a database
export let feedbackStore: Map<string, FeedbackData[]> = new Map();

export function generateFeedbackAnalytics() {
  const analytics: any = {
    totalFeedback: 0,
    byType: {},
    byFeedback: {
      approved: 0,
      rejected: 0,
      neutral: 0,
    },
    approvalRates: {},
  };

  for (const [itemType, feedback] of feedbackStore) {
    analytics.byType[itemType] = {
      total: feedback.length,
      approved: feedback.filter((f) => f.feedback === "approved").length,
      rejected: feedback.filter((f) => f.feedback === "rejected").length,
      neutral: feedback.filter((f) => f.feedback === "neutral").length,
    };

    analytics.totalFeedback += feedback.length;

    feedback.forEach((f) => {
      analytics.byFeedback[f.feedback]++;
    });

    // Calculate approval rate
    const total = analytics.byType[itemType].total;
    const approved = analytics.byType[itemType].approved;
    analytics.approvalRates[itemType] =
      total > 0 ? Math.round((approved / total) * 100) : 0;
  }

  return analytics;
}

export function logFeedbackAnalytics() {
  const analytics = generateFeedbackAnalytics();
  console.log("📊 Feedback Analytics:", analytics);
}

// Export function to get feedback for AI context
export function getFeedbackForAI(itemType?: string): string {
  if (itemType && feedbackStore.has(itemType)) {
    const feedback = feedbackStore.get(itemType)!;
    const approved = feedback.filter((f) => f.feedback === "approved");
    const rejected = feedback.filter((f) => f.feedback === "rejected");

    if (approved.length > 0 || rejected.length > 0) {
      return `Doctor feedback history for ${itemType}:
            - Approved suggestions: ${approved.length}
            - Rejected suggestions: ${rejected.length}
            
            Recent approved patterns: ${approved
              .slice(-3)
              .map(
                (f) =>
                  f.itemContent.description ||
                  f.itemContent.diagnosis ||
                  f.itemContent.question ||
                  "suggestion",
              )
              .join(", ")}
            Recent rejected patterns: ${rejected
              .slice(-3)
              .map(
                (f) =>
                  f.itemContent.description ||
                  f.itemContent.diagnosis ||
                  f.itemContent.question ||
                  "suggestion",
              )
              .join(", ")}`;
    }
  }

  const analytics = generateFeedbackAnalytics();
  return `Overall doctor feedback patterns:
    - Total feedback entries: ${analytics.totalFeedback}
    - Overall approval rates: ${Object.entries(analytics.approvalRates)
      .map(([type, rate]) => `${type}: ${rate}%`)
      .join(", ")}
    - Doctor prefers suggestions that align with previous approved patterns`;
}
