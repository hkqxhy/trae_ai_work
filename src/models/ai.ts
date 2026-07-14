import type {
  CandidateComparisonScore,
  CandidateListing,
  ListingScanInput,
  ListingScanResult,
  NegotiationReplyResult,
  NegotiationReplyStyle,
  RentingProfile,
  RiskLevel,
} from "./renting";

export type AiRequestStatus = "idle" | "loading" | "success" | "insufficient_input" | "error";

export type AiErrorCode =
  | "auth_failed"
  | "invalid_json"
  | "missing_api_key"
  | "network_error"
  | "payload_too_large"
  | "provider_unavailable"
  | "quota_or_request_error"
  | "rate_limited"
  | "timeout"
  | "too_many_images"
  | "image_too_large"
  | "invalid_image_data"
  | "unsupported_media_type"
  | "unsupported_provider"
  | "not_implemented"
  | "internal_error";

export interface AiAnalysisRisk {
  id: string;
  level: RiskLevel;
  title: string;
  evidence: string;
  explanation: string;
  followUpQuestion: string;
}

export interface AiAnalysisResult {
  status: Exclude<AiRequestStatus, "idle" | "loading"> | "blocked";
  conclusion: string;
  reasons: string[];
  risks: AiAnalysisRisk[];
  missingInformation: string[];
  suggestedQuestions: string[];
  disclaimer: string;
  metadata: {
    model: string;
    requestId: string;
    inputModalities: Array<"text" | "image">;
    provider: string;
    promptVersion: string;
    mock: boolean;
  };
}

export interface AiApiError {
  code: AiErrorCode;
  message: string;
  requestId?: string;
}

export interface ListingAiAnalysisRequest {
  listing: ListingScanInput;
  profile: RentingProfile;
  localRuleResult: ListingScanResult;
}

export interface AiNegotiationResult {
  reply: string;
  detectedSignals: string[];
  nextQuestions: string[];
  avoidedClaims: string[];
  disclaimer: string;
  metadata: {
    model: string;
    requestId: string;
    provider: string;
    promptVersion: string;
    mock: boolean;
  };
}

export interface NegotiationAiReplyRequest {
  negotiation: {
    message: string;
    goal: string;
    style: NegotiationReplyStyle;
  };
  localRuleResult: NegotiationReplyResult;
}

export interface AiComparisonCandidateDecision {
  candidateId: string;
  aiScore: number;
  confidence: number;
  mainAdvantages: string[];
  mainTradeoffs: string[];
  suitableWhen: string;
  missingInformation: string[];
  decisionNote: string;
}

export interface AiComparisonResult {
  summary: string;
  candidates: AiComparisonCandidateDecision[];
  rankingRationale: string[];
  globalMissingInformation: string[];
  disclaimer: string;
  metadata: {
    model: string;
    requestId: string;
    provider: string;
    promptVersion: string;
    mock: boolean;
    localWeight: number;
    aiWeight: number;
  };
}

export interface ComparisonAiDecisionRequest {
  profile: RentingProfile;
  candidates: Array<
    Pick<CandidateListing, "id" | "title" | "sourceLabel" | "note" | "comparison" | "scanResult"> & {
      candidateId: string;
      localScore: CandidateComparisonScore;
    }
  >;
}
