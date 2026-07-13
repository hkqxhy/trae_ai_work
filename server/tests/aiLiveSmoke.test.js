import assert from "node:assert/strict";
import { loadAiConfig } from "../config/aiConfig.js";
import { analyzeListing } from "../services/listingAiService.js";
import { generateNegotiationAiReply } from "../services/negotiationAiService.js";
import { generateComparisonAiDecision } from "../services/comparisonAiService.js";

const config = loadAiConfig();

if (config.provider !== "qwen") {
  console.log("Skip live AI smoke test: set AI_PROVIDER=qwen to enable it.");
  process.exit(0);
}

if (!config.qwen.apiKey) {
  console.log("Skip live AI smoke test: set QWEN_API_KEY or DASHSCOPE_API_KEY to enable it.");
  process.exit(0);
}

const result = await analyzeListing({
  config,
  requestId: "live-smoke",
  body: {
    listing: {
      mode: "text",
      text: "房源月租 3200，押一付一，可先看合同，费用包含物业，水电按民用结算。",
      url: "",
      imageNotes: "",
      images: [],
    },
    localRuleResult: {
      score: 82,
      level: "low",
    },
  },
});

assert.ok(["success", "insufficient_input"].includes(result.status));
assert.equal(result.metadata.provider, "qwen");
assert.equal(result.metadata.mock, false);
assert.equal(result.metadata.requestId, "live-smoke");

const negotiation = await generateNegotiationAiReply({
  config,
  requestId: "live-negotiation-smoke",
  body: {
    negotiation: {
      message: "中介说：这套房今天很多人看，你要是确定就先转 1000 元定金，我帮你锁房。合同等签约当天再看。",
      goal: "不先转定金，要求先看合同和身份材料",
      style: "firm",
    },
    localRuleResult: {
      scenario: "deposit",
      scenarioLabel: "定金与催付款",
      reply: "规则回复",
      detectedSignals: ["对方要求在完整核验前付款"],
      nextQuestions: ["收款方和签约主体是否一致？", "定金可退条件能否写入书面协议？"],
    },
  },
});

assert.ok(negotiation.reply.length > 20);
assert.equal(negotiation.metadata.provider, "qwen");
assert.equal(negotiation.metadata.mock, false);
assert.equal(negotiation.metadata.requestId, "live-negotiation-smoke");

const comparison = await generateComparisonAiDecision({
  config,
  requestId: "live-comparison-smoke",
  body: {
    profile: {
      city: "杭州",
      monthlyBudgetMin: 2500,
      monthlyBudgetMax: 3600,
      maxCommuteMinutes: 45,
      preferences: [
        { label: "靠近地铁", level: "must" },
        { label: "夜间安静", level: "must" },
      ],
    },
    candidates: [
      {
        candidateId: "live-a",
        title: "朝南一居室",
        sourceLabel: "文字输入",
        note: "周末约看",
        comparison: { monthlyRent: 3200, totalMonthlyCost: 3400, commuteMinutes: 32, metroDistanceMeters: 780 },
        scanResult: { score: 86, level: "low", verdict: "较稳妥", recommendation: "可继续约看", risks: [] },
        localScore: { score: 84, budgetScore: 92, commuteScore: 96, riskScore: 86, completenessScore: 80 },
      },
      {
        candidateId: "live-b",
        title: "急转公寓",
        sourceLabel: "链接房源",
        note: "价格低但催定金",
        comparison: { monthlyRent: 2100, commuteMinutes: 55 },
        scanResult: {
          score: 42,
          level: "high",
          verdict: "高风险",
          recommendation: "不建议付款",
          risks: [{ level: "high", title: "催定金", reason: "要求看合同前先转定金" }],
        },
        localScore: { score: 48, budgetScore: 58, commuteScore: 35, riskScore: 42, completenessScore: 40 },
      },
    ],
  },
});

assert.equal(comparison.metadata.provider, "qwen");
assert.equal(comparison.metadata.mock, false);
assert.equal(comparison.metadata.requestId, "live-comparison-smoke");
assert.equal(comparison.candidates.length, 2);
assert.ok(comparison.candidates.every((candidate) => Number.isInteger(candidate.aiScore)));

console.log("AI live smoke test passed");
