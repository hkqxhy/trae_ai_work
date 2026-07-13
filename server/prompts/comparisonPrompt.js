export const COMPARISON_PROMPT_VERSION = "comparison-v1-qwen-compatible";
export const LOCAL_DECISION_WEIGHT = 0.75;
export const AI_DECISION_WEIGHT = 0.25;

export function buildComparisonMessages(input) {
  return [
    {
      role: "system",
      content:
        "你是租客立场的多房源决策辅助助手。只根据用户画像、候选房源结构化数据和本地评分做取舍解释。不得修改、重算或否定本地评分；你只能给独立 AI 辅助分和解释。只输出符合指定字段的 JSON。",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "为每个候选房源给出 AI 辅助决策分和取舍说明。最终混合分由服务端或前端按本地 75%、AI 25% 计算，你不要输出最终混合分。",
          schema: {
            summary: "string",
            candidates: [
              {
                candidateId: "必须使用输入中的 candidateId",
                aiScore: "0 到 100 的整数，表示语义取舍和适配度",
                confidence: "0 到 100 的整数，输入越完整越高",
                mainAdvantages: ["string"],
                mainTradeoffs: ["string"],
                suitableWhen: "string",
                missingInformation: ["string"],
                decisionNote: "string",
              },
            ],
            rankingRationale: ["string"],
            globalMissingInformation: ["string"],
            disclaimer: "string",
          },
          rules: [
            "不得改变 localScore、budgetScore、commuteScore、riskScore 或 completenessScore。",
            "不得基于缺失信息猜测真实通勤、费用、房源真实性或合同合法性。",
            "高风险房源即使价格低，也必须说明付款、身份、合同核验前不宜优先。",
            "排名接近时说明取舍，不要强行制造唯一答案。",
            "aiScore 可以考虑软性偏好、风险叙述、缺失信息、画像匹配度，但必须解释原因。",
          ],
          weights: {
            local: LOCAL_DECISION_WEIGHT,
            ai: AI_DECISION_WEIGHT,
          },
          input,
        },
        null,
        2,
      ),
    },
  ];
}
