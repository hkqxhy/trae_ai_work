import type {
  CandidateComparison,
  CandidateComparisonScore,
  CandidateListing,
  RentingProfile,
} from "../models/renting";

const comparisonFields: Array<{ key: keyof CandidateComparison; label: string; required: boolean }> = [
  { key: "monthlyRent", label: "月租", required: true },
  { key: "totalMonthlyCost", label: "总月成本", required: true },
  { key: "upfrontCost", label: "首期成本", required: false },
  { key: "commuteMinutes", label: "通勤时间", required: true },
  { key: "metroDistanceMeters", label: "地铁距离", required: false },
];

export function scoreCandidateForComparison(
  candidate: CandidateListing,
  profile: RentingProfile,
): CandidateComparisonScore {
  const comparison = candidate.comparison;
  const monthlyCost = comparison.totalMonthlyCost ?? comparison.monthlyRent;
  const riskScore = candidate.scanResult.score;
  const budgetScore = getBudgetScore(monthlyCost, profile.monthlyBudgetMin, profile.monthlyBudgetMax);
  const commuteScore = getCommuteScore(comparison.commuteMinutes, profile.maxCommuteMinutes);
  const completenessScore = getCompletenessScore(candidate);
  const missingFields = comparisonFields
    .filter(({ key }) => !isFilledNumber(comparison[key]))
    .map(({ label }) => label);
  const requiredMissingFields = comparisonFields
    .filter(({ key, required }) => required && !isFilledNumber(comparison[key]))
    .map(({ label }) => label);
  const score = Math.round(
    riskScore * 0.35 + budgetScore * 0.25 + commuteScore * 0.25 + completenessScore * 0.15,
  );

  return {
    score,
    budgetScore,
    commuteScore,
    riskScore,
    completenessScore,
    isComparable: requiredMissingFields.length === 0,
    missingFields,
    requiredMissingFields,
    explanation: buildExplanation(candidate, profile, monthlyCost, score, requiredMissingFields),
  };
}

function isFilledNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function getBudgetScore(monthlyCost: number | undefined, minBudget: number, maxBudget: number) {
  if (!monthlyCost) {
    return 45;
  }

  if (monthlyCost >= minBudget && monthlyCost <= maxBudget) {
    return 92;
  }

  if (monthlyCost < minBudget) {
    return monthlyCost < minBudget * 0.75 ? 58 : 76;
  }

  const overBudget = monthlyCost - maxBudget;
  const tolerance = Math.max(500, maxBudget * 0.25);
  return Math.max(35, Math.round(82 - (overBudget / tolerance) * 42));
}

function getCommuteScore(commuteMinutes: number | undefined, maxCommuteMinutes: number) {
  if (!commuteMinutes) {
    return 45;
  }

  if (commuteMinutes <= maxCommuteMinutes * 0.7) {
    return 96;
  }

  if (commuteMinutes <= maxCommuteMinutes) {
    return 84;
  }

  const overTime = commuteMinutes - maxCommuteMinutes;
  return Math.max(30, Math.round(74 - overTime * 1.8));
}

function getCompletenessScore(candidate: CandidateListing) {
  const comparison = candidate.comparison;
  const fields = [
    comparison.monthlyRent,
    comparison.totalMonthlyCost,
    comparison.upfrontCost,
    comparison.commuteMinutes,
    comparison.metroDistanceMeters,
  ];
  const filledCount = fields.filter((field) => isFilledNumber(field)).length;
  return Math.round((filledCount / fields.length) * 100);
}

function buildExplanation(
  candidate: CandidateListing,
  profile: RentingProfile,
  monthlyCost: number | undefined,
  score: number,
  requiredMissingFields: string[],
) {
  const explanation: string[] = [];

  if (requiredMissingFields.length) {
    explanation.push(`信息尚不完整，补充${requiredMissingFields.join("、")}后才会参与可靠排名。`);
  }
  const comparison = candidate.comparison;

  if (score >= 80) {
    explanation.push("综合分较高，适合作为优先约看的候选房源。");
  } else if (score >= 60) {
    explanation.push("综合分中等，适合继续补充费用、通勤和合同信息后再决定。");
  } else {
    explanation.push("综合分偏低，不建议在关键信息补齐前支付定金或押金。");
  }

  if (monthlyCost) {
    if (monthlyCost > profile.monthlyBudgetMax) {
      explanation.push("总月成本高于你的最高预算，需要确认是否有压价或替代片区空间。");
    } else if (monthlyCost < profile.monthlyBudgetMin * 0.75) {
      explanation.push("价格明显偏低，建议重点核验真实性、隔断和额外收费。");
    } else {
      explanation.push("费用落在你的预算判断范围内，可以继续比较通勤和居住条件。");
    }
  } else {
    explanation.push("费用字段仍不完整，建议补充月租和总月成本。");
  }

  if (comparison.commuteMinutes) {
    if (comparison.commuteMinutes <= profile.maxCommuteMinutes) {
      explanation.push("通勤时间在你的可接受范围内。");
    } else {
      explanation.push("通勤超过你的上限，除非价格或居住条件明显更好，否则应谨慎。");
    }
  } else {
    explanation.push("通勤时间待补充，暂时无法判断日常可持续性。");
  }

  if (candidate.scanResult.level === "high") {
    explanation.push("扫描结果显示高风险，必须先核验身份、地址、合同和付款规则。");
  }

  return explanation;
}
