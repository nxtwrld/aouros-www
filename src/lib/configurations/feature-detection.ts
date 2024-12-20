import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
export default {
    "name": "extractor",
    "description": "Proceed step by step. Identify the contents of the provided JSON  input. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in [LANGUAGE] language, except for contents which is in the original language of the report.",
    "parameters": {
        "type": "object",
        "properties": {
            "isMedical": {
                "type": "boolean",
                "description": "Is it a medical report, lab results or DICOM type image? true/false. If it is not a medical report, ignore the rest of the parameters." 
            },
            "type": {
                "type": "string",
                "description": "If it is a medical report, lab results, dental record, DNA analysis o, specify the type. ",
                "enum": ["report", "laboratory", "dental", "dna"]
            },
            "language" : {
                "type": "string",
                "description": "Language of the text in the image. If it is not in English, specify the language in a two character ISO-639 language code Set 1."
            },
            "tags": {
                "type": "array",
                "description": "TaGS AND Labels of the image. If it is not a medical report, lab results or DICOM type image, list of labels. For example if it consideres a broken bone, list the latin bone name in tags, if the document mentions a desease, list the desease name in tags. If the document contains lab results, list the lab test names in english in tags. Everything will be provided in simplest form in latin and / or english form.",
                "items": {
                    "type": "string",
                    "enum": []
                }
            },
            "hasLabOrVitals": {
                "type": "boolean",
                "description": "Does the document contain lab results or vital signs? true/false. If it does not contain lab results or vital signs set as false"
            },
            "hasPrescription": {
                "type": "boolean",
                "description": "Does the document contain a prescription? true/false. If it does not contain a prescription set as false"
            },
            "hasImmunization": {
                "type": "boolean",
                "description": "Does the document contain immunization records? true/false. If it does not contain immunization records set as false"
            }
            
        },
        "required": [ "isMedical", "type", "tags", "language", "text", "labels", "hasPrescription"]
    }
} as FunctionDefinition;