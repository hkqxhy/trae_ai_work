import type { PriorityLevel, RentingProfile, UserPreference } from "../models/renting";

export const priorityLabels: Record<PriorityLevel, string> = {
  must: "必须满足",
  preferred: "比较重要",
  flexible: "可以妥协",
};

export const priorityOrder: PriorityLevel[] = ["must", "preferred", "flexible"];

export function sortPreferences(preferences: UserPreference[]) {
  return [...preferences].sort((left, right) => {
    const levelGap = priorityOrder.indexOf(left.level) - priorityOrder.indexOf(right.level);
    return levelGap || left.label.localeCompare(right.label, "zh-Hans-CN");
  });
}

export function groupPreferences(preferences: UserPreference[]) {
  return priorityOrder.map((level) => ({
    level,
    label: priorityLabels[level],
    items: sortPreferences(preferences).filter((preference) => preference.level === level),
  }));
}

export function buildProfileSummary(profile: RentingProfile) {
  const mustHave = profile.preferences.filter((preference) => preference.level === "must");
  const budgetRange = `${profile.monthlyBudgetMin} 到 ${profile.monthlyBudgetMax} 元/月`;
  const housingMode = profile.acceptsSharedHousing ? "可接受合租，预算弹性更高" : "优先整租，稳定和隐私更重要";

  const budgetAdvice =
    profile.monthlyBudgetMax <= 2500
      ? "预算较紧，建议优先扩大片区范围，并警惕明显低价房源。"
      : profile.monthlyBudgetMax >= 5000
        ? "预算空间较充足，可以优先筛选通勤和居住稳定性。"
        : "预算处于常见区间，建议在通勤、采光和费用透明度之间做平衡。";

  const commuteAdvice =
    profile.maxCommuteMinutes <= 35
      ? "通勤要求偏严格，应先锁定轨道交通或公司附近片区。"
      : profile.maxCommuteMinutes >= 60
        ? "通勤容忍度较高，可以用距离换取更好的价格或居住面积。"
        : "通勤目标适中，适合比较 2 到 3 个候选片区。";

  return {
    budgetRange,
    housingMode,
    mustHaveText: mustHave.length ? mustHave.map((preference) => preference.label).join("、") : "暂未设置必须满足项",
    decisionBrief: `在 ${profile.city || "目标城市"} 租房，围绕 ${profile.commuteTarget || "主要通勤点"}，预算 ${budgetRange}，通勤上限 ${profile.maxCommuteMinutes} 分钟。`,
    advice: [housingMode, budgetAdvice, commuteAdvice],
  };
}
