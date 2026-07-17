import type { AppRouteId } from "../models/renting";
import { DataManagementPanel } from "./DataManagementPanel";

interface DemoStep {
  id: string;
  title: string;
  route: AppRouteId;
  description: string;
  outcome: string;
}

const demoSteps: DemoStep[] = [
  {
    id: "profile",
    title: "先定义自己的判断基线",
    route: "profile",
    description: "填写城市、预算、通勤上限和必须满足项。没有完整画像时，系统不会假装了解你的需求。",
    outcome: "得到一份可修改的租房画像和筛选优先级。",
  },
  {
    id: "scan",
    title: "把房源材料转成核验任务",
    route: "scan",
    description: "粘贴文案、链接或图片，查看风险依据、来源和下一步追问，再保存值得继续看的房源。",
    outcome: "每条风险都有证据和核验状态，不只得到一个模糊分数。",
  },
  {
    id: "compare",
    title: "比较真实成本与取舍",
    route: "compare",
    description: "补充月租、服务费、水电、押金、中介费和通勤时间。信息不完整的房源不会参与可靠排名。",
    outcome: "看清月总成本、首期现金流和分项差异。",
  },
  {
    id: "checklist",
    title: "在线下形成现场结论",
    route: "checklist",
    description: "按房源风险生成定制清单，记录现场事实、待追问问题，并选择继续、暂缓或淘汰。",
    outcome: "看房结果保存在对应候选下，回到工作台仍能继续。",
  },
  {
    id: "negotiate",
    title: "审查准备发送的回复",
    route: "negotiate",
    description: "根据目标生成可编辑回复，并检查新增金额、付款承诺、法律断言和隐私信息。",
    outcome: "所有消息都由你确认后自行发送。",
  },
  {
    id: "contract",
    title: "在付款和签署前复核合同",
    route: "contract",
    description: "把合同关联到候选，检查押金、违约、额外费用和维修责任，并保留每次版本记录。",
    outcome: "回看条款变化和仍需协商的问题；结果不替代法律意见。",
  },
];

interface DemoPageProps {
  candidateCount: number;
  onNavigate: (route: AppRouteId) => void;
  onLoadDemoData: () => void;
  onClearData: () => void;
  onExportData: () => string;
  onImportData: (rawText: string) => { candidateCount: number };
}

const demoAbilities = [
  "房源风险扫描",
  "多房源对比决策",
  "看房排雷清单",
  "沟通回复生成",
  "合同风险检查",
];

export function DemoPage({
  candidateCount,
  onNavigate,
  onLoadDemoData,
  onClearData,
  onExportData,
  onImportData,
}: DemoPageProps) {
  return (
    <div className="demo-workspace">
      <section className="panel demo-hero">
        <div className="panel-heading">
          <p className="section-kicker">完整使用流程</p>
          <h2>从需求到签约前复核，按顺序完成关键判断</h2>
          <p>这套流程把容易遗漏的租房判断拆成六个可恢复步骤。你可以随时离开，再从工作台继续。</p>
        </div>
        <div className="demo-readiness">
          <span>准备状态</span>
          <strong>{candidateCount >= 2 ? "候选数据已就绪" : "建议先保存 2 个候选"}</strong>
          <small>当前已保存 {candidateCount} 个候选房源</small>
        </div>
      </section>

      <section className="panel demo-entry">
        <div className="panel-heading">
          <p className="section-kicker">了解产品</p>
          <h2>先用示例熟悉流程，再换成自己的材料</h2>
          <p>示例画像和房源只会在你主动点击后写入当前浏览器，可以随时清除。</p>
        </div>
        <ul className="demo-abilities">
          {demoAbilities.map((ability) => (
            <li key={ability}>{ability}</li>
          ))}
        </ul>
        <p className="demo-entry-path">如果已经有真实房源，可以直接从「房源扫描」开始，不必加载示例。</p>
        <div className="demo-entry-actions">
          <button className="button primary" type="button" onClick={onLoadDemoData}>
            一键加载示例数据
          </button>
        </div>
      </section>

      <section className="demo-timeline" aria-label="完整使用步骤">
        {demoSteps.map((step, index) => (
          <article className="panel demo-step" key={step.id}>
            <div className="demo-step-index">
              <span>{index + 1}</span>
            </div>
            <div className="demo-step-body">
              <h3>{step.title}</h3>
              <dl>
                <div>
                  <dt>怎么做</dt>
                  <dd>{step.description}</dd>
                </div>
                <div>
                  <dt>完成后得到</dt>
                  <dd>{step.outcome}</dd>
                </div>
              </dl>
            </div>
            <button className="button secondary" type="button" onClick={() => onNavigate(step.route)}>
              打开这一步
            </button>
          </article>
        ))}
      </section>

      <section className="panel demo-closing">
        <strong>产品边界</strong>
        <p>
          租房雷达把需求画像、房源扫描、候选对比、看房核验和合同检查串成一个连续过程，帮助租客降低信息不对称，而不是替用户做决定。
        </p>
      </section>

      <DataManagementPanel
        candidateCount={candidateCount}
        onClearData={onClearData}
        onExportData={onExportData}
        onImportData={onImportData}
      />
    </div>
  );
}
