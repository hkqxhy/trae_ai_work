import { describe, expect, it } from "vitest";
import type { RentingRadarDataBundle } from "./dataPortability";
import { parseDataBundle, serializeDataBundle } from "./dataPortability";

const validBundle: RentingRadarDataBundle = {
  product: "renting-radar",
  formatVersion: 1,
  exportedAt: "2026-07-17T00:00:00.000Z",
  profile: {
    city: "杭州",
    commuteTarget: "未来科技城",
    monthlyBudgetMin: 3000,
    monthlyBudgetMax: 4500,
    maxCommuteMinutes: 45,
    acceptsSharedHousing: false,
    preferences: [],
  },
  candidates: [],
  viewingRecords: [],
  contractRecords: [],
};

describe("data portability", () => {
  it("round trips a current-format data bundle", () => {
    expect(parseDataBundle(serializeDataBundle(validBundle))).toEqual(validBundle);
  });

  it("rejects unrelated JSON", () => {
    expect(() => parseDataBundle('{"product":"something-else"}')).toThrow("数据包版本不受支持");
  });

  it("rejects malformed JSON with a readable message", () => {
    expect(() => parseDataBundle("not json")).toThrow("文件不是有效的 JSON 数据");
  });

  it("migrates viewing records without a decision to an undecided outcome", () => {
    const legacyBundle = {
      ...validBundle,
      viewingRecords: [
        {
          contextId: "general",
          progress: { "check-door": true },
          notes: { summary: "采光正常", followUps: "确认水费" },
        },
      ],
    };

    expect(parseDataBundle(JSON.stringify(legacyBundle)).viewingRecords[0]?.notes).toMatchObject({
      summary: "采光正常",
      followUps: "确认水费",
      decision: "undecided",
    });
  });
});
