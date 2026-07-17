export type ReplyAuditStatus = "clear" | "review";

export interface ReplyAuditItem {
  id: "facts" | "commitment" | "legal" | "privacy";
  label: string;
  status: ReplyAuditStatus;
  message: string;
}

export function auditNegotiationReply(reply: string, sourceText: string): ReplyAuditItem[] {
  const replyNumbers = extractNumbers(reply);
  const sourceNumbers = new Set(extractNumbers(sourceText));
  const unsupportedNumbers = replyNumbers.filter((value) => !sourceNumbers.has(value));
  const hasCommitment = /(?:我(?:会|同意|确认|保证).{0,4}(?:付款|支付|转账|签约|租下|付定金))|(?:马上|立即).{0,6}(?:付款|支付|转账|签约)/.test(reply);
  const hasLegalClaim = /(?:肯定|一定|显然).{0,6}(?:违法|无效)|(?:法律规定|你必须|对方必须)/.test(reply);
  const hasPrivateData = /1[3-9]\d{9}|\d{17}[\dXx]|(?:\d[ -]?){16,19}/.test(reply);

  return [
    {
      id: "facts",
      label: "事实与金额",
      status: unsupportedNumbers.length ? "review" : "clear",
      message: unsupportedNumbers.length
        ? `回复新增了原始信息中没有的数字：${unsupportedNumbers.join("、")}，发送前请核对。`
        : "未发现回复自行新增金额、日期或时长。",
    },
    {
      id: "commitment",
      label: "付款与签约承诺",
      status: hasCommitment ? "review" : "clear",
      message: hasCommitment
        ? "回复可能包含付款或签约承诺，请确认这确实是你的决定。"
        : "未发现主动承诺付款、转账或签约的表述。",
    },
    {
      id: "legal",
      label: "法律断言",
      status: hasLegalClaim ? "review" : "clear",
      message: hasLegalClaim
        ? "回复含有确定性法律判断，建议改成要求说明依据或寻求专业意见。"
        : "未发现确定性法律结论或命令式断言。",
    },
    {
      id: "privacy",
      label: "隐私信息",
      status: hasPrivateData ? "review" : "clear",
      message: hasPrivateData
        ? "回复可能包含手机号、身份证号或银行卡号，请在发送前删除不必要的信息。"
        : "未发现常见的手机号、身份证号或银行卡号格式。",
    },
  ];
}

function extractNumbers(value: string) {
  return Array.from(new Set(value.match(/\d+(?:\.\d+)?/g) ?? []));
}
