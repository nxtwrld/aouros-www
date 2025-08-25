import type { FunctionDefinition } from "@langchain/core/language_models/base";
export default {
  name: "extractor",
  description: `Proceed step by step. 
    Step 1: 
    Your input is a set of images of most probably a medical report or reports. 
    Your task is to extract all text from the image as plain markdown documents. Each image is page from the document.
    Step 2:
    Assess that all pages are from the same document or multiple documents. I multiple documents are detected, we will mark the invidual documents and the pages they consist of.
    Step 3: if the page contains other data then text, like images, schemas or photos, extract that area and list them here. If the page is a DICOM image, list the image here. If the page is a photo, list the photo here.
    `,
  parameters: {
    type: "object",
    properties: {
      pages: {
        type: "array",
        description:
          "List of pages in the document. Each page is a separate image. The order of the pages is the initial order of the images.",
        items: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              description: "Page number in the document. The first page is 1.",
            },

            text: {
              type: "string",
              description: `
                            Proceed step by step: 
                            1. Asssess the image, identify, headings, footer, tables and paragraphs.
                            2. Extracted all text from the page in markdown format. Respect the layout and formatting of the original document.  
                            3. Proofread the text and correct any typing errors or errors created by noise in the original image scan.
                            `,
            },
            images: {
              type: "array",
              description: `
                                Proceed step by step:
                                1. detect any image data besides text on the page.
                                2. Extract the image data and list it here. If the image is a photo, schema or DICOM image, list it here.
                                3. Extract the position and size of the image in the page. The top left corner is 0,0 and our units are percetages of the page size.
                            `,
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["dicom", "photo", "schema"],
                    description:
                      "Type of the image. If it is a schema, photo or DICOM image.",
                  },
                  position: {
                    type: "object",
                    properties: {
                      x: {
                        type: "integer",
                        description:
                          "X coordinate of the image in the page. The top left corner is 0.",
                      },
                      y: {
                        type: "integer",
                        description:
                          "Y coordinate of the image in the page. The top left corner is 0.",
                      },
                      width: {
                        type: "integer",
                        description: "Width of the image in pixels.",
                      },
                      height: {
                        type: "integer",
                        description: "Height of the image in pixels.",
                      },
                    },
                  },
                  data: {
                    type: "string",
                    description: "base64 encoded image",
                  },
                },
              },
            },
          },
          required: ["page", "text", "language"],
        },
      },
      documents: {
        type: "array",
        description:
          "List of documents detected in the pages We want to split the pages into sets, if there are multiple documents detected. If there is only one document, list it here.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description:
                "Title of the document in the original language of the document.",
            },
            date: {
              type: "string",
              description: "Date of the document. Use the ISO 8601 format.",
            },
            language: {
              type: "string",
              description: "Language of the text. Use the ISO 639-1 code.",
            },
            isMedical: {
              type: "boolean",
              description:
                "Is it a medical report, lab results or DICOM type image? true/false.",
            },
            isMedicalImaging: {
              type: "boolean",
              description:
                "Is this a medical imaging scan (X-ray, MRI, CT, ultrasound, mammography, PET, nuclear medicine, etc.)? This is for actual medical images showing anatomical structures, not text-based medical documents. true/false.",
            },
            pages: {
              type: "array",
              description:
                "List of pages in the document. Each page is a separate image. The order of the pages is the initial order of the images.",
              items: {
                type: "integer",
                description:
                  "Page number in the document. The first page is 1.",
              },
            },
          },
          required: [
            "title",
            "date",
            "language",
            "isMedical",
            "isMedicalImaging",
            "pages",
          ],
        },
      },
    },
    required: ["pages", "documents"],
  },
} as FunctionDefinition;
