import type { ViewingChecklistCategory, ViewingChecklistItem } from "../models/renting";

export const checklistCategoryLabels: Record<ViewingChecklistCategory, string> = {
  identity: "身份与出租权",
  cost: "费用与付款",
  condition: "房屋状况",
  environment: "环境与通勤",
  evidence: "合同与证据",
};

export const generalViewingChecklist: ViewingChecklistItem[] = [
  {
    id: "identity-owner",
    category: "identity",
    title: "确认出租人身份",
    method: "核对房东身份证与产权证明；中介或转租人需出示委托或转租授权。",
    warningSign: "收款人、签约人和产权人不一致，且无法解释授权关系。",
  },
  {
    id: "identity-address",
    category: "identity",
    title: "核对房屋地址与房号",
    method: "现场地址、产权材料、合同地址应保持一致。",
    warningSign: "只愿意口头说明地址，合同中使用模糊位置或不同房号。",
  },
  {
    id: "cost-total",
    category: "cost",
    title: "计算真实月成本",
    method: "记录月租、水电、物业、网络、管理、保洁和服务费。",
    warningSign: "只强调低月租，其他费用到签约时才披露。",
  },
  {
    id: "cost-payment",
    category: "cost",
    title: "确认押金和付款周期",
    method: "问清押几付几、首期金额、押金退还时间和扣款条件。",
    warningSign: "看房前催交定金，或押金退还条件只做口头承诺。",
  },
  {
    id: "condition-water",
    category: "condition",
    title: "测试水压、排水和热水",
    method: "同时打开水龙头与淋浴，冲水并观察排水速度和热水稳定性。",
    warningSign: "水压明显不足、排水反涌、热水忽冷忽热或卫生间反味。",
  },
  {
    id: "condition-moisture",
    category: "condition",
    title: "检查渗水、霉斑和墙体",
    method: "查看窗边、墙角、踢脚线、卫生间吊顶和柜体背面。",
    warningSign: "墙皮起泡、霉味明显、临时粉刷或房东回避漏水历史。",
  },
  {
    id: "condition-safety",
    category: "condition",
    title: "检查门锁、电路和燃气",
    method: "测试门窗锁具、插座、漏电保护器、燃气阀和烟雾报警器。",
    warningSign: "线路外露、插座发热、门锁不能更换或燃气设备老化。",
  },
  {
    id: "condition-layout",
    category: "condition",
    title: "确认采光、通风与房间结构",
    method: "白天观察自然采光，确认卧室有窗，并了解是否存在隔断改造。",
    warningSign: "无窗暗间、客厅隔断、窗外被完全遮挡或通风明显不足。",
  },
  {
    id: "environment-noise",
    category: "environment",
    title: "分别检查白天与夜间噪音",
    method: "关闭门窗静听楼道、道路、施工、商铺和邻居声音。",
    warningSign: "靠近高架、酒吧、施工点，或房东阻止夜间再次看房。",
  },
  {
    id: "environment-commute",
    category: "environment",
    title: "实测通勤与生活距离",
    method: "用常用地图查看工作日高峰时间，并实走地铁站和生活设施。",
    warningSign: "宣传距离使用直线距离，实际步行绕行或高峰通勤差异很大。",
  },
  {
    id: "evidence-video",
    category: "evidence",
    title: "记录交付前房屋现状",
    method: "连续拍摄房间、家具、电器、水表、电表和已有损坏。",
    warningSign: "对方不允许拍摄，或拒绝把现有损坏写入交接单。",
  },
  {
    id: "evidence-contract",
    category: "evidence",
    title: "带走合同模板后再决定",
    method: "重点查看租期、维修、提前退租、转租、违约和押金条款。",
    warningSign: "要求现场立即签约，不允许提前阅读或修改明显不合理条款。",
  },
];
