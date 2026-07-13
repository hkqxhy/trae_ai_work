import type {
  ListingRisk,
  ListingScanInput,
  ListingScanResult,
  RentingProfile,
  RiskLevel,
} from "../models/renting";
import { buildProfileSummary } from "./profileSummary";

interface RiskRule {
  id: string;
  level: RiskLevel;
  weight: number;
  keywords: string[];
  title: string;
  reason: string;
  followUpQuestion: string;
}

const riskRules: RiskRule[] = [
  {
    id: "deposit-before-viewing",
    level: "high",
    weight: 18,
    keywords: ["先交定金", "定金留房", "交定金", "留房费", "转账留房", "定下来先转"],
    title: "提前收取定金",
    reason: "房源尚未完成身份、地址和合同核验前要求转账，存在资金安全风险。",
    followUpQuestion: "定金是否可退？收款方是谁？能否先提供合同主体、房东授权证明和费用明细？",
  },
  {
    id: "pressure-language",
    level: "medium",
    weight: 10,
    keywords: ["今天不定", "手慢无", "马上没了", "急出", "今晚定", "不租就没了", "很多人看"],
    title: "催促决策话术",
    reason: "对方用紧迫感压缩核验时间，容易让租客跳过必要检查。",
    followUpQuestion: "能否先安排实地看房，并在核对合同和费用后再决定？",
  },
  {
    id: "hidden-address",
    level: "high",
    weight: 14,
    keywords: ["具体地址看房再说", "地址看房再说", "不发地址", "附近小区", "地铁口附近", "位置私聊"],
    title: "地址信息不透明",
    reason: "缺少小区、楼栋或距离信息，无法提前判断通勤、周边环境和价格合理性。",
    followUpQuestion: "请提供小区名称、楼栋范围、最近地铁站和实际步行距离。",
  },
  {
    id: "commercial-utilities",
    level: "medium",
    weight: 10,
    keywords: ["商水", "商电", "公寓水电", "公寓标准", "水电另算", "管理费", "服务费"],
    title: "长期费用可能偏高",
    reason: "公寓水电、商水商电或额外管理费会显著影响真实月成本。",
    followUpQuestion: "水电单价、管理费、网费、物业费和保洁费分别是多少？是否写入合同？",
  },
  {
    id: "contract-later",
    level: "high",
    weight: 15,
    keywords: ["合同后面发", "合同看房后发", "统一发合同", "先定再签", "合同都一样"],
    title: "合同条款未提前透明",
    reason: "押金退还、违约责任、维修责任和提前退租规则需要在付款前确认。",
    followUpQuestion: "能否在转账或签约前发送合同模板，重点确认押金、维修和提前退租条款？",
  },
  {
    id: "source-unclear",
    level: "medium",
    weight: 9,
    keywords: ["个人转租", "帮朋友发", "二房东", "代发", "房东忙", "室友转租"],
    title: "发布者身份需要核验",
    reason: "转租、代发或二房东场景中，授权链条不清会增加合同和押金风险。",
    followUpQuestion: "发布者是房东、中介还是转租人？是否能提供产权证明、委托书或原合同授权？",
  },
  {
    id: "photo-overclaim",
    level: "low",
    weight: 5,
    keywords: ["照片实拍", "精装修", "拎包入住", "图片真实", "真实图片", "无滤镜"],
    title: "图片信息仍需二次确认",
    reason: "图片可能存在时间差、角度选择或样板间问题，需要用视频和细节照片核验。",
    followUpQuestion: "能否提供带当天时间的视频，包含窗外、厨房、卫生间、门锁和墙角？",
  },
  {
    id: "partition-risk",
    level: "high",
    weight: 16,
    keywords: ["隔断", "改造间", "客厅房", "暗间", "无窗"],
    title: "疑似隔断或居住条件较差",
    reason: "隔断、暗间或无窗房源可能影响安全、通风、采光和居住合规性。",
    followUpQuestion: "房间是否为合规卧室？是否有独立窗户、消防通道和原始户型图？",
  },
];

