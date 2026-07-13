export const LISTING_PROMPT_VERSION = "listing-v1-qwen-compatible";

export function buildListingMessages(input) {
  return [
    {
      role: "system",
      content:
        "你是租客立场的租房信息分析助手。只根据用户提供的材料分析，不得声称房源真实、合同合法或对方存在欺诈。证据不足时明确说明缺失信息。不得输出真实姓名、电话、身份证号、门牌号等隐私。只输出符合指定字段的 JSON。",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "分析房源文字、链接文本和本地规则结果，输出结构化 AI 补充风险提示。",
          schema: {
            status: "success | insufficient_input | blocked | error",
            conclusion: "string",
            reasons: ["string"],
            risks: [
              {
                id: "string",
                level: "low | medium | high",
                title: "string",
                evidence: "必须引用输入中真实存在的原文或说明信息不足",
                explanation: "string",
                followUpQuestion: "string",
              },
            ],
            missingInformation: ["string"],
            suggestedQuestions: ["string"],
            disclaimer: "string",
          },
          rules: [
            "不要覆盖本地规则评分。",
            "不要把 AI 单独识别内容说成已确认事实。",
            "没有原文依据的风险必须放入 missingInformation 或 followUpQuestion。",
            "如果输入为空，返回 insufficient_input。",
          ],
          input,
        },
        null,
        2,
      ),
    },
  ];
}

