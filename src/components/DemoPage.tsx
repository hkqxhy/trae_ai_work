import type { AppRouteId } from "../models/renting";

interface DemoStep {
  id: string;
  time: string;
  title: string;
  route: AppRouteId;
  action: string;
  narration: string;
  proof: string;
}

const demoSteps: DemoStep[] = [
  {
    id: "positioning",
    time: "0:00–0:20",
    title: "说明问题与产品定位",
    route: "overview",
    action: "展示工作台和当前租房画像摘要。",
    narration: "租房雷达不是房源交易平台，而是把分散信息变成可验证、可比较、可解释的决策依据。",
    proof: "观众能在 20 秒内理解产品服务谁、解决什么问题。",
  },
  {
    id: "profile",
    time: "0:20–0:45",
    title: "建立租房需求画像",
    route: "profile",
    action: "确认城市、预算、通勤上限和必须满足项，点击保存画像。",
    narration: "先明确自己的约束，后续风险判断和推荐才不会脱离真实需求。",
    proof: "保存后展示画像摘要与优先级排序。",
  },
  {
    id: "scan",
    time: "0:45–1:25",
    title: "扫描高风险房源并保存候选",
    route: "scan",
    action: "加载高风险示例，展示评分、风险理由和追问，再保存为候选。",
    narration: "系统不会只给一个风险标签，而会解释触发依据，并生成约看或转账前应确认的问题。",
    proof: "展示可信度评分、风险卡片、追问清单和保存成功提示。",
  },
  {
    id: "compare",
    time: "1:25–1:55",
    title: "比较多个候选房源",
    route: "compare",
    action: "补充总月成本、首期成本和通勤时间，查看综合推荐分。",
    narration: "对比同时考虑预算、通勤、风险与信息完整度，避免只看最低租金。",
    proof: "展示优先候选、分项得分和决策解释。",
  },
  {
    id: "checklist",
    time: "1:55–2:25",
    title: "生成线下看房排雷清单",
    route: "checklist",
    action: "选择候选房源，展示由线上风险转换出的现场检查项。",
    narration: "线上发现的疑点会继续进入线下核验，形成从信息识别到现场取证的闭环。",
    proof: "勾选检查项并保存现场总结或待追问事项。",
  },
  {
    id: "contract",
    time: "2:25–3:00",
    title: "检查合同并收束价值",
    route: "contract",
    action: "加载高风险合同示例，扫描押金、违约、费用和维修责任。",
    narration: "签约前把口头承诺和合同条款再次核对，结果只做风险提示和追问建议，不替代法律意见。",
    proof: "展示原文依据、风险理由和协商问题，最后回到完整决策闭环。",
  },
];

interface DemoPageProps {
  candidateCount: number;
  onNavigate: (route: AppRouteId) => void;
  onLoadDemoData: () => void;
}

const demoAbilities = [
  "房源风险扫描",
  "多房源对比决策",
  "看房排雷清单",
  "沟通回复生成",
  "合同风险检查",
];

export function DemoPage({ candidateCount, onNavigate, onLoadDemoData }: DemoPageProps) {
  return (
    <div className="demo-workspace">
      <section className="panel demo-hero">
        <div className="panel-heading">
          <p className="section-kicker">完整使用流程</p>
          <h2>从“我想租什么”走到“这份合同能不能签”</h2>
          <p>按下面顺序体验核心链路。每一步都给出操作、说明和可见结果。</p>
        </div>
        <div className="demo-readiness">
          <span>准备状态</span>
          <strong>{candidateCount >= 2 ? "候选数据已就绪" : "建议先保存 2 个候选"}</strong>
          <small>当前已保存 {candidateCount} 个候选房源</small>
        </div>
      </section>

      <section className="panel demo-entry">
        <div className="panel-heading">
          <p className="section-kicker">快速体验入口</p>
          <h2>面向陌生城市租房者的 AI 决策助手</h2>
          <p>把分散信息变成可验证、可比较、可解释的决策依据。</p>
        </div>
        <ul className="demo-abilities">
          {demoAbilities.map((ability) => (
            <li key={ability}>{ability}</li>
          ))}
        </ul>
        <p className="demo-entry-path">
          建议从「需求画像」开始，依次体验扫描、对比、看房和合同检查，约 3 分钟走完完整链路。
        </p>
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
              <strong>{step.time}</strong>
            </div>
            <div className="demo-step-body">
              <h3>{step.title}</h3>
              <dl>
                <div>
                  <dt>现场操作</dt>
                  <dd>{step.action}</dd>
                </div>
                <div>
                  <dt>讲解话术</dt>
                  <dd>{step.narration}</dd>
                </div>
                <div>
                  <dt>验收信号</dt>
                  <dd>{step.proof}</dd>
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
        <strong>结束语</strong>
        <p>
          租房雷达把需求画像、房源扫描、候选对比、看房核验和合同检查串成一个连续过程，帮助租客降低信息不对称，而不是替用户做决定。
        </p>
      </section>
    </div>
  );
}
