import { ApiError } from "./httpErrors.js";

const LISTING_MODES = new Set(["text", "link", "image"]);
const NEGOTIATION_STYLES = new Set(["gentle", "firm", "inquisitive"]);
const COMPARISON_NUMBER_FIELDS = [
  "monthlyRent",
  "totalMonthlyCost",
  "upfrontCost",
  "commuteMinutes",
  "metroDistanceMeters",
];

function fail(field, message) {
  throw new ApiError(400, "invalid_request", `${field}${message}`);
}

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(field, "必须是对象。");
  }
  return value;
}

function optionalString(value, field, maxLength) {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string") {
    fail(field, "必须是字符串。");
  }
  if (value.length > maxLength) {
    fail(field, `不能超过 ${maxLength} 个字符。`);
  }
}

function optionalNumber(value, field, { max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    fail(field, "必须是 0 到合理上限之间的数字。");
  }
}

function optionalObject(value, field) {
  if (value === undefined || value === null) {
    return;
  }
  requireObject(value, field);
}

function validateListing(body, config) {
  const listing = requireObject(body.listing, "listing");
  if (listing.mode !== undefined && !LISTING_MODES.has(listing.mode)) {
    fail("listing.mode", "不是支持的输入类型。");
  }
  optionalString(listing.text, "listing.text", config.maxTextLength);
  optionalString(listing.url, "listing.url", 2000);
  optionalString(listing.imageNotes, "listing.imageNotes", 4000);

  if (listing.images !== undefined && !Array.isArray(listing.images)) {
    fail("listing.images", "必须是数组。");
  }
  if (Array.isArray(listing.images)) {
    if (listing.images.length > config.maxImages) {
      fail("listing.images", `最多支持 ${config.maxImages} 张图片。`);
    }
    listing.images.forEach((image, index) => {
      requireObject(image, `listing.images[${index}]`);
      optionalString(image.name, `listing.images[${index}].name`, 255);
      optionalString(image.type, `listing.images[${index}].type`, 100);
      optionalString(
        image.dataUrl,
        `listing.images[${index}].dataUrl`,
        config.maxImageSizeMb * 1024 * 1024 * 2,
      );
      if (
        image.dataUrl !== undefined &&
        !/^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(image.dataUrl)
      ) {
        fail(`listing.images[${index}].dataUrl`, "必须是受支持的 base64 图片 data URL。");
      }
      optionalNumber(image.size, `listing.images[${index}].size`, {
        max: config.maxImageSizeMb * 1024 * 1024,
      });
    });
  }

  optionalObject(body.profile, "profile");
  optionalObject(body.localRuleResult, "localRuleResult");
}

function validateNegotiation(body, config) {
  const negotiation = requireObject(body.negotiation, "negotiation");
  optionalString(negotiation.message, "negotiation.message", config.maxTextLength);
  optionalString(negotiation.goal, "negotiation.goal", 4000);
  if (negotiation.style !== undefined && !NEGOTIATION_STYLES.has(negotiation.style)) {
    fail("negotiation.style", "不是支持的沟通风格。");
  }
  optionalObject(body.localRuleResult, "localRuleResult");
}

function validateComparison(body, config) {
  optionalObject(body.profile, "profile");
  if (!Array.isArray(body.candidates)) {
    fail("candidates", "必须是数组。");
  }
  if (body.candidates.length === 0 || body.candidates.length > config.maxCandidates) {
    fail("candidates", `数量必须在 1 到 ${config.maxCandidates} 之间。`);
  }

  body.candidates.forEach((candidate, index) => {
    const prefix = `candidates[${index}]`;
    requireObject(candidate, prefix);
    optionalString(candidate.id, `${prefix}.id`, 128);
    optionalString(candidate.candidateId, `${prefix}.candidateId`, 128);
    optionalString(candidate.title, `${prefix}.title`, 300);
    optionalString(candidate.sourceLabel, `${prefix}.sourceLabel`, 100);
    optionalString(candidate.note, `${prefix}.note`, 4000);
    optionalObject(candidate.comparison, `${prefix}.comparison`);
    COMPARISON_NUMBER_FIELDS.forEach((field) => {
      optionalNumber(candidate.comparison?.[field], `${prefix}.comparison.${field}`, { max: 100000000 });
    });
    optionalObject(candidate.scanResult, `${prefix}.scanResult`);
    optionalObject(candidate.localScore, `${prefix}.localScore`);
  });
}

export function validateAiRequest(pathname, body, config) {
  const safeBody = requireObject(body, "请求体");
  if (pathname === "/api/ai/listing-analysis") {
    validateListing(safeBody, config);
  } else if (pathname === "/api/ai/negotiation-reply") {
    validateNegotiation(safeBody, config);
  } else if (pathname === "/api/ai/comparison-explanation") {
    validateComparison(safeBody, config);
  }
  return safeBody;
}
