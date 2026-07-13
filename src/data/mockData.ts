import type { RentalListing, RentingProfile } from "../models/renting";

export const starterProfile: RentingProfile = {
  city: "杭州",
  commuteTarget: "未来科技城",
  monthlyBudgetMin: 2500,
  monthlyBudgetMax: 3600,
  maxCommuteMinutes: 45,
  acceptsSharedHousing: false,
  preferences: [
    { id: "metro", label: "靠近地铁", level: "must" },
    { id: "sunlight", label: "采光稳定", level: "preferred" },
    { id: "kitchen", label: "可以做饭", level: "preferred" },
    { id: "noise", label: "夜间安静", level: "must" },
  ],
};

export const sampleListings: RentalListing[] = [
  {
    id: "listing-a",
    title: "朝南一居室",
    district: "余杭区",
    sourceType: "landlord",
    commuteMinutes: 32,
    metroDistanceMeters: 780,
    cost: {
      rent: 3200,
      deposit: "押一付一",
      agencyFee: "无",
      extraFees: ["民水民电"],
    },
    risks: [
      {
        id: "risk-a-1",
        level: "low",
        title: "费用信息较完整",
        reason: "租金、押金、中介费与水电性质均已说明。",
        followUpQuestion: "能否提前发送合同模板确认退租条款？",
      },
    ],
    recommendationScore: 84,
  },
  {
    id: "listing-b",
    title: "急转精装公寓",
    district: "西湖区",
    sourceType: "unknown",
    commuteMinutes: 48,
    cost: {
      rent: 2100,
      deposit: "先交定金留房",
      agencyFee: "好商量",
      extraFees: ["公寓水电"],
    },
    risks: [
      {
        id: "risk-b-1",
        level: "high",
        title: "催定金与地址不透明",
        reason: "发布者要求先交定金，但尚未提供完整地址和合同主体。",
        followUpQuestion: "收款方是谁？是否能先提供房东授权证明和合同模板？",
      },
    ],
    recommendationScore: 42,
  },
];
