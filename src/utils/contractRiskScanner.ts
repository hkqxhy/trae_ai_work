import type {
  ContractRiskCategory,
  ContractRiskFinding,
  ContractScanResult,
  RiskLevel,
} from "../models/renting";

interface ContractRiskRule {
  id: string;
  category: ContractRiskCategory;
  level: RiskLevel;
  title: string;
  pattern: RegExp;
  reason: string;
  followUpQuestion: string;
}

const contractRiskRules: ContractRiskRule[] = [
  {
    id: "deposit-forfeiture",
    category: "deposit",
    level: "high",
    title: "押金可能被直接没收",
    pattern: /(?:押金.{0,16}(?:不予退还|概不退还|不退|没收))|(?:(?:不予退还|概不退还|没收).{0,10}押金)/,
    reason: "条款把押金直接与违约绑定，但没有说明实际损失、扣除范围或剩余款项如何返还。",
    followUpQuestion: "押金可扣除的具体情形、计算依据和举证材料是什么？扣除后剩余押金何时返还？",
  },
  {
    id: "deposit-discretionary-deduction",
    category: "deposit",
    level: "medium",
    title: "押金扣除范围较模糊",
    pattern: /(?:甲方|出租方).{0,12}(?:有权|可|可以).{0,12}(?:扣除|扣减|没收).{0,10}押金|视情况.{0,8}(?:扣除|扣减).{0,8}押金/,
    reason: "条款给出租方较大的单方扣款空间，但没有列明扣款项目、金额上限或核验方式。",
    followUpQuestion: "能否把押金扣除项目、金额上限、验收标准和凭证要求逐项写清楚？",
  },
  {
    id: "remaining-term-penalty",
    category: "breach",
    level: "high",
    title: "提前退租成本可能过高",
    pattern: /剩余租期.{0,16}(?:租金)?.{0,10}(?:\d+(?:\.\d+)?%|百分之[一二三四五六七八九十百]+|全部)/,
    reason: "违约金与剩余全部租期挂钩，实际金额可能明显高于常见的一至两个月租金，需要重点核对计算方式。",
    followUpQuestion: "能否将提前退租责任改为明确上限，并约定找到替代承租人或提前通知后的减免方式？",
  },
  {
    id: "multiple-month-penalty",
    category: "breach",
    level: "high",
    title: "违约金达到多个月租金",
    pattern: /违约金.{0,14}(?:两|二|2|三|3|四|4|五|5|六|6|七|7|八|8|九|9)个?月.{0,6}租金/,
    reason: "多个月租金的固定违约金会显著增加退出成本，应确认是否存在上限、减免或替代履行安排。",
    followUpQuestion: "违约金是否可以限定为一个月租金，或按出租方实际损失与空置期计算？",
  },
  {
    id: "daily-high-penalty",
    category: "breach",
    level: "high",
    title: "按日累计违约金需核对上限",
    pattern: /(?:每日|每逾期一日).{0,12}(?:\d+(?:\.\d+)?%|千分之[一二三四五六七八九十]+|万分之[一二三四五六七八九十]+)/,
    reason: "按日累计的违约金如果没有总额上限，可能在较短时间内形成较高负担。",
    followUpQuestion: "按日违约金的计算基数、起止时间和累计上限分别是什么？",
  },
  {
    id: "unilateral-termination",
    category: "breach",
    level: "high",
    title: "解除权和违约责任可能不对等",
    pattern: /(?:甲方|出租方).{0,16}(?:有权|可以)单方解除.{0,50}(?:乙方|承租方).{0,16}(?:不得|无权)(?:解除|退租)/,
    reason: "条款可能只保留出租方的解除权，同时限制承租方退出，双方责任边界不够对等。",
    followUpQuestion: "双方可解除合同的情形、通知期限和违约责任能否采用对等表述？",
  },
  {
    id: "unspecified-extra-fees",
    category: "fee",
    level: "medium",
    title: "额外费用未写明金额",
    pattern: /(?:物业费|管理费|服务费|网络费|网费|保洁费|卫生费).{0,16}(?:由乙方承担|由承租方承担|另行收取|另计|另算)(?![\s\S]{0,12}\d)/,
    reason: "条款要求承租方承担额外费用，但没有明确金额、周期或计费依据，真实月成本无法提前估算。",
    followUpQuestion: "各项费用的金额、收取周期、计费依据和收款方分别是什么？能否写入合同附件？",
  },
  {
    id: "commercial-utilities",
    category: "fee",
    level: "medium",
    title: "水电可能按商业标准计费",
    pattern: /(?:商水|商电|商业水电|公寓水电|公寓标准)/,
    reason: "商业或公寓标准水电通常高于居民标准，需要结合单价和实际用量核算长期成本。",
    followUpQuestion: "水费、电费的每吨每度单价是多少？是否按表计量并提供账单或缴费凭证？",
  },
  {
    id: "unilateral-fee-adjustment",
    category: "fee",
    level: "high",
    title: "费用可能被单方调整",
    pattern: /(?:甲方|出租方|管理方).{0,16}(?:有权|可|可以).{0,16}(?:调整|变更|提高).{0,12}(?:费用|收费标准|管理费|服务费|水电费)/,
    reason: "条款允许一方在租期内调整收费，但没有约定触发条件、幅度或承租方退出机制。",
    followUpQuestion: "租期内费用是否固定？如需调整，能否约定客观依据、涨幅上限和提前通知期限？",
  },
  {
    id: "unclear-shared-costs",
    category: "fee",
    level: "medium",
    title: "公摊或共同费用计算不清",
    pattern: /(?:公摊水电|公共区域费用|公共能耗|共同费用).{0,18}(?:分摊|均摊|由乙方承担|另行结算)/,
    reason: "共同费用如果没有表计、分摊人数和计算公式，租客难以核对账单是否合理。",
    followUpQuestion: "公摊费用按什么公式计算？表计、人数、账单和每月明细能否提供？",
  },
  {
    id: "other-fees-catch-all",
    category: "fee",
    level: "medium",
    title: "存在兜底式其他收费",
    pattern: /(?:其他费用|其余费用|相关费用|一切费用).{0,12}(?:由乙方承担|由承租方承担|另行支付)/,
    reason: "“其他”或“一切费用”范围过宽，可能把未列明的支出转由承租方承担。",
    followUpQuestion: "能否删除兜底表述，并把承租方需要承担的全部费用逐项列明？",
  },
  {
    id: "all-repairs-on-tenant",
    category: "repair",
    level: "high",
    title: "全部维修责任转由承租方承担",
    pattern: /(?:房屋|设施|设备|家具|家电|附属设施).{0,24}(?:全部|一切|所有).{0,10}(?:维修|修理).{0,12}(?:由乙方承担|由承租方承担|乙方负责|承租方负责)|(?:全部|一切|所有).{0,12}(?:维修费用|维修责任).{0,12}(?:由乙方承担|由承租方承担)/,
    reason: "条款没有区分自然损耗、房屋本体故障和承租方人为损坏，可能让租客承担本不应由自己负责的维修成本。",
    followUpQuestion: "能否区分自然损耗、房屋本体及设备故障与承租方人为损坏，并分别约定责任？",
  },
  {
    id: "structural-repairs-on-tenant",
    category: "repair",
    level: "high",
    title: "房屋本体或隐蔽工程维修责任不清",
    pattern: /(?:漏水|渗水|墙体|屋顶|管道|线路|电路|燃气|防水).{0,18}(?:维修|更换|修复).{0,12}(?:由乙方承担|由承租方承担|乙方负责|承租方负责)/,
    reason: "房屋本体、管线或隐蔽工程故障通常金额较高，承租方不应在原因未核实前承担全部责任。",
    followUpQuestion: "房屋本体、管线和隐蔽工程故障由谁报修并承担费用？紧急情况的处理时限是多少？",
  },
  {
    id: "landlord-no-repair-liability",
    category: "repair",
    level: "high",
    title: "出租方可能完全免除维修责任",
    pattern: /(?:甲方|出租方).{0,18}(?:不承担|概不承担|不负责).{0,12}(?:维修|修理|更换|维护)/,
    reason: "完全免除出租方维修义务，可能导致影响基本居住的故障无法及时处理。",
    followUpQuestion: "影响安全和基本居住的故障由谁负责？能否写明出租方响应、维修和费用承担时限？",
  },
  {
    id: "repair-deduction-prohibited",
    category: "repair",
    level: "medium",
    title: "紧急维修后的费用处理方式缺失",
    pattern: /(?:乙方|承租方).{0,18}(?:不得|无权).{0,12}(?:垫付|自行维修|从租金中扣除|抵扣租金)/,
    reason: "条款限制承租方处理紧急故障，但没有说明出租方不响应时的替代流程。",
    followUpQuestion: "出租方逾期不维修时，承租方能否在留存证据并通知后代为维修并据实结算？",
  },
  {
    id: "vague-repair-standard",
    category: "repair",
    level: "medium",
    title: "维修责任采用模糊归责",
    pattern: /(?:维修|损坏).{0,16}(?:视情况|酌情|由甲方认定|以甲方判断|以出租方判断)/,
    reason: "由单方判断损坏原因和费用，缺少验收记录、维修凭证与争议处理依据。",
    followUpQuestion: "损坏原因如何认定？能否以入住交接清单、照片、维修单和双方确认记录为准？",
  },
];

