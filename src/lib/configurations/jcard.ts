import type { FunctionDefinition } from "@langchain/core/language_models/base";
export default {
  $schemaTransformation: "http://buzzword.org.uk/2008/jCard/transformation.js",
  id: "jCard",
  version: "0.1.0",
  title: "jCard",
  description:
    "This document defines the jCard data format for representing and exchanging a variety of information about an individual (e.g., formatted and structured name and delivery addresses, email address, multiple telephone numbers, photograph, logo, audio clips, etc.).",
  type: "object",
  seeAlso: [
    "http://microformats.org/wiki/jcard",
    "http://microformats.org/wiki/hcard",
    "http://www.ietf.org/internet-drafts/draft-ietf-vcarddav-vcardrev-05.txt",
    "http://www.ietf.org/rfc/rfc2426.txt",
  ],
  properties: {
    adr: {
      optional: true,
      type: "array",
      items: {
        type: "object",
        description:
          "To specify the components of the delivery address for the jCard object.",
        properties: {
          "post-office-box": {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description: "The post office box.",
          },
          "extended-address": {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description:
              "The extended address (e.g. apartment or suite number).",
          },
          "street-address": {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description: "The street address.",
          },
          locality: {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description: "The locality (e.g., city).",
          },
          region: {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description: "The region (e.g., state or province).",
          },
          "postal-code": {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description: "The postal code.",
          },
          "country-name": {
            optional: true,
            type: ["string", "array"],
            items: { type: "string" },
            description: "The country name.",
          },
          type: {
            optional: true,
            type: ["array"],
            items: { type: "string" },
            description:
              'The type can include the type parameter "TYPE" to specify the delivery address type.',
          },
        },
      },
    },
    agent: {
      optional: true,
      type: "array",
      items: {
        type: ["string", "object"],
        description:
          "To specify information about another person who will act on behalf of the individual or resource associated with the jCard. [May be the person's name, URI, or a nested jCard object.]",
      },
    },
    bday: {
      optional: true,
      type: "string",
      description:
        "To specify the birth date of the object the jCard represents.",
      format: ["date", "date-time", "text/plain"],
    },
    birth: {
      optional: true,
      type: ["string", "object"],
      status: "experimental",
      description:
        "To specify the place of birth of the object the jCard represents. [This is usually a string, but may be a nested jCard or an adr or geo structure.]",
    },
    caladruri: {
      optional: true,
      type: "array",
      status: "experimental",
      items: {
        type: "string",
        description:
          "To specify the location to which an event request should be sent for the user.",
        format: "uri",
      },
    },
    caluri: {
      optional: true,
      type: "array",
      status: "experimental",
      items: {
        type: "string",
        description:
          "To specify the URI for a user's calendar in a jCard object.",
        format: "uri",
      },
    },
    categories: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify application category information about the jCard.",
      },
    },
    class: {
      optional: true,
      type: "string",
      description: "To specify the access classification for a jCard object.",
    },
    dday: {
      optional: true,
      type: "string",
      description:
        "To specify the date of death of the object the jCard represents.",
      status: "experimental",
      format: ["date", "date-time", "text/plain"],
    },
    death: {
      optional: true,
      type: ["string", "object"],
      status: "experimental",
      description:
        "To specify the place of death of the object the jCard represents. [This is usually a string, but may be a nested jCard or an adr or geo structure.]",
    },
    email: {
      optional: true,
      type: "array",
      description:
        "To specify the electronic mail address for communication with the object the jCard represents.",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "A single text value.",
            format: "email",
          },
          type: {
            optional: true,
            type: "array",
            description:
              'The type can include the type parameter "TYPE" to specify the format or preference of the electronic mail address.',
            items: { type: "string" },
          },
        },
      },
    },
    fburl: {
      optional: true,
      type: "array",
      status: "experimental",
      items: {
        type: "string",
        description:
          "To specify the URI for a user's busy time in a jCard object.",
        format: "uri",
      },
    },
    fn: {
      type: "string",
      description:
        "To specify the formatted text corresponding to the name of the object the jCard represents.",
    },
    gender: {
      optional: true,
      type: "string",
      status: "experimental",
      description: "To specify the gender of the object the jCard represents.",
    },
    geo: {
      optional: true,
      type: "object",
      description:
        "To specify information related to the global positioning of the object the jCard represents.",
      properties: {
        longitude: {
          type: "number",
          description:
            "The longitude represents the location east and west of the prime meridian as a positive or negative real number, respectively.",
        },
        latitude: {
          type: "number",
          description:
            "The latitude represents the location north and south of the equator as a positive or negative real number, respectively.",
        },
        altitude: {
          optional: true,
          type: "number",
          status: "experimental",
          description: "In metres above sea level.",
        },
      },
    },
    impp: {
      optional: true,
      type: "array",
      status: "experimental",
      description:
        "To specify the URI for instant messaging and presence protocol communications with the object the vCard represents.",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "A single text value.",
            format: "uri",
          },
          type: {
            optional: true,
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    key: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify a public key or authentication certificate associated with the object that the jCard represents.",
      },
    },
    kind: {
      optional: true,
      type: "string",
      status: "experimental",
      description: "To specify the kind of object the jCard represents.",
      default: "individual",
    },
    label: {
      optional: true,
      type: ["array", "string"],
      description:
        "To specify the formatted text corresponding to delivery address of the object the jCard represents.",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "A single text value.",
          },
          type: {
            optional: true,
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    lang: {
      optional: true,
      type: "array",
      status: "experimental",
      items: {
        type: "string",
        description:
          "To specify the language(s) that may be used for contacting the individual associated with the jCard.",
      },
    },
    logo: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify a graphic image of a logo associated with the object the jCard represents.",
        format: "image",
      },
    },
    mailer: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify the type of electronic mail software that is used by the individual associated with the jCard.",
      },
    },
    n: {
      optional: true,
      type: "object",
      description:
        "To specify the components of the name of the object the jCard represents.",
      properties: {
        "family-name": {
          optional: true,
          type: "array",
          items: { type: "string" },
        },
        "given-name": {
          optional: true,
          type: "array",
          items: { type: "string" },
        },
        "additional-name": {
          optional: true,
          type: "array",
          items: { type: "string" },
        },
        "honorific-prefix": {
          optional: true,
          type: "array",
          items: { type: "string" },
        },
        "honorific-suffix": {
          optional: true,
          type: "array",
          items: { type: "string" },
        },
      },
    },
    nickname: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify the text corresponding to the nickname of the object the jCard represents.",
      },
    },
    note: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify supplemental information or a comment that is associated with the jCard.",
      },
    },
    org: {
      optional: true,
      type: "array",
      description:
        "To specify the organizational name and units associated with the jCard.",
      items: {
        type: "object",
        properties: {
          "organization-name": { type: "string" },
          "organization-unit": {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    photo: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify an image or photograph information that annotates some aspect of the object the jCard represents.",
        format: "image",
      },
    },
    related: {
      optional: true,
      type: "array",
      status: "experimental",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
          },
          type: {
            optional: true,
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    rev: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description: "To specify revision information about the current jCard.",
        format: ["date", "date-time"],
      },
    },
    role: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify information concerning the role, occupation, or business category of the object the jCard represents.",
      },
    },
    "sort-string": {
      optional: true,
      type: "string",
      description:
        "To specify the family name or given name text to be used for national-language-specific sorting of the FN and N types.",
    },
    sound: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify a digital sound content information that annotates some aspect of the jCard.  By default this property is used to specify the proper pronunciation of the name property value of the jCard.",
        format: "uri",
      },
    },
    source: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To identify the source of directory information contained in the content type.",
        format: "uri",
      },
    },
    tel: {
      optional: true,
      type: "array",
      description:
        "To specify the telephone number for telephony communication with the object the jCard represents.",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "A single phone-number value.",
            format: "phone",
          },
          type: {
            optional: true,
            type: "array",
            description:
              'The property can include the parameter "TYPE" to specify intended use for the telephone number.',
            items: { type: "string" },
          },
        },
      },
    },
    title: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify the job title, functional position or function of the object the jCard represents.",
      },
    },
    tz: {
      optional: true,
      type: "string",
      description:
        "To specify information related to the time zone of the object the jCard represents.",
    },
    uid: {
      optional: true,
      type: "string",
      description:
        "To specify a value that represents a globally unique identifier corresponding to the individual or resource associated with the jCard.",
    },
    url: {
      optional: true,
      type: "array",
      items: {
        type: "string",
        description:
          "To specify a uniform resource locator associated with the object that the jCard refers to.",
        format: "uri",
      },
    },
  },
} as FunctionDefinition;
