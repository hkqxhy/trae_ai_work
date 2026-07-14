import type { RouteConfig } from "../models/renting";

export const routes: RouteConfig[] = [
  {
    id: "overview",
    label: "工作台",
    description: "总览租房决策进度与下一步行动。",
  },
  {
    id: "profile",
    label: "需求画像",
    description: "收集城市、预算、通勤和偏好。",
  },
  {
    id: "scan",
    label: "房源扫描",
    description: "识别房源文案、截图和链接中的风险。",
  },
  {
    id: "candidates",
    label: "候选房源",
    description: "管理已保存的房源、备注与风险摘要。",
  },
  {
    id: "compare",
    label: "房源对比",
    description: "补充费用和通勤字段，生成综合推荐。",
  },
  {
    id: "checklist",
    label: "看房清单",
    description: "按房源风险生成线下核验任务。",
  },
  {
    id: "negotiate",
    label: "沟通助手",
    description: "整理中介或房东话术与沟通目标。",
  },
  {
    id: "contract",
    label: "合同检查",
    description: "粘贴租赁条款和费用明细进行风险检查。",
  },
  {
    id: "demo",
    label: "使用流程",
    description: "串联核心租房决策功能，快速走完整个流程。",
  },
];
