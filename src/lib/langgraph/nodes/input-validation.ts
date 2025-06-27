import type { DocumentProcessingState } from "../state";

export const inputValidationNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  const errors = [];

  // Validate input requirements
  if (!state.images && !state.text) {
    errors.push({
      node: "input_validation",
      error: "Either images or text must be provided",
      timestamp: new Date().toISOString(),
    });
  }

  // Validate image formats if provided
  if (state.images) {
    for (const image of state.images) {
      if (!image.startsWith("data:image/") && !image.startsWith("http")) {
        errors.push({
          node: "input_validation",
          error: `Invalid image format: ${image.substring(0, 50)}...`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Validate language if provided
  const supportedLanguages = ["English", "Czech", "German"];
  if (state.language && !supportedLanguages.includes(state.language)) {
    console.warn(
      `Unsupported language: ${state.language}, defaulting to English`,
    );
  }

  // Convert images to content format for downstream processing
  const content = [];
  if (state.text) {
    content.push({
      type: "text" as const,
      text: state.text,
    });
  }

  if (state.images && state.images.length > 0) {
    // For now, we only support single image (backwards compatibility)
    content.push({
      type: "image_url" as const,
      image_url: {
        url: state.images[0],
      },
    });
  }

  return {
    content,
    errors: errors.length > 0 ? errors : undefined,
  };
};
