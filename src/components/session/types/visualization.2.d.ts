// Type definitions for MoE Session Visualization (v2 – extended clinical metadata)

export interface SessionAnalysisV2 {
  sessionId: string;
  timestamp: string;
  analysisVersion: number;
  nodes: {
    symptoms?: SymptomNodeV2[];
    diagnoses?: DiagnosisNodeV2[];
    treatments?: TreatmentNodeV2[];
    actions?: ActionNodeV2[];
  };
  userActions?: UserActionV2[];
  metadata?: AnalysisMetadata;
}

// Extended analysis-level metadata for consent, privacy, and STT quality
export interface AnalysisMetadata {
  consent?: "active" | "paused" | "revoked";
  piiRedaction?: boolean;
  sttQuality?: {
    provider?: string;
    confidenceMean?: number; // 0-1
    confidenceMin?: number; // 0-1
    notes?: string;
  };
}

export interface SymptomNodeV2 {
  id: string;
  text: string;
  severity: number; // 1-10
  duration?: number; // minutes
  confidence: number; // 0-1
  source:
    | "transcript"
    | "medical_history"
    | "family_history"
    | "social_history"
    | "medication_history"
    | "suspected";
  quote?: string;
  sttConfidence?: number; // 0-1 for quoted spans
  fromQuestion?: string;
  characteristics?: string[];
  suggestedBy?: string;
  relevance?: number;
  documentId?: string;
  episodeId?: string; // track clinical episodes
  onsetTime?: string; // ISO
  lastUpdated?: string; // ISO
  status?: "active" | "resolved" | "intermittent";
  relationships?: RelationshipV2[];
}

export interface DiagnosisNodeV2 {
  id: string;
  name: string;
  probability: number; // 0-1
  priority: number; // 1-10
  icd10?: string;
  reasoning: string;
  confidence: number; // 0-1
  requiresInvestigation?: boolean;
  suppressed?: boolean;
  suppressionReason?: string;
  redFlags?: string[];
  subtype?: string;
  citations?: Citation[]; // guideline/evidence provenance
  relationships?: RelationshipV2[];
}

export interface TreatmentNodeV2 {
  id: string;
  type:
    | "medication"
    | "procedure"
    | "therapy"
    | "lifestyle"
    | "investigation"
    | "immediate"
    | "referral"
    | "supportive";
  name: string;
  dosage?: string;
  priority: number; // 1-10
  confidence: number; // 0-1
  effectiveness?: number;
  historicalEffectiveness?: number;
  description?: string;
  urgency?: "immediate" | "urgent" | "routine";
  reasoning?: string;
  duration?: string;
  requiresFollowUp?: boolean;
  mechanism?: string;
  contraindications?: string[];
  sideEffects?: string[];
  suppressed?: boolean; // parity with DiagnosisNode
  suppressionReason?: string;
  citations?: Citation[];
  relationships?: RelationshipV2[];
}

export interface ActionNodeV2 {
  id: string;
  text: string;
  category:
    | "symptom_exploration"
    | "diagnostic_clarification"
    | "treatment_selection"
    | "risk_assessment"
    | "drug_interaction"
    | "contraindication"
    | "allergy"
    | "warning"
    | "red_flag";
  actionType: "question" | "alert";
  priority: number; // 1-10
  status: "pending" | "answered" | "acknowledged" | "skipped" | "resolved";
  relationships?: RelationshipV2[];
  impact?: {
    symptoms?: string[];
    diagnoses?: Record<string, number>;
    yes?: Record<string, number>;
    no?: Record<string, number>;
  };
  answer?: string;
  recommendation?: string;
  // Question hygiene & throttling
  doNotAsk?: boolean;
  askedAt?: string; // ISO timestamp of last ask
  snoozeUntil?: string; // ISO
  // Safety governance for alerts
  policy?: "inform" | "notify" | "escalate" | "block";
}

export interface RelationshipV2 {
  nodeId: string;
  relationship:
    | "supports"
    | "contradicts"
    | "confirms"
    | "rules_out"
    | "suggests"
    | "treats"
    | "manages"
    | "prevents"
    | "relieves"
    | "investigates"
    | "clarifies"
    | "explores"
    | "excludes"
    | "reveals"
    | "indicates"
    | "requires"
    | "monitors";
  direction: "incoming" | "outgoing" | "bidirectional";
  strength: number; // 0-1
  reasoning?: string;
}

export interface Citation {
  guideline?: string; // e.g., ATA Hypothyroidism Guideline
  organization?: string; // e.g., American Thyroid Association
  year?: number; // e.g., 2023
  level?: string; // e.g., Level A, Strong recommendation
  url?: string; // optional link
}

export interface UserActionV2 {
  timestamp: string;
  action:
    | "suppress"
    | "accept"
    | "modify"
    | "add_note"
    | "highlight"
    | "question";
  targetId: string;
  reason?: string;
  confidence?: number;
  note?: string;
}

// D3 Sankey types (unchanged from v1, kept for completeness)
export interface SankeyNodeV2 {
  id: string;
  name: string;
  type: "symptom" | "diagnosis" | "treatment" | "question" | "alert";
  column: number;
  priority: number;
  confidence: number;
  probability?: number;
  source?: string;
  data: SymptomNodeV2 | DiagnosisNodeV2 | TreatmentNodeV2 | ActionNodeV2;
  x: number;
  y: number;
  color: string;
  value: number;
  sortIndex?: number;
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  sourceLinks?: SankeyLinkV2[];
  targetLinks?: SankeyLinkV2[];
  index?: number;
}

export interface SankeyLinkV2 {
  source: string | number | SankeyNodeV2;
  target: string | number | SankeyNodeV2;
  value: number;
  type: string;
  strength: number;
  reasoning?: string;
  direction: "incoming" | "outgoing" | "bidirectional";
  width?: number;
  y0?: number;
  y1?: number;
  index?: number;
}

export interface SankeyDataV2 {
  nodes: SankeyNodeV2[];
  links: SankeyLinkV2[];
  metadata: {
    sessionId: string;
    analysisVersion: number;
    timestamp: string;
  } & AnalysisMetadata;
}
