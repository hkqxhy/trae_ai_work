import { describe, expect, it } from "vitest";
import { auditNegotiationReply } from "./negotiationSafetyAudit";
import { generateNegotiationReply } from "./negotiationReplyGenerator";

describe("negotiation reply safety audit", () => {
  it("flags invented amounts and payment commitments", () => {
    const audit = auditNegotiationReply("我会马上转账 2000 元定金。", "对方要求支付定金。");
    expect(audit.find((item) => item.id === "facts")?.status).toBe("review");
    expect(audit.find((item) => item.id === "commitment")?.status).toBe("review");
  });

  it("flags private identifiers", () => {
    const audit = auditNegotiationReply("我的手机号是 13812345678。", "请留联系方式。");
    expect(audit.find((item) => item.id === "privacy")?.status).toBe("review");
  });

  it("passes a cautious evidence request", () => {
    const audit = auditNegotiationReply("请先提供费用明细和合同模板，我核对后再决定。", "请先核实材料。");
    expect(audit.every((item) => item.status === "clear")).toBe(true);
  });

  it("does not mistake asking about a signing party for a signing commitment", () => {
    const reply = generateNegotiationReply(
      "对方要求先转定金",
      "不先转定金，要求先看合同和身份材料",
      "gentle",
    ).reply;
    const audit = auditNegotiationReply(reply, "对方要求先转定金\n不先转定金，要求先看合同和身份材料");

    expect(audit.find((item) => item.id === "commitment")?.status).toBe("clear");
  });
});
