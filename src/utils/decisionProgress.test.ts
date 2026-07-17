import { describe, expect, it } from "vitest";
import type { CandidateListing, RentingProfile, RiskLevel } from "../models/renting";
import { buildDecisionProgress } from "./decisionProgress";

const completeProfile: RentingProfile = {
  city: "杭州",
  commuteTarget: "未来科技城",
  monthlyBudgetMin: 3000,
  monthlyBudgetMax: 4500,
  maxCommuteMinutes: 45,
  acceptsSharedHousing: false,
  preferences: [],
};

function buildCandidate(id: string, level: RiskLevel, complete = true): CandidateListing {
  return {
    id,
    title: `候选 ${id}`,
    sourceLabel: "房东直租",
    createdAt: "2026-07-17T00:00:00.000Z",
    note: "",
    comparison: complete
      ? { monthlyRent: 3200, totalMonthlyCost: 3450, commuteMinutes: 35 }
      : { monthlyRent: 3200 },
    scanInput: { mode: "text", text: "示例房源", url: "", imageNotes: "", images: [] },
    scanResult: {
      score: level === "high" ? 35 : 82,
      level,
      verdict: "测试结果",
      recommendation: "继续核验",
      risks: level === "high"
        ? [{
            id: `risk-${id}`,
            level: "high",
            title: "待核验风险",
            reason: "测试风险",
            followUpQuestion: "请核验",
            verificationStatus: "pending",
          }]
        : [],
      followUpQuestions: [],
      detectedFacts: [],
      profileNotes: [],
      modalityNotes: [],
      aiPromptDraft: "",
    },
  };
}

describe("decision progress", () => {
  it("starts with the profile instead of pretending default data exists", () => {
    const progress = buildDecisionProgress(
      { ...completeProfile, city: "", monthlyBudgetMin: 0, monthlyBudgetMax: 0 },
      [],
    );
    expect(progress.progressPercent).toBe(0);
    expect(progress.primaryAction.route).toBe("profile");
  });

  it("asks for a second candidate before comparison", () => {
    const progress = buildDecisionProgress(completeProfile, [buildCandidate("a", "low")]);
    expect(progress.primaryAction.route).toBe("scan");
    expect(progress.primaryAction.label).toBe("再添加一个候选");
  });

  it("does not count incomplete candidates as comparable", () => {
    const progress = buildDecisionProgress(completeProfile, [
      buildCandidate("a", "low"),
      buildCandidate("b", "medium", false),
    ]);
    expect(progress.comparableCount).toBe(1);
    expect(progress.incompleteCandidateCount).toBe(1);
    expect(progress.primaryAction.route).toBe("compare");
  });

  it("sends comparable high-risk candidates to现场核验", () => {
    const progress = buildDecisionProgress(completeProfile, [
      buildCandidate("a", "low"),
      buildCandidate("b", "high"),
    ]);
    expect(progress.progressPercent).toBe(67);
    expect(progress.highRiskCount).toBe(1);
    expect(progress.primaryAction.route).toBe("checklist");
  });

  it("moves a viewed candidate to contract review", () => {
    const candidates = [buildCandidate("a", "low"), buildCandidate("b", "low")];
    const progress = buildDecisionProgress(completeProfile, candidates, [
      { candidateId: "a", viewingDecision: "continue" },
      { candidateId: "b", viewingDecision: "reject" },
    ]);

    expect(progress.reviewedViewingCount).toBe(2);
    expect(progress.primaryAction.route).toBe("contract");
    expect(progress.primaryAction.label).toBe("检查合同条款");
  });

  it("routes a reviewed high-risk contract back to contract handling", () => {
    const candidates = [buildCandidate("a", "low"), buildCandidate("b", "low")];
    const progress = buildDecisionProgress(completeProfile, candidates, [
      { candidateId: "a", viewingDecision: "continue", contractLevel: "high" },
      { candidateId: "b", viewingDecision: "reject" },
    ]);

    expect(progress.blockingContractCount).toBe(1);
    expect(progress.primaryAction.label).toBe("处理合同风险");
  });
});
