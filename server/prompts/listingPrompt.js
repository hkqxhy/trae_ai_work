export const LISTING_PROMPT_VERSION = "listing-v1-qwen-compatible";

export function buildListingMessages(input) {
  const imageMetadata = input.images.map(({ dataUrl, ...image }) => image);
  const textInput = {
    ...input,
    images: imageMetadata,
  };
  const content = [
    {
      type: "text",
      text: JSON.stringify(
        {
          task: "分析房源文字、链接文本、图片和图片备注，输出结构化 AI 补充风险提示。",
          schema: {
            status: "success | insufficient_input | blocked | error",
            conclusion: "string",
            reasons: ["string"],
            risks: [
              {
                id: "string",
                level: "low | medium | high",
                title: "string",
                evidence: "必须引用输入中真实存在的原文、图片可见内容或说明信息不足",
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
            "图片可以用于识别可见文字、费用、环境和聊天语境，但看不清或无法确认的内容必须说明不确定。",
            "没有原文或图片依据的风险必须放入 missingInformation 或 followUpQuestion。",
            "如果输入为空且没有可读取图片，返回 insufficient_input。",
          ],
          input: textInput,
        },
        null,
        2,
      ),
    },
  ];

  input.images.forEach((image) => {
    if (image.dataUrl) {
      content.push({
        type: "image_url",
        image_url: { url: image.dataUrl },
      });
    }
  });

  return [
    {
      role: "system",
      content:
        "你是租客立场的多模态租房信息分析助手。只根据用户提供的文字和图片分析，不得声称房源真实、合同合法或对方存在欺诈。证据不足或图片无法确认时明确说明缺失信息和不确定性。不得输出真实姓名、电话、身份证号、门牌号等隐私。只输出符合指定字段的 JSON。",
    },
    {
      role: "user",
      content,
    },
  ];
}
