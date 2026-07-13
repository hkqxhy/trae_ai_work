import { loadEnvFile } from "./loadEnvFile.js";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function loadAiConfig(env = process.env) {
  if (env === process.env) {
    loadEnvFile();
  }

  const qwenApiKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "";
  const provider = (env.AI_PROVIDER || (qwenApiKey ? "qwen" : "mock")).toLowerCase();
  const isProduction = env.NODE_ENV === "production";

  return {
    provider,
    isProduction,
    host: env.AI_SERVER_HOST || (isProduction ? "0.0.0.0" : "127.0.0.1"),
    corsOrigin: env.CORS_ORIGIN || "",
    port: toNumber(env.PORT || env.AI_SERVER_PORT, 8787),
    requestTimeoutMs: toNumber(env.AI_REQUEST_TIMEOUT_MS, 30000),
    maxOutputTokens: toNumber(env.AI_MAX_OUTPUT_TOKENS, 2000),
    rateLimitPerMinute: toNumber(env.AI_RATE_LIMIT_PER_MINUTE, 10),
    maxTextLength: toNumber(env.AI_MAX_TEXT_LENGTH, 20000),
    maxImages: toNumber(env.AI_MAX_IMAGES, 6),
    maxImageSizeMb: toNumber(env.AI_MAX_IMAGE_SIZE_MB, 8),
    qwen: {
      apiKey: qwenApiKey,
      baseUrl: env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: env.QWEN_MODEL || "qwen-plus",
    },
  };
}

export function getPublicAiConfig(config) {
  return {
    provider: config.provider,
    mockMode: config.provider === "mock",
    modelConfigured: config.provider === "mock" || Boolean(config.qwen.apiKey),
    model: config.provider === "qwen" ? config.qwen.model : "mock-renting-radar",
    limits: {
      maxTextLength: config.maxTextLength,
      maxImages: config.maxImages,
      maxImageSizeMb: config.maxImageSizeMb,
      rateLimitPerMinute: config.rateLimitPerMinute,
    },
  };
}