const defaultQuestions = [
  "房源发布者是房东本人、中介、二房东还是转租人？是否能提供对应证明？",
  "总费用包含哪些项目？押金、中介费、物业费、水电网费分别是多少？",
  "是否允许提前退租？违约金和押金退还条件如何写在合同里？",
];

export const riskyListingSample =
  "转租急出！地铁口精装一居，月租 1800，照片都是实拍，今天不定就没了。可押一付一，先交 500 定金留房。具体地址看房再说，中介费好商量，水电按公寓标准收，合同后面统一发。";

export const saferListingSample =
  "房东直租，朝南一居室，月租 3200，押一付一，无中介费。小区名可提前提供，距离地铁站步行 8 分钟。水电民用，合同模板可先发，支持晚上看房确认噪音。";

export const xiaohongshuLinkSample =
  "https://www.xiaohongshu.com/explore/renting-demo\n小红书帖子说：近地铁精装一居，图片很好看，私信发地址，先交 300 定金留房，水电按公寓标准。";

export function createEmptyScanInput(): ListingScanInput {
  return {
    mode: "text",
    text: riskyListingSample,
    url: "",
    imageNotes: "",
    images: [],
  };
}

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractRent(text: string) {
  const rentMatch = text.match(/(?:月租|租金|房租)?\s*(\d{3,5})\s*(?:元|块)?\s*(?:\/月|每月|一个月|月)?/);
  return rentMatch ? Number(rentMatch[1]) : undefined;
}

function getLevelFromScore(score: number): RiskLevel {
  if (score < 55) {
    return "high";
  }

  if (score < 75) {
    return "medium";
  }

  return "low";
}

function getVerdict(level: RiskLevel) {
  if (level === "high") {
    return "风险偏高，转账或签约前必须核验";
  }

  if (level === "medium") {
    return "存在疑点，建议带着问题谨慎约看";
  }

  return "信息相对完整，可以继续核验";
}

function getRecommendation(level: RiskLevel) {
  if (level === "high") {
    return "先不要支付定金或押金，优先要求完整地址、身份链路、费用明细和合同模板。";
  }

  if (level === "medium") {
    return "可以继续沟通，但要把费用、身份、合同和现场检查问题逐条确认。";
  }

  return "可以进入约看阶段，同时保留聊天记录和房屋现状证据。";
}

function uniqueTexts(items: string[]) {
  return Array.from(new Set(items));
}

function getTextForRules(input: ListingScanInput) {
  return [input.text, input.url, input.imageNotes].filter(Boolean).join("\n").trim();
}

function getPlatformName(url: string) {
  if (!url.trim()) {
    return "未提供链接";
  }

  try {
    const hostname = new URL(url.trim()).hostname.toLowerCase();

    if (hostname.includes("xiaohongshu") || hostname.includes("xhslink")) {
      return "小红书";
    }

    if (hostname.includes("douban")) {
      return "豆瓣";
    }

    if (hostname.includes("58.com")) {
      return "58 同城";
    }

    if (hostname.includes("lianjia")) {
      return "链家";
    }

    if (hostname.includes("ziroom")) {
      return "自如";
    }

    if (hostname.includes("anjuke")) {
      return "安居客";
    }

    return hostname;
  } catch {
    return "链接格式待确认";
  }
}

function buildLinkRisks(input: ListingScanInput): ListingRisk[] {
  if (!input.url.trim()) {
    return [];
  }

  const platform = getPlatformName(input.url);
  const risks: ListingRisk[] = [];

  if (platform === "小红书" || platform === "豆瓣") {
    risks.push({
      id: "social-platform-verification",
      level: "medium",
      title: "社交平台房源需要二次核验",
      reason: "社交平台帖子更适合发现线索，但房源主体、费用和合同信息通常不完整。",
      followUpQuestion: "能否提供房东或中介身份、完整地址、费用明细、合同模板和线下看房安排？",
    });
  }

  if (platform === "链接格式待确认") {
    risks.push({
      id: "invalid-link-format",
      level: "medium",
      title: "链接格式无法识别",
      reason: "链接无法解析平台来源，系统无法判断信息来源和后续核验路径。",
      followUpQuestion: "能否提供可打开的原始链接，或补充房源截图和文字描述？",
    });
  }

  return risks;
}

