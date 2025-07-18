import type { FunctionDefinition } from "@langchain/core/language_models/base";
export default {
  name: "extractor",
  description:
    "Proceed step by step. From the provided structured data, create a FHIR resource JSON. The data can contain standard reports, lab results, medical imaging, etc.",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "FHIR Collection Bundle.",
      },
      entry: {
        type: "array",
        description:
          "Array of FHIR resource entries. Generate all that apply. Full records for Observation or DiganosticReport. Add Patient, Performer, Organization. If it applies add separate records for individual Lab result valueQuantities, Medications, and Immunization.",
        items: {
          type: "object",
          properties: {
            resource: {
              type: "object",
              description: "FHIR resource entry.",
              properties: {
                resourceType: {
                  type: "string",
                  description:
                    "Type of the FHIR resource. For example: Observation, DiagnosticReport, ImagingStudy, Patient, Device, Substance, Performer, Organization, Medication, Immunization etc.",
                  enum: [
                    "Observation",
                    "DiagnosticReport",
                    "ImagingStudy",
                    "Patient",
                    "Device",
                    "Substance",
                    "Performer",
                    "Organization",
                    "Medication",
                    "Immunization",
                  ],
                },
                text: {
                  status: {
                    type: "string",
                    description: "The status of the text.",
                    enum: ["generated", "extensions", "additional", "empty"],
                  },
                  markdown: {
                    type: "string",
                    description:
                      "The text of the observation in markdown format.",
                  },
                },
                id: {
                  type: "string",
                  description:
                    "Unique identifier for the resource. Generate a UUID if none provided.",
                },
                meta: {
                  type: "object",
                  description: "Metadata about the resource.",
                  properties: {
                    profile: {
                      type: "array",
                      description:
                        "Profiles this resource claims to conform to.",
                      items: {
                        type: "string",
                      },
                    },
                  },
                },
                status: {
                  type: "string",
                  description: "The status of the resource.",
                  enum: ["registered", "preliminary", "final", "amended"],
                },
                category: {
                  type: "array",
                  description: "The category of the observation.",
                  items: {
                    type: "object",
                    properties: {
                      coding: {
                        type: "array",
                        description: "The code for the category.",
                        items: {
                          type: "object",
                          properties: {
                            system: {
                              type: "string",
                              description: "The code system.",
                            },
                            code: {
                              type: "string",
                              description: "The code.",
                            },
                            display: {
                              type: "string",
                              description: "The display name.",
                            },
                          },
                        },
                      },
                    },
                  },
                },
                code: {
                  type: "object",
                  description: "The code of the observation.",
                  properties: {
                    coding: {
                      type: "array",
                      description: "The code for the observation.",
                      items: {
                        type: "object",
                        properties: {
                          system: {
                            type: "string",
                            description: "The code system.",
                          },
                          code: {
                            type: "string",
                            description: "The code.",
                          },
                          display: {
                            type: "string",
                            description: "The display name.",
                          },
                        },
                      },
                    },
                  },
                },
                subject: {
                  type: "object",
                  description: "The subject of the observation.",
                  properties: {
                    reference: {
                      type: "string",
                      description:
                        "The reference to the subject. If none provided, do not include this field.",
                    },
                  },
                },
                effectiveDateTime: {
                  type: "string",
                  description:
                    "The date and time this observation was made. If none provided, do not include this field.",
                },
                issued: {
                  type: "string",
                  description:
                    "The date and time this observation was issued. If none provided, do not include this field.",
                },
                performer: {
                  type: "array",
                  description:
                    "The individual or organization who was responsible for the observation. If none provided, do not include this field.",
                  items: {
                    type: "object",
                    properties: {
                      reference: {
                        type: "string",
                        description: "The reference to the performer.",
                      },
                    },
                  },
                },
                valueQuantity: {
                  type: "object",
                  description:
                    "The value of the observation. If none provided, do not include this field.",
                  properties: {
                    value: {
                      type: "number",
                      description: "The value of the observation.",
                    },
                    unit: {
                      type: "string",
                      description: "The unit of the observation.",
                    },
                    system: {
                      type: "string",
                      description: "The code system.",
                    },
                    code: {
                      type: "string",
                      description: "The code.",
                    },
                  },
                },
                interpretation: {
                  type: "object",
                  description:
                    "The interpretation of the observation. If none provided, do not include this field.",
                  properties: {
                    coding: {
                      type: "array",
                      description: "The code for the interpretation.",
                      items: {
                        type: "object",
                        properties: {
                          system: {
                            type: "string",
                            description: "The code system.",
                          },
                          code: {
                            type: "string",
                            description: "The code.",
                          },
                          display: {
                            type: "string",
                            description: "The display name.",
                          },
                        },
                      },
                    },
                  },
                },
                referenceRange: {
                  type: "array",
                  description:
                    "The reference range of the observation. If none provided, and it is relavant for the values, generate an estimate. Otherwise do not include this field.",
                  items: {
                    type: "object",
                    properties: {
                      low: {
                        type: "object",
                        description: "The low limit of the reference range.",
                        properties: {
                          value: {
                            type: "number",
                            description: "The value of the low limit.",
                          },
                          unit: {
                            type: "string",
                            description: "The unit of the low limit.",
                          },
                          system: {
                            type: "string",
                            description: "The code system.",
                          },
                          code: {
                            type: "string",
                            description: "The code.",
                          },
                        },
                      },
                      high: {
                        type: "object",
                        description: "The high limit of the reference range.",
                        properties: {
                          value: {
                            type: "number",
                            description: "The value of the high limit.",
                          },
                          unit: {
                            type: "string",
                            description: "The unit of the high limit.",
                          },
                          system: {
                            type: "string",
                            description: "The code system.",
                          },
                          code: {
                            type: "string",
                            description: "The code.",
                          },
                        },
                      },
                    },
                  },
                },
                component: {
                  type: "array",
                  description:
                    "The components of the observation. If none provided, do not include this field.",
                  items: {
                    type: "object",
                    properties: {
                      code: {
                        type: "object",
                        description: "The code of the component.",
                        properties: {
                          coding: {
                            type: "array",
                            description: "The code for the component.",
                            items: {
                              type: "object",
                              properties: {
                                system: {
                                  type: "string",
                                  description: "The code system.",
                                },
                                code: {
                                  type: "string",
                                  description: "The code.",
                                },
                                display: {
                                  type: "string",
                                  description: "The display name.",
                                },
                              },
                            },
                          },
                        },
                      },
                      valueQuantity: {
                        type: "object",
                        description:
                          "The value of the component. If none provided, do not include this field.",
                        properties: {
                          value: {
                            type: "number",
                            description: "The value of the component.",
                          },
                          unit: {
                            type: "string",
                            description: "The unit of the component.",
                          },
                          system: {
                            type: "string",
                            description: "The code system.",
                          },
                          code: {
                            type: "string",
                            description: "The code.",
                          },
                        },
                      },
                    },
                  },
                },

                note: {
                  type: "array",
                  description:
                    "The notes of the observation. If none provided, do not include this field.",
                  items: {
                    type: "object",
                    properties: {
                      text: {
                        type: "string",
                        description: "The text of the note.",
                      },
                    },
                  },
                },
                bodySite: {
                  type: "object",
                  description:
                    "The body site of the observation. If none provided, do not include this field.",
                  properties: {
                    coding: {
                      type: "array",
                      description: "The code for the body site.",
                      items: {
                        type: "object",
                        properties: {
                          system: {
                            type: "string",
                            description: "The code system.",
                          },
                          code: {
                            type: "string",
                            description: "The code.",
                          },
                          display: {
                            type: "string",
                            description: "The display name.",
                          },
                        },
                      },
                    },
                  },
                },
                specimen: {
                  type: "object",
                  description:
                    "The specimen of the observation. If none provided, do not include this field.",
                  properties: {
                    reference: {
                      type: "string",
                      description: "The reference to the specimen.",
                    },
                  },
                },
                device: {
                  type: "object",
                  description:
                    "The device of the observation. If none provided, do not include this field.",
                  properties: {
                    reference: {
                      type: "string",
                      description: "The reference to the device.",
                    },
                  },
                },
                reference: {
                  type: "string",
                  description:
                    "The reference to the observation. If none provided, do not include this field.",
                },
              },
            },
          },
          required: [
            "resource",
            "resourceType",
            "id",
            "status",
            "category",
            "code",
            "subject",
            "effectiveDateTime",
          ],
        },
      },
    },
    required: ["type", "entry"],
  },
} as FunctionDefinition;
