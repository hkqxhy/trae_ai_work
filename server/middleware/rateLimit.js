import { ApiError } from "../utils/httpErrors.js";

const buckets = new Map();

export function assertRateLimit(ip, config) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const current = buckets.get(ip) ?? { count: 0, resetAt: now + windowMs };

  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }

  current.count += 1;
  buckets.set(ip, current);

  if (current.count > config.rateLimitPerMinute) {
    throw new ApiError(429, "rate_limited", "请求过于频繁，请稍后再试。");
  }
}