function extractEvidence(text: string, match: RegExpMatchArray) {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 18);
  const end = Math.min(text.length, index + match[0].length + 18);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";

  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function createFinding(rule: ContractRiskRule, text: string): ContractRiskFinding | null {
  const match = text.match(rule.pattern);

  if (!match) {
    return null;
  }

  return {
    id: rule.id,
    category: rule.category,
    level: rule.level,
    title: rule.title,
    evidence: extractEvidence(text, match),
    reason: rule.reason,
    followUpQuestion: rule.followUpQuestion,
  };
}

function hasDepositReturnDeadline(text: string) {
  return (
    /押金.{0,24}\d+\s*(?:个)?(?:工作日|日|天).{0,12}(?:退还|返还)/.test(text) ||
    /\d+\s*(?:个)?(?:工作日|日|天).{0,18}(?:退还|返还).{0,10}押金/.test(text)
  );
}

function extractFeeNames(text: string) {
  const feeNames = [
    "物业费",
    "管理费",
    "服务费",
    "网络费",
    "网费",
    "保洁费",
    "卫生费",
    "水费",
    "电费",
    "燃气费",
    "供暖费",
    "停车费",
  ];

  return feeNames.filter((feeName) => text.includes(feeName));
}

function extractRepairScope(text: string) {
  const scopes = [
    "房屋本体",
    "家具",
    "家电",
    "附属设施",
    "水管",
    "管道",
    "电路",
    "燃气",
    "防水",
    "门锁",
  ];

  return scopes.filter((scope) => text.includes(scope));
}

