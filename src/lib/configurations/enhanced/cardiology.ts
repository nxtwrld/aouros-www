// Enhanced Cardiology Report Schema - Specialized extraction for cardiac evaluations
// Focuses on ECG findings, echocardiograms, cardiac catheterization, and stress tests

import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export const cardiologySchema: FunctionDefinition = {
  name: "cardiology_report_analysis",
  description: "Extract comprehensive cardiac findings from cardiology reports and studies",
  parameters: {
    type: "object",
    properties: {
      studyType: {
        type: "string",
        enum: ["ecg", "echocardiogram", "stress_test", "cardiac_catheterization", "holter", "event_monitor", "cardiac_mri", "cardiac_ct", "nuclear_stress"],
        description: "Type of cardiac study performed",
      },
      ecgFindings: {
        type: "object",
        description: "Electrocardiogram findings",
        properties: {
          rhythm: {
            type: "string",
            description: "Cardiac rhythm (sinus, atrial fibrillation, etc.)",
          },
          rate: {
            type: "number",
            description: "Heart rate in beats per minute",
          },
          intervals: {
            type: "object",
            properties: {
              pr: { type: "number", description: "PR interval in ms" },
              qrs: { type: "number", description: "QRS duration in ms" },
              qt: { type: "number", description: "QT interval in ms" },
              qtc: { type: "number", description: "Corrected QT interval in ms" },
            },
            description: "ECG intervals",
          },
          axis: {
            type: "string",
            description: "QRS axis (normal, left, right, extreme)",
          },
          abnormalities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                finding: { type: "string" },
                location: { type: "string" },
                severity: { type: "string" },
                clinical_significance: { type: "string" },
              },
            },
            description: "ECG abnormalities identified",
          },
          stSegmentChanges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["elevation", "depression", "normal"] },
                leads: { type: "array", items: { type: "string" } },
                magnitude: { type: "string" },
                morphology: { type: "string" },
              },
            },
            description: "ST segment changes",
          },
          tWaveChanges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["inversion", "flattening", "tall", "normal"] },
                leads: { type: "array", items: { type: "string" } },
                pattern: { type: "string" },
              },
            },
            description: "T wave abnormalities",
          },
        },
      },
      echoFindings: {
        type: "object",
        description: "Echocardiogram findings",
        properties: {
          leftVentricle: {
            type: "object",
            properties: {
              ejectionFraction: { type: "number", description: "LV ejection fraction %" },
              wallMotion: { type: "string", description: "Wall motion assessment" },
              dimensions: {
                type: "object",
                properties: {
                  lved: { type: "number", description: "LV end-diastolic dimension" },
                  lves: { type: "number", description: "LV end-systolic dimension" },
                  lvpw: { type: "number", description: "LV posterior wall thickness" },
                  ivs: { type: "number", description: "Interventricular septum thickness" },
                },
              },
              diastolicFunction: {
                type: "object",
                properties: {
                  grade: { type: "string", description: "Diastolic dysfunction grade" },
                  eA_ratio: { type: "number", description: "E/A ratio" },
                  deceleration_time: { type: "number", description: "E wave deceleration time" },
                  lateral_e_prime: { type: "number", description: "Lateral e' velocity" },
                },
              },
            },
            description: "Left ventricular assessment",
          },
          rightVentricle: {
            type: "object",
            properties: {
              function: { type: "string", description: "RV function assessment" },
              dimensions: { type: "string", description: "RV size assessment" },
              systolicPressure: { type: "number", description: "Estimated RV systolic pressure" },
              tapse: { type: "number", description: "TAPSE measurement" },
            },
            description: "Right ventricular assessment",
          },
          atria: {
            type: "object",
            properties: {
              leftAtrialSize: { type: "string", description: "Left atrial size" },
              rightAtrialSize: { type: "string", description: "Right atrial size" },
              laVolume: { type: "number", description: "Left atrial volume" },
            },
            description: "Atrial assessment",
          },
          valves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                valve: { 
                  type: "string", 
                  enum: ["mitral", "aortic", "tricuspid", "pulmonary"],
                  description: "Valve name",
                },
                function: { type: "string", description: "Valve function" },
                stenosis: {
                  type: "object",
                  properties: {
                    present: { type: "boolean" },
                    severity: { type: "string" },
                    gradient: { type: "number" },
                    area: { type: "number" },
                  },
                },
                regurgitation: {
                  type: "object",
                  properties: {
                    present: { type: "boolean" },
                    severity: { type: "string" },
                    mechanism: { type: "string" },
                  },
                },
              },
            },
            description: "Cardiac valve assessment",
          },
        },
      },
      stressTestResults: {
        type: "object",
        description: "Stress test findings",
        properties: {
          testType: {
            type: "string",
            enum: ["exercise", "pharmacologic", "nuclear", "echo"],
            description: "Type of stress test",
          },
          protocol: {
            type: "string",
            description: "Stress test protocol used",
          },
          maxHeartRate: {
            type: "number",
            description: "Maximum heart rate achieved",
          },
          targetHeartRate: {
            type: "number",
            description: "Target heart rate",
          },
          bloodPressureResponse: {
            type: "object",
            properties: {
              baseline: { type: "string" },
              peak: { type: "string" },
              recovery: { type: "string" },
            },
            description: "Blood pressure response during test",
          },
          symptoms: {
            type: "array",
            items: { type: "string" },
            description: "Symptoms during stress test",
          },
          ecgResponse: {
            type: "object",
            properties: {
              stChanges: { type: "boolean" },
              arrhythmias: { type: "boolean" },
              description: { type: "string" },
            },
            description: "ECG changes during stress",
          },
          functionalCapacity: {
            type: "object",
            properties: {
              mets: { type: "number" },
              stage: { type: "string" },
              duration: { type: "number" },
            },
            description: "Functional capacity assessment",
          },
          imaging: {
            type: "object",
            properties: {
              wallMotionAbnormalities: { type: "boolean" },
              perfusionDefects: { type: "boolean" },
              description: { type: "string" },
            },
            description: "Stress imaging findings",
          },
        },
      },
      catheterizationFindings: {
        type: "object",
        description: "Cardiac catheterization findings",
        properties: {
          hemodynamics: {
            type: "object",
            properties: {
              ra: { type: "number", description: "Right atrial pressure" },
              rv: { type: "string", description: "Right ventricular pressure" },
              pa: { type: "string", description: "Pulmonary artery pressure" },
              pcwp: { type: "number", description: "Pulmonary capillary wedge pressure" },
              ao: { type: "string", description: "Aortic pressure" },
              lv: { type: "string", description: "Left ventricular pressure" },
              co: { type: "number", description: "Cardiac output" },
              ci: { type: "number", description: "Cardiac index" },
            },
            description: "Hemodynamic measurements",
          },
          coronaryAnatomy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                vessel: {
                  type: "string",
                  enum: ["lad", "lcx", "rca", "lm", "diagonal", "marginal", "pda", "pls"],
                  description: "Coronary vessel",
                },
                stenosis: {
                  type: "object",
                  properties: {
                    percentage: { type: "number" },
                    location: { type: "string" },
                    morphology: { type: "string" },
                    severity: { type: "string" },
                  },
                },
                flow: { type: "string", description: "TIMI flow grade" },
                collaterals: { type: "string", description: "Collateral circulation" },
              },
            },
            description: "Coronary artery findings",
          },
          intervention: {
            type: "object",
            properties: {
              performed: { type: "boolean" },
              type: { type: "string", enum: ["pci", "balloon", "stent", "atherectomy"] },
              vessel: { type: "string" },
              stentDetails: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  size: { type: "string" },
                  length: { type: "number" },
                  drugEluding: { type: "boolean" },
                },
              },
              complications: { type: "array", items: { type: "string" } },
              outcome: { type: "string" },
            },
            description: "Interventional procedures performed",
          },
        },
      },
      riskAssessment: {
        type: "object",
        description: "Cardiac risk assessment",
        properties: {
          framinghamScore: { type: "number", description: "Framingham risk score" },
          riskFactors: {
            type: "array",
            items: { type: "string" },
            description: "Cardiac risk factors identified",
          },
          functionalClass: {
            type: "string",
            enum: ["nyha_i", "nyha_ii", "nyha_iii", "nyha_iv"],
            description: "NYHA functional class",
          },
          ccsClass: {
            type: "string",
            enum: ["ccs_0", "ccs_i", "ccs_ii", "ccs_iii", "ccs_iv"],
            description: "Canadian Cardiovascular Society angina class",
          },
        },
      },
      diagnosis: {
        type: "object",
        description: "Cardiac diagnosis",
        properties: {
          primary: { type: "string", description: "Primary cardiac diagnosis" },
          secondary: {
            type: "array",
            items: { type: "string" },
            description: "Secondary diagnoses",
          },
          severity: { type: "string", description: "Disease severity" },
          acuity: { type: "string", enum: ["acute", "chronic", "acute_on_chronic"] },
        },
        required: ["primary"],
      },
      recommendations: {
        type: "object",
        description: "Clinical recommendations",
        properties: {
          medications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                medication: { type: "string" },
                indication: { type: "string" },
                dosing: { type: "string" },
              },
            },
            description: "Medication recommendations",
          },
          lifestyle: {
            type: "array",
            items: { type: "string" },
            description: "Lifestyle modifications",
          },
          followUp: {
            type: "object",
            properties: {
              interval: { type: "string" },
              tests: { type: "array", items: { type: "string" } },
              specialist: { type: "string" },
            },
            description: "Follow-up recommendations",
          },
          procedures: {
            type: "array",
            items: { type: "string" },
            description: "Recommended procedures",
          },
        },
      },
      quality: {
        type: "object",
        description: "Study quality metrics",
        properties: {
          imageQuality: {
            type: "string",
            enum: ["excellent", "good", "fair", "poor"],
            description: "Image quality assessment",
          },
          technicalLimitations: {
            type: "array",
            items: { type: "string" },
            description: "Technical limitations affecting interpretation",
          },
          clinicalCorrelation: {
            type: "string",
            description: "Clinical correlation recommendations",
          },
        },
      },
    },
    required: ["studyType", "diagnosis"],
  },
};

export default cardiologySchema;