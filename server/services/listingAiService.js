import { LISTING_PROMPT_VERSION, buildListingMessages } from "../prompts/listingPrompt.js";
import { callListingAiProvider } from "./aiProvider.js";
import { ApiError } from "../utils/httpErrors.js";
import { redactSensitiveText } from "../utils/redactSensitiveText.js";

function getInputModalities(input) {
  const modalities = ["text"];
  if (Array.isArray(input.images) && input.images.length > 0) {
    modalities.push("image");
  }
  return modalities;
}

function sanitizeImages(images, config) {
  if (!Array.isArray(images)) {
    return [];
  }

  if (images.length > config.maxImages) {
    throw new ApiError(413, "too_many_images", `最多支持 ${config.maxImages} 张图片。`);
  }

  return images.map((image) => {
    const size = Number(image.size) || 0;
    if (size > config.maxImageSizeMb * 1024 * 1024) {
      throw new ApiError(413, "image_too_large", `单张图片不能超过 ${config.maxImageSizeMb} MB。`);
    }

    return {
      name: String(image.name || "image"),
      size,
      type: String(image.type || ""),
    };
  });
}

export async function analyzeListing({ body, config, requestId }) {
  const rawInput = body?.listing ?? {};
  const text = redactSensitiveText(String(rawInput.text || "").slice(0, config.maxTextLength));
  const url = redactSensitiveText(String(rawInput.url || "").slice(0, 2000));
  const imageNotes = redactSensitiveText(String(rawInput.imageNotes || "").slice(0, 4000));
  const images = sanitizeImages(rawInput.images, config);

  const totalTextLength = [text, url, imageNotes].join("").trim().length;
  if (!totalTextLength && !images.length) {
    return {
      status: "insufficient_input",
      conclusion: "请先提供房源文字、链接文本、图片备注或截图信息，再进行 AI 补充分析。",
      reasons: [],
      risks: [],
      missingInformation: ["房源描述、链接文本或图片内容"],
      suggestedQuestions: ["请补充租金、押金、费用、位置、发布者身份和合同信息。"],
      disclaimer: "AI 结果依赖你提供的信息完整度，仅作租房风险提示，不构成事实认定或法律意见。",
      metadata: {
        model: config.provider === "qwen" ? config.qwen.model : "mock-renting-radar",
        requestId,
        inputModalities: [],
        provider: config.provider,
        promptVersion: LISTING_PROMPT_VERSION,
        mock: config.provider === "mock",
      },
    };
  }

  const safeInput = {
    mode: rawInput.mode || "text",
    text,
    url,
    imageNotes,
    images,
    profile: body?.profile ?? null,
    localRuleResult: body?.localRuleResult ?? null,
  };

  const metadata = {
    provider: config.provider,
    model: config.provider === "qwen" ? config.qwen.model : "mock-renting-radar",
    requestId,
    inputModalities: getInputModalities(safeInput),
    promptVersion: LISTING_PROMPT_VERSION,
  };

  return callListingAiProvider({
    config,
    messages: buildListingMessages(safeInput),
    input: safeInput,
    metadata,
  });
}

