import type {
  AiAnalysisResult,
  AiApiError,
  AiComparisonResult,
  AiNegotiationResult,
  ComparisonAiDecisionRequest,
  ListingAiAnalysisRequest,
  NegotiationAiReplyRequest,
} from "../models/ai";

interface ListingAiAnalysisResponse {
  ok: boolean;
  result?: AiAnalysisResult;
  error?: AiApiError;
}

export async function requestListingAiAnalysis(
  payload: ListingAiAnalysisRequest,
  signal?: AbortSignal,
): Promise<AiAnalysisResult> {
  const response = await fetch("/api/ai/listing-analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      listing: {
        ...payload.listing,
        images: payload.listing.images.map((image) => ({
          name: image.name,
          size: image.size,
          type: image.type,
        })),
      },
    }),
    signal,
  });

  let data: ListingAiAnalysisResponse | null = null;
  try {
    data = (await response.json()) as ListingAiAnalysisResponse;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok || !data.result) {
    const fallbackMessage =
      response.status === 0
        ? "AI 服务连接失败，本地规则结果仍可继续使用。"
        : "AI 服务暂时不可用，本地规则结果仍可继续使用。";
    const error = new Error(data?.error?.message || fallbackMessage) as Error & { details?: AiApiError };
    error.details = data?.error ?? { code: "network_error", message: fallbackMessage };
    throw error;
  }

  return data.result;
}

interface NegotiationAiReplyResponse {
  ok: boolean;
  result?: AiNegotiationResult;
  error?: AiApiError;
}

export async function requestNegotiationAiReply(
  payload: NegotiationAiReplyRequest,
  signal?: AbortSignal,
): Promise<AiNegotiationResult> {
  const response = await fetch("/api/ai/negotiation-reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  let data: NegotiationAiReplyResponse | null = null;
  try {
    data = (await response.json()) as NegotiationAiReplyResponse;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok || !data.result) {
    const fallbackMessage = "AI 回复服务暂时不可用，本地规则回复仍可继续使用。";
    const error = new Error(data?.error?.message || fallbackMessage) as Error & { details?: AiApiError };
    error.details = data?.error ?? { code: "network_error", message: fallbackMessage };
    throw error;
  }

  return data.result;
}

interface ComparisonAiDecisionResponse {
  ok: boolean;
  result?: AiComparisonResult;
  error?: AiApiError;
}

export async function requestComparisonAiDecision(
  payload: ComparisonAiDecisionRequest,
  signal?: AbortSignal,
): Promise<AiComparisonResult> {
  const response = await fetch("/api/ai/comparison-explanation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  let data: ComparisonAiDecisionResponse | null = null;
  try {
    data = (await response.json()) as ComparisonAiDecisionResponse;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok || !data.result) {
    const fallbackMessage = "AI 决策服务暂时不可用，本地对比评分仍可继续使用。";
    const error = new Error(data?.error?.message || fallbackMessage) as Error & { details?: AiApiError };
    error.details = data?.error ?? { code: "network_error", message: fallbackMessage };
    throw error;
  }

  return data.result;
}
