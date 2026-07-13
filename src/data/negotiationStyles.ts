import type { NegotiationStyleOption } from "../models/renting";

export const negotiationStyles: NegotiationStyleOption[] = [
  {
    id: "gentle",
    label: "温和沟通",
    description: "保持合作意愿，用礼貌表达提出核验和协商要求。",
    principles: [
      "先表达对房源或合作的兴趣",
      "用请求式语言提出材料和时间需求",
      "避免直接质疑对方诚信",
    ],
  },
  {
    id: "firm",
    label: "坚定边界",
    description: "明确不可接受的条件，减少被催促或模糊承诺影响。",
    principles: [
      "直接说明付款、签约和身份核验底线",
      "不给含糊承诺留下误解空间",
      "必要时清晰表达暂停或拒绝交易",
    ],
  },
  {
    id: "inquisitive",
    label: "继续追问",
    description: "暂不表态，通过结构化问题补齐费用、合同和身份信息。",
    principles: [
      "一次只确认一个关键事实",
      "要求数字、文件或具体时间作为回答",
      "记录仍未回答和前后矛盾的信息",
    ],
  },
];
