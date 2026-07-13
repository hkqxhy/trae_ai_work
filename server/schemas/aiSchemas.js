const riskLevels = new Set(["low", "medium", "high"]);
const statuses = new Set(["success", "insufficient_input", "blocked", "error"]);

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function normalizeRisk(value, index) {
  const risk = value && typeof value === "object" ? value : {};
  const level = riskLevels.has(risk.level) ? risk.level : "medium";

  return {
    id: asString(risk.id, `ai-risk-${index + 1}`),
    level,
    title: asString(risk.title, "需要人工确认的风险"),
    evidence: asString(risk.evidence, "未提供明确原文依据"),
    explanation: asString(risk.explanation || risk.reason, "模型未提供完整解释"),
    followUpQuestion: asString(risk.followUpQuestion, "请补充更多材料后再判断。"),
  };
}

export function normalizeAiAnalysisResult(value, metadata) {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object");
  }

  const status = statuses.has(value.status) ? value.status : "error";
  const risks = Array.isArray(value.risks) ? value.risks.map(normalizeRisk) : [];
  const result = {
    status,
    conclusion: asString(value.conclusion, status === "success" ? "已完成 AI 补充分析。" : "AI 未能完成分析。"),
    reasons: asStringArray(value.reasons),
    risks,
    missingInformation: asStringArray(value.missingInformation),
    suggestedQuestions: asStringArray(value.suggestedQuestions),
    disclaimer: asString(
      value.disclaimer,
      "AI 结果依赖你提供的信息完整度，仅作租房风险提示，不构成事实认定或法律意见。",
    ),
    metadata: {
      model: metadata.model,
      requestId: metadata.requestId,
      inputModalities: metadata.inputModalities,
      provider: metadata.provider,
      promptVersion: metadata.promptVersion,
      mock: Boolean(metadata.mock),
    },
  };

  if (!result.conclusion) {
    throw new Error("AI response misses conclusion");
  }

  return result;
}

export function normalizeAiNegotiationResult(value, metadata) {
  if (!value || typeof value !== "object") {
    throw new Error("AI negotiation response is not an object");
  }

  const reply = asString(value.reply).trim();
  if (!reply) {
    throw new Error("AI negotiation response misses reply");
  }

  return {
    reply,
    detectedSignals: asStringArray(value.detectedSignals),
    nextQuestions: asStringArray(value.nextQuestions),
    avoidedClaims: asStringArray(value.avoidedClaims),
    disclaimer: asString(
      value.disclaimer,
      "AI 回复仅根据你提供的聊天内容和目标生成，发送前请自行核对，不构成法律意见或事实认定。",
    ),
    metadata: {
      model: metadata.model,
      requestId: metadata.requestId,
      provider: metadata.provider,
      promptVersion: metadata.promptVersion,
      mock: Boolean(metadata.mock),
    },
  };
}

function clampScore(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeCandidateDecision(value, index) {
  const candidate = value && typeof value === "object" ? value : {};

  return {
    candidateId: asString(candidate.candidateId),
    aiScore: clampScore(candidate.aiScore),
    confidence: clampScore(candidate.confidence, 60),
    mainAdvantages: asStringArray(candidate.mainAdvantages),
    mainTradeoffs: asStringArray(candidate.mainTradeoffs),
    suitableWhen: asString(candidate.suitableWhen, "适合在补齐关键信息后再比较。"),
    missingInformation: asStringArray(candidate.missingInformation),
    decisionNote: asString(candidate.decisionNote, `候选 ${index + 1} 需要继续核验。`),
  };
}

export function normalizeAiComparisonResult(value, metadata, expectedCandidateIds = []) {
  if (!value || typeof value !== "object") {
    throw new Error("AI comparison response is not an object");
  }

  const rawCandidates = Array.isArray(value.candidates) ? value.candidates : [];
  const candidates = rawCandidates
    .map(normalizeCandidateDecision)
    .filter((candidate) => candidate.candidateId && expectedCandidateIds.includes(candidate.candidateId));

  expectedCandidateIds.forEach((candidateId) => {
    if (!candidates.some((candidate) => candidate.candidateId === candidateId)) {
      candidates.push({
        candidateId,
        aiScore: 50,
        confidence: 35,
        mainAdvantages: [],
        mainTradeoffs: ["AI 未能稳定返回该房源的独立判断。"],
        suitableWhen: "请先补齐关键信息后再比较。",
        missingInformation: ["AI 未返回该候选的结构化结果"],
        decisionNote: "保留本地规则分作为主要依据。",
      });
    }
  });

  return {
    summary: asString(value.summary, "AI 已完成多房源辅助比较。"),
    candidates,
    rankingRationale: asStringArray(value.rankingRationale),
    globalMissingInformation: asStringArray(value.globalMissingInformation),
    disclaimer: asString(
      value.disclaimer,
      "AI 决策只作为辅助取舍，混合分仍以本地规则为主，不构成房源真实性或签约建议。",
    ),
    metadata: {
      model: metadata.model,
      requestId: metadata.requestId,
      provider: metadata.provider,
      promptVersion: metadata.promptVersion,
      mock: Boolean(metadata.mock),
      localWeight: metadata.localWeight,
      aiWeight: metadata.aiWeight,
    },
  };
}
