import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
export default {
    "name": "extractor",
    "description": "You are aprofessional medical assistent with deep knowledge like Doctor House. Your input is a JSON  ith doctor/patient conversation and extracted symptoms. Your task is to extract any diagnosis, treatment, medication mentioned by the doctor and also suggest other relevant alternatives. All information mentioned by the doctor should have the origin set to DOCTOR. Suggestion and alternatives based on context should set the origin as SUGGESTION. Provide all answers in [LANGUAGE] language.",
    "parameters": {
        "type": "object",
        "properties": {


            "diagnosis": {
                "description": "A list of possible diagnoses. Extract the diagnosis mentioned by the doctor and mark the origin as DOCTOR. Provide further diagnosis that was not mentioned but could be relvant suggestion and mark the origin as suggestion. Provide answers in [LANGUAGE] language.",
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "The name of the diagnosis. Provide answer in [LANGUAGE] language."
                        },
                        "code": {
                            "type": "string",
                            "description": "The ICD-10 code of the diagnosis"
                        },
                        "origin": {
                            "type": "string",
                            "description": "The origin of the diagnosis. Select Doctor if the doctor explicitly suggested this diagnosis in  the conversation, otherwise select suggestion. Provide answer in [LANGUAGE] language.",
                            "enum": ["suggestion", "doctor"]
                        },
                        "basis": {
                            "type": "string",
                            "description": "The basis of the diagnosis. Provide answer in [LANGUAGE] language."
                        },
                        "probability": {
                            "type": "number",
                            "description": "The probability of the diagnosis"
                        }
                    },
                    "required": [ "name", "origin", "basis", "probability"]
                }
            },
            "treatment": {
                "description": "Treatment plan suggestions. Extract any treatment plan mentioned by the doctor in the conversation and mark theim in origin as doctor. Provide further alternative suggestions for treatment that can be considered. Provide answer in [LANGUAGE] language.",
                "type": "array",
                "items": {
                    "type": "object",
                    "properties" :{
                        "description": {
                            "type": "string",
                            "description": "The description of the  treatment or counter measures. Provide answer in [LANGUAGE] language."
                        },
                        "origin": {
                            "type": "string",
                            "description": "The origin of the treatment or counter messages.  Select Doctor only if the doctor explicitely mentioned this diagnosis in conversation, otherwise select suggestion. Provide answer in [LANGUAGE] language.",
                            "enum": ["suggestion", "doctor"]
                        }

                    },
                    "required": [ "description", "origin"]

                }
            },
            "followUp": {
                "description": "Based on the diagnosis we want to recommend further follow up tests to be done or specialist visit recommendation.   Provide answers in [LANGUAGE] language.",
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["test", "doctor"],
                            "description": "The type of follow up or doctor visit recommendation"
                        },
                        "name": {
                            "type": "string",
                            "description": "The name of the follow up or doctor visit recommendation. Provide answer in [LANGUAGE] language."
                        },
                        "reason": {
                            "type": "string",
                            "description": "The reason for the follow up or doctor visit recommendation. Provide answer in [LANGUAGE] language."
                        },
                        "origin": {
                            "type": "string",
                            "description": "The origin of the follow up. Select Doctor only if the doctor explicitely mentioned this follow up in conversation, otherwise select suggestion. Provide answer in [LANGUAGE] language.",
                            "enum": ["suggestion", "doctor"]
                        }
                    },
                    "required": [ "type", "name", "reason", "origin"]
                }
            },
            "medication": {
                "type": "array",
                "description": "A list of medications the patient should take. If the medication was mentioned by the doctor, mark as Doctor in the origin field. Provide further medication suggestion and alternatives no mentioned that could be considered and mark them as suggestion in the origin field. Provide answer in [LANGUAGE] language.",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "The name of the medication. Provide answer in [LANGUAGE] language."
                        },
                        "dosage": {
                            "type": "number",
                            "description": "The dosage of the medication in mg units."
                        },
                        "days": {
                            "type": "string",
                            "enum": ["1-3 days", "3-5 days", "5-7 days", "7-10 days", "10-14 days"],
                            "description": "The days the medication should be taken"
                        },
                        "days_of_week": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                            },
                            "description": "The days of the week the medication should be taken"
                        },
                        "time_of_day": {
                            "type": "string",
                            "description": "The time of day the medication should be taken. Provide answer in [LANGUAGE] language."
                        },
                        "origin": {
                            "type": "string",
                            "description": "The origin of the medication. Select Doctor only if the doctor explicitely mentioned this medication in conversation, otherwise select suggestion. Provide answer in [LANGUAGE] language.",
                            "enum": ["suggestion", "doctor"]
                        }
                    },
                    "required": [ "name", "dosage", "days", "days_of_week", "time_of_day", "origin"]
                }
            },
            "signals": {
                "type": "array",
                "description": "PLACEHOLDER  - wee be extended with core Signal schames",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": [ "signals",  "diagnosis", "treatment", "followUp", "medication"]
    }
} as FunctionDefinition;