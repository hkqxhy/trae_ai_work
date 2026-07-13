import type {
  CandidateListing,
  ListingRisk,
  ViewingChecklistCategory,
  ViewingChecklistItem,
} from "../models/renting";

interface RiskChecklistTemplate {
  category: ViewingChecklistCategory;
  title: string;
  method: string;
  warningSign: string;
}

const riskChecklistTemplates: Record<string, RiskChecklistTemplate> = {
  "deposit-before-viewing": {
    category: "cost",
    title: "现场核对定金收款主体",
    method: "付款前核对收款账户、签约主体和出租授权，并要求定金规则写入书面协议。",
    warningSign: "收款人不是签约人，或对方只承诺口头可退，不愿提供收据。",
  },
  "pressure-language": {
    category: "evidence",
    title: "拒绝被催促现场签约",
    method: "带走合同和费用明细，至少完成身份、房屋和付款信息核验后再决定。",
    warningSign: "反复强调必须立即转账，拒绝预留合理的核验时间。",
  },
  "hidden-address": {
    category: "environment",
    title: "核对真实地址和周边路线",
    method: "现场确认小区、楼栋、房号，并实走地铁站、公交站和夜间回家路线。",
    warningSign: "实际位置与宣传不符，或看房时临时更换到另一套房。",
  },
  "commercial-utilities": {
    category: "cost",
    title: "查看近期水电和服务费账单",
    method: "要求查看最近两个月账单，记录水电单价、管理费、网费和其他固定费用。",
    warningSign: "拒绝展示历史账单，或费用单价明显高于事先描述。",
  },
  "contract-later": {
    category: "evidence",
    title: "现场索取完整合同模板",
    method: "确认租期、押金、维修、提前退租、违约和转租条款后再付款。",
    warningSign: "合同关键页缺失、现场临时增加条款，或不允许拍照带走阅读。",
  },
  "source-unclear": {
    category: "identity",
    title: "核验发布者与出租授权链",
    method: "核对产权人、发布者、签约人和收款人之间的关系，并查看委托或转租授权。",
    warningSign: "多人身份关系无法闭环，原房东不知情，或授权材料无法核验。",
  },
  "photo-overclaim": {
    category: "condition",
    title: "逐张核对图片与现场",
    method: "按平台图片角度核对家具、装修、窗外和房间面积，记录不一致处。",
    warningSign: "图片来自其他楼层或样板间，现场家具、采光和装修差异明显。",
  },
  "partition-risk": {
    category: "condition",
    title: "确认是否为合规卧室和隔断",
    method: "查看原始户型、墙体材质、独立窗户、消防通道和电路配置。",
    warningSign: "木板或轻质墙隔断、无独立窗、逃生路线受阻或多人共用临时电路。",
  },
  "missing-source": {
    category: "identity",
    title: "补齐房源发布者身份",
    method: "现场确认对方是房东、中介、机构还是转租人，并获取对应证明。",
    warningSign: "对方回避身份问题，或使用他人证件、账户签约收款。",
  },
  "missing-payment": {
    category: "cost",
    title: "现场确认完整付款方案",
    method: "列出押金、付款周期、中介费、服务费和首期总金额。",
    warningSign: "付款项目无法一次说清，签约时出现新的费用。",
  },
  "social-platform-verification": {
    category: "identity",
    title: "验证社交平台帖子对应真实房源",
    method: "要求发布者现场出示身份和授权，并核对帖子图片、地址与实际房屋。",
    warningSign: "帖子账号、看房联系人、签约主体和收款人互不一致。",
  },
  "invalid-link-format": {
    category: "evidence",
    title: "保存可验证的原始房源来源",
    method: "让对方提供可打开的原始页面，并保存页面截图、发布时间和发布账号。",
    warningSign: "链接反复失效、跳转到其他房源，或发布记录已被删除。",
  },
  "image-needs-vision-model": {
    category: "condition",
    title: "现场核对截图中无法确认的细节",
    method: "按照截图逐项检查房间结构、墙角、窗外、费用文字和聊天承诺。",
    warningSign: "现场与截图明显不一致，或对方阻止拍摄关键位置。",
  },
  "image-angle-verification": {
    category: "condition",
    title: "补拍平台图片缺失的关键角度",
    method: "拍摄厨房、卫生间、窗外、墙角、门锁、楼道和消防通道。",
    warningSign: "关键区域长期不展示，或只允许从固定角度看房。",
  },
};

export function buildCustomViewingChecklist(candidate: CandidateListing): ViewingChecklistItem[] {
  return candidate.scanResult.risks.map((risk) => {
    const template = riskChecklistTemplates[risk.id] ?? buildFallbackTemplate(risk);

    return {
      id: `custom-${candidate.id}-${risk.id}`,
      category: template.category,
      title: template.title,
      method: template.method,
      warningSign: template.warningSign,
    };
  });
}

function buildFallbackTemplate(risk: ListingRisk): RiskChecklistTemplate {
  return {
    category: inferCategory(risk),
    title: `现场核验：${risk.title}`,
    method: `${risk.followUpQuestion} 将回答和现场证据一起记录。`,
    warningSign: `现场情况无法解释该风险：${risk.reason}`,
  };
}

function inferCategory(risk: ListingRisk): ViewingChecklistCategory {
  const text = `${risk.title}${risk.reason}`;

  if (/(费用|押金|定金|水电|付款)/.test(text)) {
    return "cost";
  }

  if (/(身份|房东|中介|发布者|授权)/.test(text)) {
    return "identity";
  }

  if (/(图片|隔断|房间|采光|墙|窗)/.test(text)) {
    return "condition";
  }

  if (/(地址|位置|通勤|周边)/.test(text)) {
    return "environment";
  }

  return "evidence";
}