function buildImageRisks(input: ListingScanInput): ListingRisk[] {
  if (!input.images.length) {
    return [];
  }

  const risks: ListingRisk[] = [
    {
      id: "image-needs-vision-model",
      level: "medium",
      title: "图片内容需要多模态模型进一步读取",
      reason: "图片可以作为证据补充，但房间结构、文字和异常痕迹仍建议结合现场核验确认。",
      followUpQuestion: "请补充图片中的关键文字，并在线下看房时重点核对对应细节。",
    },
    {
      id: "image-angle-verification",
      level: "low",
      title: "房源图片需要补齐关键角度",
      reason: "仅凭平台图片很难判断采光、通风、墙角发霉、卫生间反味和窗外环境。",
      followUpQuestion: "能否补充厨房、卫生间、窗外、门锁、墙角和楼道的视频或照片？",
    },
  ];

  const largeImages = input.images.filter((image) => image.size > 5 * 1024 * 1024);
  if (largeImages.length) {
    risks.push({
      id: "large-image-warning",
      level: "low",
      title: "图片文件较大",
      reason: "图片过大可能影响上传和处理速度。",
      followUpQuestion: "是否可以保留清晰度的同时压缩图片，或只上传关键房间细节？",
    });
  }

  return risks;
}

function buildModalityNotes(input: ListingScanInput) {
  const notes: string[] = [];
  const platform = getPlatformName(input.url);

  if (input.text.trim()) {
    notes.push("已读取文字描述，并使用本地规则识别价格、付款、地址、合同和身份风险。");
  }

  if (input.url.trim()) {
    notes.push(`已识别链接来源：${platform}。请把帖子关键文字粘贴到文本区，以提高判断准确度。`);
  }

  if (input.images.length) {
    notes.push(`已接收 ${input.images.length} 张图片。建议同时补充图片中的关键文字，便于和房源描述一起核对。`);
  }

  if (!notes.length) {
    notes.push("暂无可分析输入，请提供文字、链接或图片。");
  }

  return notes;
}

function buildProfileNotes(profile: RentingProfile, rent?: number) {
  const notes: string[] = [];
  const summary = buildProfileSummary(profile);

  notes.push(`当前画像：${summary.decisionBrief}`);

  if (rent) {
    if (rent < profile.monthlyBudgetMin * 0.75) {
      notes.push("房租明显低于你的预算下限，需要重点核验是否为虚假低价、隔断或额外收费。");
    } else if (rent > profile.monthlyBudgetMax) {
      notes.push("房租高于你的最高预算，建议确认是否包含物业、水电、网费等项目。");
    } else {
      notes.push("房租落在你的预算范围内，下一步重点看通勤、费用透明度和居住条件。");
    }
  } else {
    notes.push("输入中未识别到明确月租，建议先追问租金、押金、付款周期和额外费用。");
  }

  const mustHave = profile.preferences.filter((preference) => preference.level === "must");
  if (mustHave.length) {
    notes.push(`你的必须满足项是：${mustHave.map((preference) => preference.label).join("、")}。看房时应逐项确认。`);
  }

  return notes;
}

function buildAiPromptDraft(input: ListingScanInput, profile: RentingProfile) {
  return [
    "你是租客立场的多模态房源风险分析助手。",
    "请基于租房画像、文字、链接和图片信息，输出 JSON：score, verdict, risks, followUpQuestions, recommendation, evidenceNeeded。",
    `租房画像：${JSON.stringify(profile)}`,
    `输入模式：${input.mode}`,
    `链接：${input.url || "无"}`,
    `文字描述：${input.text || "无"}`,
    `图片数量：${input.images.length}`,
    `图片文件：${input.images.map((image) => `${image.name} (${image.type}, ${image.size} bytes)`).join("; ") || "无"}`,
    `图片备注或 OCR 文本：${input.imageNotes || "无"}`,
    "请特别检查：低价异常、定金/押金、发布者身份、地址透明度、商水商电、隔断暗间、合同条款、图片与文案是否矛盾。",
    "注意：只做风险提示和追问建议，不给法律结论，不制造恐慌。",
  ].join("\n");
}

