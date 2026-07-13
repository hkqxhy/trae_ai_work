import assert from "node:assert/strict";
import { loadAiConfig } from "../config/aiConfig.js";
import { analyzeListing } from "../services/listingAiService.js";
import { generateNegotiationAiReply } from "../services/negotiationAiService.js";
import { generateComparisonAiDecision } from "../services/comparisonAiService.js";

const config = loadAiConfig({
  AI_PROVIDER: "mock",
  AI_RATE_LIMIT_PER_MINUTE: "10",
  AI_MAX_TEXT_LENGTH: "20000",
  AI_MAX_IMAGES: "6",
  AI_MAX_IMAGE_SIZE_MB: "8",
});

const highRisk = await analyzeListing({
  config,
  requestId: "test-high-risk",
  body: {
    listing: {
      mode: "text",
      text: "今天很多人看，先转 1000 定金锁房，合同签约当天再看，定金不退。",
      url: "",
      imageNotes: "",
      images: [],
    },
    profile: { city: "杭州" },
    localRuleResult: { score: 42, level: "high" },
  },
});

assert.equal(highRisk.status, "success");
assert.equal(highRisk.metadata.mock, true);
assert.equal(highRisk.risks[0].level, "high");
assert.equal(highRisk.metadata.requestId, "test-high-risk");

const empty = await analyzeListing({
  config,
  requestId: "test-empty",
  body: {
    listing: { mode: "text", text: "", url: "", imageNotes: "", images: [] },
  },
});

assert.equal(empty.status, "insufficient_input");
assert.deepEqual(empty.risks, []);

const redacted = await analyzeListing({
  config,
  requestId: "test-redact",
  body: {
    listing: {
      mode: "text",
      text: "联系人张先生，电话 13812345678，先转定金。",
      url: "",
      imageNotes: "",
      images: [],
    },
  },
});

assert.ok(!JSON.stringify(redacted).includes("13812345678"));

const negotiation = await generateNegotiationAiReply({
  config,
  requestId: "test-negotiation",
  body: {
    negotiation: {
      message: "中介说今天很多人看，要先转 1000 元定金锁房，合同签约当天再看。",
      goal: "不先转定金，要求先看合同和身份材料",
      style: "firm",
    },
    localRuleResult: {
      scenario: "deposit",
      scenarioLabel: "定金与催付款",
      reply: "规则回复",
      detectedSignals: ["对方要求在完整核验前付款"],
      nextQuestions: ["收款方和签约主体是否一致？"],
    },
  },
});

assert.equal(negotiation.metadata.mock, true);
assert.ok(negotiation.reply.includes("不会"));
assert.ok(negotiation.avoidedClaims.length >= 1);

const comparison = await generateComparisonAiDecision({
  config,
  requestId: "test-comparison",
  body: {
    profile: {
      city: "杭州",
      monthlyBudgetMin: 2500,
      monthlyBudgetMax: 3600,
      maxCommuteMinutes: 45,
    },
    candidates: [
      {
        candidateId: "candidate-a",
        title: "朝南一居室",
        sourceLabel: "文字输入",
        comparison: { monthlyRent: 3200, totalMonthlyCost: 3400, commuteMinutes: 32 },
        scanResult: { score: 86, level: "low", risks: [] },
        localScore: { score: 84, budgetScore: 92, commuteScore: 96, riskScore: 86, completenessScore: 80 },
      },
      {
        candidateId: "candidate-b",
        title: "急转公寓",
        sourceLabel: "链接房源",
        comparison: { monthlyRent: 2100, commuteMinutes: 55 },
        scanResult: { score: 42, level: "high", risks: [{ level: "high", title: "催定金", reason: "先转定金" }] },
        localScore: { score: 48, budgetScore: 58, commuteScore: 35, riskScore: 42, completenessScore: 40 },
      },
    ],
  },
});

assert.equal(comparison.metadata.mock, true);
assert.equal(comparison.metadata.localWeight, 0.75);
assert.equal(comparison.metadata.aiWeight, 0.25);
assert.equal(comparison.candidates.length, 2);
assert.ok(comparison.candidates.every((candidate) => candidate.aiScore >= 0 && candidate.aiScore <= 100));

console.log("AI mock contract tests passed");
