import { describe, expect, it } from "vitest";
import { createContractReviewRecord, isContractReviewRecord } from "./contractReviewStorage";

const result = {
  level: "medium" as const,
  summary: "有条款需要补充",
  findings: [],
  followUpQuestions: [],
  detectedFacts: [],
};

describe("contract review records", () => {
  it("creates a candidate-linked review record", () => {
    const record = createContractReviewRecord("candidate-1", "准备签约", "押金退还时间未写明", result);

    expect(record.candidateId).toBe("candidate-1");
    expect(record.result).toBe(result);
    expect(isContractReviewRecord(record)).toBe(true);
  });

  it("rejects records without a candidate or scan result", () => {
    expect(isContractReviewRecord({ id: "bad" })).toBe(false);
  });
});
