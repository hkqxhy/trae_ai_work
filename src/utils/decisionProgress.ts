import type { AppRouteId, CandidateListing, RentingProfile } from "../models/renting";
import { scoreCandidateForComparison } from "./comparisonScoring";

export interface DecisionAction {
  label: string;
  description: string;
  route: AppRouteId;
  candidateId?: string;
}

export interface DecisionProgress {
  profileComplete: boolean;
  candidateCount: number;
  comparableCount: number;
  highRiskCount: number;
  incompleteCandidateCount: number;
  reviewedViewingCount: number;
  contractReviewedCount: number;
  blockingContractCount: number;
  completedMilestones: number;
  totalMilestones: number;
  progressPercent: number;
  primaryAction: DecisionAction;
}

export interface CandidateDecisionState {
  candidateId: string;
  viewingDecision: "undecided" | "continue" | "hold" | "reject";
  contractLevel?: "low" | "medium" | "high";
}

export function isProfileComplete(profile: RentingProfile) {
  return Boolean(
    profile.city.trim() &&
      profile.commuteTarget.trim() &&
      profile.monthlyBudgetMin > 0 &&
      profile.monthlyBudgetMax >= profile.monthlyBudgetMin &&
      profile.maxCommuteMinutes > 0,
  );
}

export function buildDecisionProgress(
  profile: RentingProfile,
  candidates: CandidateListing[],
  decisionStates: CandidateDecisionState[] = [],
): DecisionProgress {
  const profileComplete = isProfileComplete(profile);
  const scores = candidates.map((candidate) => scoreCandidateForComparison(candidate, profile));
  const comparableCount = scores.filter((score) => score.isComparable).length;
  const highRiskCount = candidates.filter((candidate) =>
    candidate.scanResult.risks.some(
      (risk) =>
        risk.level === "high" &&
        risk.verificationStatus !== "explained" &&
        risk.verificationStatus !== "not_applicable",
    ),
  ).length;
  const highRiskCandidateId = candidates.find((candidate) =>
    candidate.scanResult.risks.some(
      (risk) =>
        risk.level === "high" &&
        risk.verificationStatus !== "explained" &&
        risk.verificationStatus !== "not_applicable",
    ),
  )?.id;
  const incompleteCandidateCount = scores.filter((score) => !score.isComparable).length;
  const activeCandidateIds = new Set(candidates.map((candidate) => candidate.id));
  const activeDecisionStates = decisionStates.filter((state) => activeCandidateIds.has(state.candidateId));
  const reviewedViewingCount = activeDecisionStates.filter(
    (state) => state.viewingDecision !== "undecided",
  ).length;
  const advancingStates = activeDecisionStates.filter(
    (state) => state.viewingDecision === "continue" || state.viewingDecision === "hold",
  );
  const contractReviewedCount = advancingStates.filter((state) => state.contractLevel).length;
  const blockingContractCount = advancingStates.filter(
    (state) => state.contractLevel === "high" || state.contractLevel === "medium",
  ).length;
  const milestones = [
    profileComplete,
    candidates.length > 0,
    candidates.length >= 2,
    comparableCount >= 2,
    reviewedViewingCount > 0,
    contractReviewedCount > 0 && blockingContractCount === 0,
  ];
  const completedMilestones = milestones.filter(Boolean).length;

  return {
    profileComplete,
    candidateCount: candidates.length,
    comparableCount,
    highRiskCount,
    incompleteCandidateCount,
    reviewedViewingCount,
    contractReviewedCount,
    blockingContractCount,
    completedMilestones,
    totalMilestones: milestones.length,
    progressPercent: Math.round((completedMilestones / milestones.length) * 100),
    primaryAction: getPrimaryAction({
      profileComplete,
      candidateCount: candidates.length,
      comparableCount,
      highRiskCount,
      incompleteCandidateCount,
      reviewedViewingCount,
      contractReviewedCount,
      blockingContractCount,
      highRiskCandidateId,
      firstCandidateId: candidates[0]?.id,
      firstAdvancingCandidateId: advancingStates[0]?.candidateId,
      firstBlockingContractCandidateId: advancingStates.find(
        (state) => state.contractLevel === "high" || state.contractLevel === "medium",
      )?.candidateId,
      allCandidatesRejected:
        candidates.length > 0 &&
        candidates.every((candidate) =>
          activeDecisionStates.some(
            (state) => state.candidateId === candidate.id && state.viewingDecision === "reject",
          ),
        ),
    }),
  };
}

function getPrimaryAction(
  state: Pick<
    DecisionProgress,
    "profileComplete" | "candidateCount" | "comparableCount" | "highRiskCount" | "incompleteCandidateCount" |
      "reviewedViewingCount" | "contractReviewedCount" | "blockingContractCount"
  > & {
    allCandidatesRejected: boolean;
    highRiskCandidateId?: string;
    firstCandidateId?: string;
    firstAdvancingCandidateId?: string;
    firstBlockingContractCandidateId?: string;
  },
): DecisionAction {
  if (!state.profileComplete) {
    return {
      label: "完善需求画像",
      description: "先补齐城市、预算和通勤目标，后续判断才有可靠基线。",
      route: "profile",
    };
  }

  if (state.candidateCount === 0) {
    return {
      label: "添加第一个房源",
      description: "粘贴房源文案、链接或截图，先建立一份可核验的候选记录。",
      route: "scan",
    };
  }

  if (state.candidateCount < 2) {
    return {
      label: "再添加一个候选",
      description: "至少保留两套房源，才能看清费用、通勤和风险的真实取舍。",
      route: "scan",
    };
  }

  if (state.comparableCount < 2) {
    return {
      label: "补齐对比信息",
      description: `${state.incompleteCandidateCount} 套房源仍缺少月总成本或通勤，暂不能可靠排名。`,
      route: "compare",
    };
  }

  if (state.highRiskCount > 0) {
    return {
      label: "核验高风险项",
      description: `${state.highRiskCount} 套候选存在高风险提示，先把问题带到现场逐项确认。`,
      route: "checklist",
      candidateId: state.highRiskCandidateId,
    };
  }

  if (state.allCandidatesRejected) {
    return {
      label: "重新寻找候选",
      description: "现有候选已在现场核验后全部淘汰。保留记录，继续添加新的房源。",
      route: "scan",
    };
  }

  if (state.reviewedViewingCount === 0) {
    return {
      label: "形成现场结论",
      description: "候选信息已可比较。下一步完成现场核验，并为房源记录继续、暂缓或淘汰结论。",
      route: "checklist",
      candidateId: state.firstCandidateId,
    };
  }

  if (state.contractReviewedCount === 0) {
    return {
      label: "检查合同条款",
      description: "已有房源通过现场判断。付款或签署前，把合同结果关联到对应候选。",
      route: "contract",
      candidateId: state.firstAdvancingCandidateId,
    };
  }

  if (state.blockingContractCount > 0) {
    return {
      label: "处理合同风险",
      description: `${state.blockingContractCount} 套推进中的房源仍有合同条款需要修改或补充。`,
      route: "contract",
      candidateId: state.firstBlockingContractCandidateId,
    };
  }

  return {
    label: "复核最终选择",
    description: "画像、比较、现场结论和合同检查已有记录。回到对比页复核成本与理由后再决定。",
    route: "compare",
  };
}
