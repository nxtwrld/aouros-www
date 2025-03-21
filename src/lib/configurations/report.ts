import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
export default {
    "name": "extractor",
    "description": "You are medical expert data analyzer. Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical. With each section provide only iformation contained in the document. For dates, if only a year is known, just list the year without day or month.  All results should be translated to [LANGUAGE] language, except for 'content' field that keeps the original language of the document.",
    "parameters": {
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "description": "Select proper subclassfication of the nature of the report. If the report is not in the list, use general. Laboratory is for lab results, vital-signs for vital signs reports, imaging for medical imaging reports, exam for medical examination reports (probably most GP reports), procedure for medical procedure reports like surgery etc., medication for medication reports, social-history for social history reports, survey for survey reports, therapy for physio therapy and rehabilitation reports, activity for activity reports, other for other reports.",
                "enum": [
                    "general",
                    "laboratory",
                    "vital-signs",
                    "imaging",
                    "exam",
                    "procedure",
                    "medication",
                    "social-history",
                    "survey",
                    "therapy",
                    "activity",
                    "other"
                ]
            },
            "title": {
                "type": "string",
                "description": "Title of the observation.  Provide specific context from the report to clearly identify the issues and topic of the report and ideally the most affected boty part or specialization. Use concise and clear language to describe the report subject. Translate result to the [LANGUAGE] langauge if the source is in a different language."    
            },
            "summary": {
                "type": "string",
                "description": "Summary and findings of the observation in natural language.  Enhance comprehension by providing a clear and concise summary. Expand all abbreviations and acronyms. Highlight abnormal findings. Leave out patient personal information - leave just summary of the diagnosis and treatment. Use markdown format to empahises important findings. Translate result to the [LANGUAGE] langauge if the source is in a different language."
            },
            "content": {
                "type": "string",
                "description": "Text content of the observation in markdown format exluding the headings and footers, patient and performer information. Is is an OCR input, there might be words, that are not recognized correctly. Respect the original formatting. Create a nice document looking document format that is easily readable with paragraphs, bullet points, and tables. Use bold to empahisze important segments of text. Identify headings and mark them as headings. Remove patient or performer identification blocks and any other irrelevant information. Leave just the contents of the report. Keep the original language of the report."
            },

            "localizedContent": {
                "type": "string",
                "description": "Tak the output for the content property and translate the content to [LANGUAGE] language."
            },
            "recommendations": {
                "type": "array",
                "description": "Recommendation contained within the the report spit into individual logical points (if none leave blank array). Translate result to the [LANGUAGE] langauge if the source is in a different language.",
                "items" : {
                    "type": "object",
                    "properties": {
                        "urgency": {
                            "type": "number",
                            "description": "On a scale 1-5, how urgent is the recommendation. 1 - not urgent, just FYI, 5 - very urgent - one needs to act. Where level 2 is easily ignorable, but from 3 up, we want to make sure it is not missed."
                        },
                        "description": {
                            "type": "string",
                            "description": "A record for each individual recommendation contained within the the report. Translate result to the [LANGUAGE] langauge if the source is in a different language."
                        }
                    },
                    "required": [ "urgency", "description"]
                }
            },
            "date" : {
                "type": "string",
                "description": "Date of the report. Format: YYYY-MM-DD HH:MM:SS or just YYYY-MM-DD if no specific time is available. Leave empty if the date is not available."
            }
            
        },
        "required": [ "observation_type", "summary", "content", "bodyParts", "date", "performer", "patient"]
    }
} as FunctionDefinition;