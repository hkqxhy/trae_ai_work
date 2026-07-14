import { LISTING_PROMPT_VERSION, buildListingMessages } from "../prompts/listingPrompt.js";
import { callListingAiProvider } from "./aiProvider.js";
import { ApiError } from "../utils/httpErrors.js";
import { redactSensitiveText } from "../utils/redactSensitiveText.js";

function getInputModalities(input) {
  const modalities = [];
  if ([input.text, input.url, input.imageNotes].some((value) => String(value || "").trim())) {
    modalities.push("text");
  }
  if (input.images.some((image) => image.dataUrl)) {
    modalities.push("image");
  }
  return modalities;
}

function isSupportedImageDataUrl(value) {
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value);
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

    const dataUrl = String(image.dataUrl || "");
    if (dataUrl && !isSupportedImageDataUrl(dataUrl)) {
      throw new ApiError(400, "invalid_image_data", "图片必须是受支持的 base64 data URL。");
    }

    if (dataUrl) {
      const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const decodedSize = Math.floor((encoded.length * 3) / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
      if (decodedSize > config.maxImageSizeMb * 1024 * 1024) {
        throw new ApiError(413, "image_too_large", `图片内容不能超过 ${config.maxImageSizeMb} MB。`);
      }
    }

    return {
      name: String(image.name || "image"),
      size,
      type: String(image.type || ""),
      dataUrl: dataUrl || undefined,
    };
  });
}

export async function analyzeListing({ body, config, requestId }) {
  const rawInput = body?.listing ?? {};
  const text = redactSensitiveText(String(rawInput.text || "").slice(0, config.maxTextLength));
  const url = redactSensitiveText(String(rawInput.url || "").slice(0, 2000));
  const imageNotes = redactSensitiveText(String(rawInput.imageNotes || "").slice(0, 4000));
  const images = sanitizeImages(rawInput.images, config);
  const hasVisionImages = images.some((image) => image.dataUrl);

  const totalTextLength = [text, url, imageNotes].join("").trim().length;
  if (!totalTextLength && !hasVisionImages) {
    return {
      status: "insufficient_input",
      conclusion: "请先提供房源文字、链接文本、图片或图片备注，再进行 AI 补充分析。",
      reasons: [],
      risks: [],
      missingInformation: ["房源描述、链接文本或图片中的关键文字"],
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
    model:
      config.provider === "qwen"
        ? hasVisionImages
          ? config.qwen.visionModel
          : config.qwen.model
        : "mock-renting-radar",
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
