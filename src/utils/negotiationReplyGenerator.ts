import type {
  NegotiationReplyResult,
  NegotiationReplyStyle,
  NegotiationScenario,
} from "../models/renting";

interface ScenarioRule {
  id: NegotiationScenario;
  label: string;
  keywords: string[];
  signals: string[];
  questions: string[];
}

const scenarioRules: ScenarioRule[] = [
  {
    id: "deposit",
    label: "定金与催付款",
    keywords: ["定金", "锁房", "先转", "留房", "不退"],
    signals: ["对方要求在完整核验前付款", "定金退还规则可能不清晰"],
    questions: ["收款方和签约主体是否一致？", "定金可退条件能否写入书面协议？"],
  },
  {
    id: "fees",
    label: "费用与额外收费",
    keywords: ["物业费", "服务费", "管理费", "网费", "维修费", "水电"],
    signals: ["可能存在租金之外的固定费用", "真实月成本需要重新计算"],
    questions: ["每月固定费用和计费单价分别是多少？", "是否还有合同中未列出的服务费？"],
  },
  {
    id: "contract",
    label: "合同与条款透明度",
    keywords: ["合同以后", "合同当天", "到时候写", "合同都一样", "先签"],
    signals: ["合同未提前提供", "重要承诺可能尚未写入合同"],
    questions: ["能否提前发送完整合同模板？", "口头承诺能否补充为合同条款？"],
  },
  {
    id: "identity",
    label: "身份与出租授权",
    keywords: ["二房东", "转租", "代签", "帮朋友", "授权"],
    signals: ["签约或出租授权关系需要核验"],
    questions: ["产权人、签约人和收款人分别是谁？", "能否提供委托或转租授权？"],
  },
  {
    id: "termination",
    label: "提前退租与违约",
    keywords: ["提前退租", "违约", "押金不退", "不能转租"],
    signals: ["提前退租成本可能较高", "违约责任可能不对等"],
    questions: ["提前退租需要承担多少费用？", "是否允许找到承租人后转租或换租？"],
  },
];

export function generateNegotiationReply(
  message: string,
  goal: string,
  style: NegotiationReplyStyle,
): NegotiationReplyResult {
  const normalizedMessage = message.trim();
  const matchedRule =
    scenarioRules.find((rule) => rule.keywords.some((keyword) => normalizedMessage.includes(keyword))) ??
    getGeneralRule();
  const reply = buildReply(matchedRule, goal.trim(), style);

  return {
    scenario: matchedRule.id,
    scenarioLabel: matchedRule.label,
    reply,
    detectedSignals: matchedRule.signals,
    nextQuestions: matchedRule.questions,
  };
}

function buildReply(rule: ScenarioRule, goal: string, style: NegotiationReplyStyle) {
  const goalText = goal || "在付款或签约前把相关信息确认清楚";
  const questionText = rule.questions.join("另外，");

  if (style === "firm") {
    return `我需要先说明，我不会在身份、费用和合同信息未核验完整前付款或签约。我的目标是${goalText}。请先明确：${questionText}。相关内容确认并形成书面记录后，我再决定是否继续。`;
  }

  if (style === "inquisitive") {
    return `我还需要补充确认一些信息，再决定下一步。我的目标是${goalText}。请问：${questionText}？也请把对应材料或费用明细一并发给我，谢谢。`;
  }

  return `谢谢说明，我对房源仍有兴趣。为了稳妥推进，我希望先${goalText}。麻烦帮我确认：${questionText}。信息核对清楚后，我会尽快给出决定，谢谢。`;
}

function getGeneralRule(): ScenarioRule {
  return {
    id: "general",
    label: "一般租房沟通",
    keywords: [],
    signals: ["暂未识别到明确的高风险话术"],
    questions: ["相关费用和付款节点能否完整说明？", "重要承诺能否写入合同或聊天记录？"],
  };
}
