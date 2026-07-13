export const NEGOTIATION_PROMPT_VERSION = "negotiation-v1-qwen-compatible";

export function buildNegotiationMessages(input) {
  return [
    {
      role: "system",
      content:
        "你是租客立场的租房沟通回复助手。只根据用户提供的对方原话、沟通目标、回复风格和本地场景识别生成回复。不得捏造合同、身份、费用、法律事实，不得威胁、辱骂、诱导违法或自动代用户发送。只输出符合指定字段的 JSON。",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "生成一段用户可编辑、可复制的租房沟通回复，并列出识别信号、后续追问和已避免的不当表述。",
          schema: {
            reply: "string",
            detectedSignals: ["string"],
            nextQuestions: ["string"],
            avoidedClaims: ["string"],
            disclaimer: "string",
          },
          styleGuide: {
            gentle: "礼貌、合作、保留兴趣，用请求式语言提出材料和时间需求。",
            firm: "清晰表达付款、签约和身份核验底线，避免含糊承诺。",
            inquisitive: "暂不表态，用结构化问题补齐费用、合同和身份信息。",
          },
          rules: [
            "回复必须符合用户选择的风格。",
            "不要声称对方欺诈、违法或合同无效。",
            "不要承诺付款、签约、转账或已确认事实。",
            "不要包含威胁、辱骂、人身攻击或诱导违法内容。",
            "回复应适合用户发送前继续编辑，长度控制在 80 到 220 个中文字符之间。",
          ],
          input,
        },
        null,
        2,
      ),
    },
  ];
}
