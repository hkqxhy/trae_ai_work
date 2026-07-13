import {
  AI_DECISION_WEIGHT,
  COMPARISON_PROMPT_VERSION,
  LOCAL_DECISION_WEIGHT,
  buildComparisonMessages,
} from "../prompts/comparisonPrompt.js";
import { callComparisonAiProvider } from "./aiProvider.js";

function sanitizeCandidate(candidate) {
  return {
    candidateId: String(candidate.candidateId || ""),
    title: String(candidate.title || "").slice(0, 120),
    sourceLabel: String(candidate.sourceLabel || "").slice(0, 120),
    note: String(candidate.note || "").slice(0, 500),
    comparison: candidate.comparison || {},
    scanSummary: {
      level: candidate.scanResult?.level,
      score: candidate.scanResult?.score,
      verdict: candidate.scanResult?.verdict,
      recommendation: candidate.scanResult?.recommendation,
      risks: Array.isArray(candidate.scanResult?.risks)
        ? candidate.scanResult.risks.slice(0, 8).map((risk) => ({
            level: risk.level,
            title: risk.title,
            reason: risk.reason,
          }))
        : [],
    },
    localScore: candidate.localScore || null,
  };
}

export async function generateComparisonAiDecision({ body, config, requestId }) {
  const rawCandidates = Array.isArray(body?.candidates) ? body.candidates : [];
  const candidates = rawCandidates.slice(0, 8).map(sanitizeCandidate).filter((candidate) => candidate.candidateId);
  const expectedCandidateIds = candidates.map((candidate) => candidate.candidateId);

  const metadata = {
    provider: config.provider,
    model: config.provider === "qwen" ? config.qwen.model : "mock-renting-radar",
    requestId,
    promptVersion: COMPARISON_PROMPT_VERSION,
    localWeight: LOCAL_DECISION_WEIGHT,
    aiWeight: AI_DECISION_WEIGHT,
  };

  const safeInput = {
    profile: body?.profile ?? null,
    candidates,
  };

  return callComparisonAiProvider({
    config,
    messages: buildComparisonMessages(safeInput),
    input: safeInput,
    metadata,
    expectedCandidateIds,
  });
}