function buildCompletenessFindings(text: string): ContractRiskFinding[] {
  const findings: ContractRiskFinding[] = [];

  if (text.includes("押金") && !hasDepositReturnDeadline(text)) {
    findings.push({
      id: "missing-deposit-return-deadline",
      category: "deposit",
      level: "medium",
      title: "未找到明确的押金退还时限",
      evidence: "合同提到押金，但未识别到退还押金的具体天数或工作日。",
      reason: "退还时间不明确，可能导致退租交接后长期等待或产生争议。",
      followUpQuestion: "能否约定完成退房验收和费用结清后多少个工作日内退还押金？",
    });
  }

  if (
    /(?:提前退租|违约|解除合同)/.test(text) &&
    !/(?:违约金.{0,16}(?:\d+|一个月|一月)|剩余租期.{0,20}(?:\d+(?:\.\d+)?%|百分之)|提前.{0,12}\d+\s*(?:日|天)|书面通知)/.test(text)
  ) {
    findings.push({
      id: "unclear-breach-formula",
      category: "breach",
      level: "medium",
      title: "违约责任缺少明确计算方式",
      evidence: "合同提到提前退租、违约或解除合同，但未识别到清晰的金额或通知期限。",
      reason: "只有“承担违约责任”等原则表述时，租客难以提前估算实际退出成本。",
      followUpQuestion: "能否写明违约金金额或上限、提前通知期限，以及可减免违约责任的情形？",
    });
  }

  return findings;
}

function getResultLevel(findings: ContractRiskFinding[]): RiskLevel {
  if (findings.some((finding) => finding.level === "high")) {
    return "high";
  }

  if (findings.some((finding) => finding.level === "medium")) {
    return "medium";
  }

  return "low";
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

export function scanContractRisk(contractText: string): ContractScanResult {
  const text = contractText.trim();
  const ruleFindings = contractRiskRules
    .map((rule) => createFinding(rule, text))
    .filter((finding): finding is ContractRiskFinding => Boolean(finding));
  const findings = [...ruleFindings, ...buildCompletenessFindings(text)];
  const level = getResultLevel(findings);
  const feeNames = extractFeeNames(text);
  const repairScopes = extractRepairScope(text);
  const detectedFacts = [
    /押[一二三四五六七八九十\d]+付[一二三四五六七八九十\d]+/.test(text)
      ? `付款方式：${text.match(/押[一二三四五六七八九十\d]+付[一二三四五六七八九十\d]+/)?.[0]}`
      : "付款方式：未识别到押付周期",
    hasDepositReturnDeadline(text) ? "押金退还：识别到明确时限" : "押金退还：未识别到明确时限",
    /(?:提前退租|解除合同)/.test(text) ? "提前退租：合同已提及" : "提前退租：未识别到相关约定",
    feeNames.length ? `提及费用：${feeNames.join("、")}` : "提及费用：未识别到租金外费用",
    repairScopes.length ? `维修范围：${repairScopes.join("、")}` : "维修范围：未识别到具体设施",
  ];

  return {
    level,
    summary:
      level === "high"
        ? "发现需要在签约前重点协商的押金、违约、费用或维修条款。"
        : level === "medium"
          ? "暂未发现明显极端条款，但有关键约定不够清楚。"
          : "在押金、违约、费用与维修范围内暂未发现明显风险信号，仍建议核对原文与完整合同。",
    findings,
    followUpQuestions: unique(findings.map((finding) => finding.followUpQuestion)),
    detectedFacts,
  };
}