function buildEmptyResult(input: ListingScanInput, profile: RentingProfile): ListingScanResult {
  return {
    score: 0,
    level: "high",
    verdict: "暂无可分析内容",
    recommendation: "请先提供文字、链接或图片，再进行扫描。",
    risks: [],
    followUpQuestions: defaultQuestions,
    detectedFacts: [{ label: "输入状态", value: "空输入" }],
    profileNotes: ["空输入无法判断风险，系统不会给出真实性结论。"],
    modalityNotes: buildModalityNotes(input),
    aiPromptDraft: buildAiPromptDraft(input, profile),
  };
}

export function scanListingRisk(input: ListingScanInput, profile: RentingProfile): ListingScanResult {
  const textForRules = getTextForRules(input);

  if (!textForRules && !input.images.length) {
    return buildEmptyResult(input, profile);
  }

  const rent = extractRent(textForRules);
  const matchedRules = riskRules.filter((rule) => includesAnyKeyword(textForRules, rule.keywords));
  const missingRisks: ListingRisk[] = [];

  if (textForRules && !/(房东|中介|转租|公寓|个人|自如|链家|安居客)/.test(textForRules)) {
    missingRisks.push({
      id: "missing-source",
      level: "medium",
      title: "发布者身份未明确",
      reason: "输入信息没有清晰说明是房东、中介、公寓机构还是转租人。",
      followUpQuestion: "请问发布者身份是什么？是否能提供房东授权、营业执照或转租授权？",
    });
  }

  if (textForRules && !/(押一付一|押一付二|押一付三|押二付一|押金)/.test(textForRules)) {
    missingRisks.push({
      id: "missing-payment",
      level: "medium",
      title: "付款方式缺失",
      reason: "输入信息没有明确押金和付款周期，实际启动成本可能高于预期。",
      followUpQuestion: "押金、付款周期、中介费和其他服务费分别是多少？",
    });
  }

  const ruleRisks: ListingRisk[] = matchedRules.map((rule) => ({
    id: rule.id,
    level: rule.level,
    title: rule.title,
    reason: rule.reason,
    followUpQuestion: rule.followUpQuestion,
  }));

  const allRisks = [
    ...ruleRisks,
    ...missingRisks,
    ...buildLinkRisks(input),
    ...buildImageRisks(input),
  ];
  const rulePenalty = matchedRules.reduce((total, rule) => total + rule.weight, 0);
  const inferredPenalty = allRisks
    .filter((risk) => !matchedRules.some((rule) => rule.id === risk.id))
    .reduce((total, risk) => total + (risk.level === "high" ? 14 : risk.level === "medium" ? 8 : 4), 0);
  const score = Math.max(18, Math.min(96, 92 - rulePenalty - inferredPenalty));
  const level = getLevelFromScore(score);
  const platform = getPlatformName(input.url);

  const detectedFacts = [
    { label: "输入类型", value: input.mode === "text" ? "文字" : input.mode === "link" ? "链接" : "图片" },
    { label: "链接来源", value: platform },
    { label: "图片数量", value: `${input.images.length} 张` },
    { label: "识别月租", value: rent ? `${rent} 元/月` : "未识别" },
    { label: "匹配风险", value: `${allRisks.length} 项` },
    { label: "预算范围", value: `${profile.monthlyBudgetMin} 到 ${profile.monthlyBudgetMax} 元/月` },
  ];

  const followUpQuestions = uniqueTexts([
    ...allRisks.map((risk) => risk.followUpQuestion),
    ...defaultQuestions,
  ]).slice(0, 7);

  return {
    score,
    level,
    verdict: getVerdict(level),
    recommendation: getRecommendation(level),
    risks: allRisks,
    followUpQuestions,
    detectedFacts,
    profileNotes: buildProfileNotes(profile, rent),
    modalityNotes: buildModalityNotes(input),
    aiPromptDraft: buildAiPromptDraft(input, profile),
  };
}
