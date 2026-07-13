import { NEGOTIATION_PROMPT_VERSION, buildNegotiationMessages } from "../prompts/negotiationPrompt.js";
import { callNegotiationAiProvider } from "./aiProvider.js";
import { redactSensitiveText } from "../utils/redactSensitiveText.js";

export async function generateNegotiationAiReply({ body, config, requestId }) {
  const rawInput = body?.negotiation ?? {};
  const message = redactSensitiveText(String(rawInput.message || "").slice(0, config.maxTextLength));
  const goal = redactSensitiveText(String(rawInput.goal || "").slice(0, 4000));

  const metadata = {
    provider: config.provider,
    model: config.provider === "qwen" ? config.qwen.model : "mock-renting-radar",
    requestId,
    promptVersion: NEGOTIATION_PROMPT_VERSION,
  };

  if (!message.trim() || !goal.trim()) {
    return {
      reply: "",
      detectedSignals: [],
      nextQuestions: ["请补充对方原话和你的沟通目标。"],
      avoidedClaims: [],
      disclaimer: "AI 回复需要完整输入后才能生成，发送前请自行核对。",
      metadata: {
        ...metadata,
        mock: config.provider === "mock",
      },
    };
  }

  const safeInput = {
    message,
    goal,
    style: rawInput.style || "gentle",
    localRuleResult: body?.localRuleResult ?? null,
  };

  return callNegotiationAiProvider({
    config,
    messages: buildNegotiationMessages(safeInput),
    input: safeInput,
    metadata,
  });
}
