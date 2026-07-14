import { ApiError } from "../utils/httpErrors.js";
import {
  normalizeAiAnalysisResult,
  normalizeAiComparisonResult,
  normalizeAiNegotiationResult,
} from "../schemas/aiSchemas.js";

function extractJsonObject(text) {
  if (!text) {
    throw new Error("empty response");
  }

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("response is not valid JSON");
  }
}

function createMockListingResult(input, metadata) {
  const text = [input.text, input.url, input.imageNotes].filter(Boolean).join("\n");
  const hasImages = input.images.some((image) => image.dataUrl);
  const highRisk = /定金|不退|先转|身份证|合同.*后|押金不退|服务费|管理费|中介费|隔断|转租/.test(text);

  const result = highRisk
    ? {
        status: "success",
        conclusion: "演示数据：AI 补充认为该房源存在需要优先核验的付款、合同或身份风险。",
        reasons: [
          "输入中出现了容易产生纠纷的付款或合同表述。",
          "本地规则结果已经给出风险基线，AI 仅补充语义层面的追问方向。",
          ...(hasImages ? ["当前为 Mock 模式，未调用真实视觉模型；图片已进入请求链路但不会据此生成视觉结论。"] : []),
        ],
        risks: [
          {
            id: "mock-payment-contract-risk",
            level: "high",
            title: "付款与合同顺序需要核验",
            evidence: text.match(/.{0,10}(定金|先转|合同.*后|押金不退).{0,18}/)?.[0] || "输入中提到付款或合同安排",
            explanation: "看房、身份和合同条款未确认前要求付款，可能导致退款和责任边界不清。",
            followUpQuestion: "能否先提供产权或授权证明、合同模板、费用明细，并约定未签约时定金是否退还？",
          },
        ],
        missingInformation: ["发布者身份材料", "完整费用明细", "合同模板或退款条款"],
        suggestedQuestions: [
          "请问押金、定金、中介费和服务费分别是多少，什么情况下可退？",
          "能否在付款前先看合同模板和房屋权属或授权证明？",
        ],
        disclaimer: `这是 Mock AI 演示数据，依赖输入完整度，仅作租房风险提示，不构成事实认定或法律意见。${hasImages ? "当前 Mock 不会真实读取图片内容。" : ""}`,
      }
    : {
        status: "success",
        conclusion: "演示数据：AI 补充未发现需要升级为高风险的语义线索，但仍建议保留核验流程。",
        reasons: [
          "输入中的费用、合同或身份信息较少，不能据此确认房源安全。",
          ...(hasImages ? ["当前为 Mock 模式，未调用真实视觉模型；配置 QWEN_VL_MODEL 后才会读取图片内容。"] : []),
        ],
        risks: [],
        missingInformation: ["发布者身份", "合同模板", "水电和其他费用结算方式"],
        suggestedQuestions: [
          "能否提供合同模板和费用明细？",
          "水电、物业、网络和维修责任分别如何约定？",
        ],
        disclaimer: `这是 Mock AI 演示数据，依赖输入完整度，仅作租房风险提示，不构成事实认定或法律意见。${hasImages ? "当前 Mock 不会真实读取图片内容。" : ""}`,
      };

  return normalizeAiAnalysisResult(result, { ...metadata, model: "mock-renting-radar", mock: true });
}

async function callQwenJson({ config, messages, model = config.qwen.model }) {
  if (config.provider !== "qwen") {
    throw new ApiError(400, "unsupported_provider", "当前 AI_PROVIDER 暂不支持，请使用 mock 或 qwen。");
  }

  if (!config.qwen.apiKey) {
    throw new ApiError(503, "missing_api_key", "缺少千问 API Key。请在服务端设置 QWEN_API_KEY 或 DASHSCOPE_API_KEY，或切换 AI_PROVIDER=mock。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${config.qwen.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.qwen.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: config.maxOutputTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ApiError(401, "auth_failed", "千问 API 鉴权失败，请检查服务端密钥权限。");
      }
      if (response.status === 429) {
        throw new ApiError(429, "rate_limited", "千问 API 当前限流，请稍后重试。");
      }
      if (response.status === 402 || response.status === 400) {
        throw new ApiError(402, "quota_or_request_error", "千问 API 返回配额或请求错误，请检查账户额度、模型名和输入规模。");
      }
      throw new ApiError(503, "provider_unavailable", "千问 API 暂时不可用，请稍后重试。");
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    return extractJsonObject(content);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error?.name === "AbortError") {
      throw new ApiError(504, "timeout", "千问 API 请求超时，请稍后重试或切换 Mock 模式。");
    }

    throw new ApiError(503, "provider_unavailable", "AI 服务暂时不可用，请稍后重试。本地规则结果仍可继续使用。");
  } finally {
    clearTimeout(timeout);
  }
}

