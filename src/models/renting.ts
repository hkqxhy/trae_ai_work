export type AppRouteId =
  | "overview"
  | "profile"
  | "scan"
  | "candidates"
  | "compare"
  | "checklist"
  | "negotiate"
  | "contract"
  | "demo";

export type PriorityLevel = "must" | "preferred" | "flexible";

export interface UserPreference {
  id: string;
  label: string;
  level: PriorityLevel;
}

export interface RentingProfile {
  city: string;
  commuteTarget: string;
  monthlyBudgetMin: number;
  monthlyBudgetMax: number;
  maxCommuteMinutes: number;
  acceptsSharedHousing: boolean;
  preferences: UserPreference[];
}

export type SourceType = "landlord" | "agent" | "sublessor" | "apartment" | "unknown";

export interface ListingCost {
  rent: number;
  deposit: string;
  agencyFee?: string;
  extraFees?: string[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface ListingRisk {
  id: string;
  level: RiskLevel;
  title: string;
  reason: string;
  followUpQuestion: string;
}

export interface ListingScanFact {
  label: string;
  value: string;
}

export type ScanInputMode = "text" | "link" | "image";

export interface ImageScanInput {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  /** Transient data URL used only for the current AI request; never persist it. */
  dataUrl?: string;
}

export interface ListingScanInput {
  mode: ScanInputMode;
  text: string;
  url: string;
  imageNotes: string;
  images: ImageScanInput[];
}

export interface ListingScanResult {
  score: number;
  level: RiskLevel;
  verdict: string;
  recommendation: string;
  risks: ListingRisk[];
  followUpQuestions: string[];
  detectedFacts: ListingScanFact[];
  profileNotes: string[];
  modalityNotes: string[];
  aiPromptDraft: string;
}

export interface CandidateListing {
  id: string;
  title: string;
  sourceLabel: string;
  createdAt: string;
  note: string;
  comparison: CandidateComparison;
  scanInput: ListingScanInput;
  scanResult: ListingScanResult;
}

export interface CandidateComparison {
  monthlyRent?: number;
  totalMonthlyCost?: number;
  upfrontCost?: number;
  commuteMinutes?: number;
  metroDistanceMeters?: number;
}

export interface CandidateComparisonScore {
  score: number;
  budgetScore: number;
  commuteScore: number;
  riskScore: number;
  completenessScore: number;
  isComparable: boolean;
  missingFields: string[];
  requiredMissingFields: string[];
  explanation: string[];
}

export type ViewingChecklistCategory =
  | "identity"
  | "cost"
  | "condition"
  | "environment"
  | "evidence";

export interface ViewingChecklistItem {
  id: string;
  category: ViewingChecklistCategory;
  title: string;
  method: string;
  warningSign: string;
}

export type NegotiationReplyStyle = "gentle" | "firm" | "inquisitive";

export interface NegotiationStyleOption {
  id: NegotiationReplyStyle;
  label: string;
  description: string;
  principles: string[];
}

export type NegotiationScenario =
  | "deposit"
  | "fees"
  | "contract"
  | "identity"
  | "termination"
  | "general";

export interface NegotiationReplyResult {
  scenario: NegotiationScenario;
  scenarioLabel: string;
  reply: string;
  detectedSignals: string[];
  nextQuestions: string[];
}

export type ContractRiskCategory = "deposit" | "breach" | "fee" | "repair";

export interface ContractRiskFinding {
  id: string;
  category: ContractRiskCategory;
  level: RiskLevel;
  title: string;
  evidence: string;
  reason: string;
  followUpQuestion: string;
}

export interface ContractScanResult {
  level: RiskLevel;
  summary: string;
  findings: ContractRiskFinding[];
  followUpQuestions: string[];
  detectedFacts: string[];
}

export interface RentalListing {
  id: string;
  title: string;
  district: string;
  sourceType: SourceType;
  commuteMinutes?: number;
  metroDistanceMeters?: number;
  cost: ListingCost;
  risks: ListingRisk[];
  recommendationScore?: number;
}

export interface RouteConfig {
  id: AppRouteId;
  label: string;
  description: string;
}
