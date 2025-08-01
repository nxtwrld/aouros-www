/**
 * Type definition for OpenAI function schema format
 * Used for text extraction with structured output
 */
export interface Extractor {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Schema validation helper for extractor functions
 */
export function validateExtractorSchema(schema: any): schema is Extractor {
  return (
    typeof schema === "object" &&
    typeof schema.name === "string" &&
    typeof schema.description === "string" &&
    typeof schema.parameters === "object" &&
    schema.parameters.type === "object" &&
    typeof schema.parameters.properties === "object"
  );
}

/**
 * Example extractor type for medical diagnosis
 */
export interface DiagnosisExtractor extends Extractor {
  name: "extractor";
  parameters: {
    type: "object";
    properties: {
      symptoms: any;
      diagnosisList: any;
      counterMeassures: any;
      follow_up: any;
      medication: any;
      chat_response: any;
    };
  };
}