function createMockNegotiationResult(input, metadata) {
  const question = input.localRuleResult?.nextQuestions?.[0] || "能否先补充完整费用、合同和身份材料？";
  const style = input.style;
  const reply =
    style === "firm"
      ? `我这边需要先把关键信息确认清楚，暂时不会在合同、身份和费用明细未核验前付款或承诺签约。我的目标是${input.goal}。请先确认：${question}相关内容形成书面记录后，我再决定是否继续。`
      : style === "inquisitive"
        ? `我还需要再确认一些细节，再决定下一步。我的目标是${input.goal}。请问：${question}也麻烦把对应材料或费用明细一并发我，我核对后再回复你，谢谢。`
        : `谢谢说明，我对房源仍有兴趣。为了稳妥推进，我希望先${input.goal}。麻烦帮我确认：${question}信息核对清楚后，我会尽快给你答复，谢谢。`;

  return normalizeAiNegotiationResult(
    {
      reply,
      detectedSignals: input.localRuleResult?.detectedSignals || ["演示数据：已根据输入生成沟通回复。"],
      nextQuestions: input.localRuleResult?.nextQuestions || [question],
      avoidedClaims: ["未声称对方欺诈或违法", "未承诺付款或签约", "未捏造合同、身份或费用事实"],
      disclaimer: "这是 Mock AI 演示回复，发送前请自行核对事实和语气。",
    },
    { ...metadata, model: "mock-renting-radar", mock: true },
  );
}

function createMockComparisonResult(input, metadata, expectedCandidateIds) {
  const candidates = input.candidates.map((candidate) => {
    const localScore = Number(candidate.localScore?.score) || Number(candidate.scanSummary?.score) || 50;
    const riskPenalty = candidate.scanSummary?.level === "high" ? 18 : candidate.scanSummary?.level === "medium" ? 8 : 0;
    const missingPenalty = Number(candidate.localScore?.completenessScore) < 60 ? 10 : 0;
    const aiScore = Math.max(25, Math.min(95, Math.round(localScore - riskPenalty - missingPenalty + 8)));

    return {
      candidateId: candidate.candidateId,
      aiScore,
      confidence: Number(candidate.localScore?.completenessScore) >= 80 ? 82 : 58,
      mainAdvantages: [
        candidate.localScore?.budgetScore >= 80 ? "费用与预算匹配度较好" : "可继续与其他候选横向比较",
        candidate.localScore?.commuteScore >= 80 ? "通勤条件较符合画像" : "仍需确认通勤可持续性",
      ],
      mainTradeoffs:
        candidate.scanSummary?.level === "high"
          ? ["扫描结果存在高风险，付款、身份和合同必须先核验"]
          : ["仍需补齐合同、费用和现场居住条件"],
      suitableWhen:
        candidate.scanSummary?.level === "high"
          ? "仅适合在身份、合同和退款规则全部确认后继续考虑。"
          : "适合在补齐费用、通勤和合同细节后作为候选继续比较。",
      missingInformation: Number(candidate.localScore?.completenessScore) < 80 ? ["费用、通勤或地铁距离字段仍不完整"] : [],
      decisionNote: "Mock AI 按软性风险、画像匹配和信息完整度给出辅助判断。",
    };
  });

  return normalizeAiComparisonResult(
    {
      summary: "演示数据：AI 已根据候选房源的软性风险和画像匹配度给出辅助判断。",
      candidates,
      rankingRationale: ["混合策略建议以本地硬指标为主，AI 只参与 25% 的辅助取舍。"],
      globalMissingInformation: ["看房现场条件", "完整合同模板", "发布者身份材料"],
      disclaimer: "这是 Mock AI 演示数据，不构成房源真实性或签约建议。",
    },
    { ...metadata, model: "mock-renting-radar", mock: true },
    expectedCandidateIds,
  );
}

export async function callListingAiProvider({ config, messages, input, metadata }) {
  if (config.provider === "mock") {
    return createMockListingResult(input, metadata);
  }

  const parsed = await callQwenJson({ config, messages, model: metadata.model });

  return normalizeAiAnalysisResult(parsed, {
    ...metadata,
    provider: "qwen",
    model: config.qwen.model,
    mock: false,
  });
}

export async function callNegotiationAiProvider({ config, messages, input, metadata }) {
  if (config.provider === "mock") {
    return createMockNegotiationResult(input, metadata);
  }

  const parsed = await callQwenJson({ config, messages });

  return normalizeAiNegotiationResult(parsed, {
    ...metadata,
    provider: "qwen",
    model: config.qwen.model,
    mock: false,
  });
}

export async function callComparisonAiProvider({ config, messages, input, metadata, expectedCandidateIds }) {
  if (config.provider === "mock") {
    return createMockComparisonResult(input, metadata, expectedCandidateIds);
  }

  const parsed = await callQwenJson({ config, messages });

  return normalizeAiComparisonResult(
    parsed,
    {
      ...metadata,
      provider: "qwen",
      model: config.qwen.model,
      mock: false,
    },
    expectedCandidateIds,
  );
}
