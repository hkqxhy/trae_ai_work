import { useRef, useState } from "react";
import type { AiComparisonCandidateDecision, AiComparisonResult, AiRequestStatus } from "../models/ai";
import type { CandidateComparison, CandidateListing, RentingProfile, RiskLevel } from "../models/renting";
import { requestComparisonAiDecision } from "../api/aiClient";
import { scoreCandidateForComparison } from "../utils/comparisonScoring";
import { applyCalculatedRentalCosts, calculateRentalCosts } from "../utils/rentalCost";

interface ComparisonPageProps {
  candidates: CandidateListing[];
  profile: RentingProfile;
  onUpdateCandidate: (candidateId: string, comparison: CandidateComparison) => void;
  onDeleteCandidate: (candidateId: string) => void;
}

const riskLevelLabels: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

export function ComparisonPage({
  candidates,
  profile,
  onUpdateCandidate,
  onDeleteCandidate,
}: ComparisonPageProps) {
  const [aiStatus, setAiStatus] = useState<AiRequestStatus>("idle");
  const [aiResult, setAiResult] = useState<AiComparisonResult | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const localScoredCandidates = candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidateForComparison(candidate, profile),
    }))
    .sort((left, right) => {
      const comparableDifference = Number(right.score.isComparable) - Number(left.score.isComparable);
      return comparableDifference || right.score.score - left.score.score;
    });
  const aiDecisionMap = new Map(aiResult?.candidates.map((decision) => [decision.candidateId, decision]));
  const scoredCandidates = localScoredCandidates
    .map(({ candidate, score }) => {
      const aiDecision = aiDecisionMap.get(candidate.id);
      const hybridScore = aiDecision ? calculateHybridScore(score.score, aiDecision.aiScore, aiResult) : score.score;

      return {
        candidate,
        score,
        aiDecision,
        hybridScore,
      };
    })
    .sort((left, right) => {
      const comparableDifference = Number(right.score.isComparable) - Number(left.score.isComparable);
      return comparableDifference || right.hybridScore - left.hybridScore;
    });
  const topCandidate = scoredCandidates.find(({ score }) => score.isComparable) ?? scoredCandidates[0];
  const hasAiDecision = Boolean(aiResult);

  function updateCandidateComparison(candidateId: string, comparison: CandidateComparison) {
    resetAiDecision();
    onUpdateCandidate(candidateId, comparison);
  }

  function deleteCandidate(candidateId: string) {
    resetAiDecision();
    onDeleteCandidate(candidateId);
    setPendingDeleteId(null);
  }

  function updateCostBreakdown(candidate: CandidateListing, patch: CandidateComparison) {
    updateCandidateComparison(
      candidate.id,
      applyCalculatedRentalCosts({ ...candidate.comparison, ...patch }),
    );
  }

  async function runAiDecision() {
    if (localScoredCandidates.length < 2) {
      setAiStatus("insufficient_input");
      setAiErrorMessage("至少保存 2 个候选房源后，再运行 AI 混合决策。");
      return;
    }

    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiStatus("loading");
    setAiErrorMessage("");

    try {
      const result = await requestComparisonAiDecision(
        {
          profile,
          candidates: localScoredCandidates.map(({ candidate, score }) => ({
            id: candidate.id,
            candidateId: candidate.id,
            title: candidate.title,
            sourceLabel: candidate.sourceLabel,
            note: candidate.note,
            comparison: candidate.comparison,
            scanResult: candidate.scanResult,
            localScore: score,
          })),
        },
        controller.signal,
      );
      setAiResult(result);
      setAiStatus("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setAiStatus("idle");
        return;
      }

      setAiStatus("error");
      setAiErrorMessage(error instanceof Error ? error.message : "AI 决策服务暂时不可用，本地评分仍可继续使用。");
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null;
      }
    }
  }

  function cancelAiDecision() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStatus("idle");
  }

  function resetAiDecision() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStatus("idle");
    setAiResult(null);
    setAiErrorMessage("");
  }

  return (
    <div className="comparison-workspace">
      <section className="panel span-full">
        <div className="panel-heading">
          <p className="section-kicker">多房源对比</p>
          <h2>把候选房源放到同一张表里比较</h2>
          <p>
            对比表基于已保存候选房源。你可以补充费用和通勤字段，系统会结合预算、通勤上限和扫描风险给出推荐分；关键字段缺失时只显示“待补充”，不会参与可靠排名。
          </p>
        </div>
        {topCandidate ? (
          <div className="comparison-hero">
            <div>
              <span>{topCandidate.score.isComparable ? "当前优先候选" : "待补充信息"}</span>
              <strong>{topCandidate.candidate.title}</strong>
            </div>
            <div className="comparison-hero-score">
              <strong>{topCandidate.score.isComparable ? topCandidate.hybridScore : "待补充"}</strong>
              <span>{topCandidate.score.isComparable ? (hasAiDecision ? "混合推荐分" : "本地推荐分") : "补齐关键字段后排名"}</span>
            </div>
          </div>
        ) : null}
      </section>

      {candidates.length ? (
        <>
          <section className="panel span-full ai-comparison-panel">
            <div className="panel-heading">
              <p className="section-kicker">AI 辅助混合决策</p>
              <h2>本地规则 75% + AI 辅助 25%</h2>
              <p>
                本地评分负责预算、通勤、风险和信息完整度等硬指标；AI 只补充软性取舍、适合条件和缺失信息，生成后会得到透明的混合推荐分。
              </p>
            </div>
            <div className="ai-actions">
              <span>
                {aiStatus === "loading"
                  ? "正在请求千问生成辅助决策"
                  : aiResult
                    ? `${aiResult.metadata.provider} · ${aiResult.metadata.model} · 本地 ${formatWeight(aiResult.metadata.localWeight)} / AI ${formatWeight(aiResult.metadata.aiWeight)}`
                    : "至少 2 个候选房源时建议运行"}
              </span>
              <div>
                {aiStatus === "loading" ? (
                  <button className="button secondary" type="button" onClick={cancelAiDecision}>
                    取消
                  </button>
                ) : null}
                <button
                  className="button primary"
                  disabled={localScoredCandidates.length < 2 || aiStatus === "loading"}
                  type="button"
                  onClick={runAiDecision}
                >
                  {aiResult ? "重新 AI 辅助决策" : "AI 辅助决策"}
                </button>
              </div>
            </div>

            {aiStatus === "error" || aiStatus === "insufficient_input" ? (
              <div className="ai-empty-state error">
                <strong>AI 决策暂不可用</strong>
                <span>{aiErrorMessage}</span>
              </div>
            ) : null}

            {aiResult ? (
              <div className="ai-comparison-summary">
                <strong>{aiResult.summary}</strong>
                <p>{aiResult.disclaimer}</p>
                {aiResult.rankingRationale.length ? (
                  <ul className="advice-list">
                    {aiResult.rankingRationale.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="comparison-table-wrap span-full">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>房源</th>
                  <th>月租</th>
                  <th>总月成本</th>
                  <th>首期成本</th>
                  <th>通勤</th>
                  <th>地铁距离</th>
                  <th>风险</th>
                  <th>本地分</th>
                  <th>AI 分</th>
                  <th>混合分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {scoredCandidates.map(({ candidate, score, aiDecision, hybridScore }) => (
                  <tr key={candidate.id}>
                    <td>
                      <strong>{candidate.title}</strong>
                      <span>{candidate.sourceLabel}</span>
                    </td>
                    <td>
                      <NumberInput
                        label="月租"
                        value={candidate.comparison.monthlyRent}
                        onChange={(monthlyRent) => updateCostBreakdown(candidate, { monthlyRent })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        label="总月成本"
                        value={candidate.comparison.totalMonthlyCost}
                        onChange={(totalMonthlyCost) => updateCandidateComparison(candidate.id, { totalMonthlyCost })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        label="首期成本"
                        value={candidate.comparison.upfrontCost}
                        onChange={(upfrontCost) => updateCandidateComparison(candidate.id, { upfrontCost })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        label="通勤分钟"
                        value={candidate.comparison.commuteMinutes}
                        onChange={(commuteMinutes) => updateCandidateComparison(candidate.id, { commuteMinutes })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        label="地铁米数"
                        value={candidate.comparison.metroDistanceMeters}
                        onChange={(metroDistanceMeters) => updateCandidateComparison(candidate.id, { metroDistanceMeters })}
                      />
                    </td>
                    <td>
                      <span className={`risk-badge ${candidate.scanResult.level}`}>
                        {riskLevelLabels[candidate.scanResult.level]} · {candidate.scanResult.risks.length} 项
                      </span>
                    </td>
                    <td>
                      <strong className={score.isComparable && score.score < 60 ? "table-score danger" : "table-score"}>
                        {score.isComparable ? score.score : "待补充"}
                      </strong>
                    </td>
                    <td>
                      <strong className={score.isComparable && aiDecision && aiDecision.aiScore < 60 ? "table-score danger" : "table-score"}>
                        {score.isComparable ? (aiDecision?.aiScore ?? "待生成") : "待补充"}
                      </strong>
                    </td>
                    <td>
                      <strong className={score.isComparable && hybridScore < 60 ? "table-score danger" : "table-score"}>
                        {score.isComparable ? hybridScore : "待补充"}
                      </strong>
                    </td>
                    <td>
                      {pendingDeleteId === candidate.id ? (
                        <div className="table-delete-confirmation" role="alertdialog" aria-label={`删除 ${candidate.title}`}>
                          <button className="button danger-button" type="button" onClick={() => deleteCandidate(candidate.id)}>
                            确认删除
                          </button>
                          <button className="button secondary" type="button" onClick={() => setPendingDeleteId(null)}>
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          className="button secondary danger-button"
                          type="button"
                          onClick={() => setPendingDeleteId(candidate.id)}
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="comparison-card-grid span-full">
            {scoredCandidates.map(({ candidate, score, aiDecision, hybridScore }) => (
              <article className="comparison-explain-card" key={candidate.id}>
                <div className="comparison-explain-head">
                  <div>
                    <span>{candidate.sourceLabel}</span>
                    <h3>{candidate.title}</h3>
                  </div>
                  <strong>{score.isComparable ? hybridScore : "待补充"}</strong>
                </div>
                <div className="score-breakdown">
                  {aiResult && score.isComparable ? <span>混合 {hybridScore}</span> : null}
                  <span>{score.isComparable ? `本地 ${score.score}` : "本地 待补充"}</span>
                  {aiDecision && score.isComparable ? <span>AI {aiDecision.aiScore}</span> : null}
                  <span>风险 {score.riskScore}</span>
                  <span>预算 {score.budgetScore}</span>
                  <span>通勤 {score.commuteScore}</span>
                  <span>{score.isComparable ? `完整度 ${score.completenessScore}` : `缺少 ${score.requiredMissingFields.join("、")}`}</span>
                </div>
                <CostBreakdownEditor
                  candidateTitle={candidate.title}
                  comparison={candidate.comparison}
                  onChange={(patch) => updateCostBreakdown(candidate, patch)}
                />
                <ul className="advice-list">
                  {score.explanation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {aiDecision ? <AiDecisionBlock decision={aiDecision} /> : null}
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="panel empty-candidate-state span-full">
          <div className="panel-heading">
            <p className="section-kicker">暂无可对比房源</p>
            <h2>先从“房源扫描”保存候选</h2>
          </div>
          <p>至少保存 2 个候选房源后，对比表会更有决策价值。</p>
        </section>
      )}
    </div>
  );
}

interface CostBreakdownEditorProps {
  candidateTitle: string;
  comparison: CandidateComparison;
  onChange: (patch: CandidateComparison) => void;
}

function CostBreakdownEditor({ candidateTitle, comparison, onChange }: CostBreakdownEditorProps) {
  const calculated = calculateRentalCosts(comparison);

  return (
    <details className="cost-breakdown-editor">
      <summary>
        <span>真实成本明细</span>
        <strong>
          {calculated.totalMonthlyCost === undefined
            ? "待补充月租"
            : `约 ${formatCurrency(calculated.totalMonthlyCost)} / 月`}
        </strong>
      </summary>
      <p>补充经常性费用和押金规则，系统会自动回填总月成本与首期需要准备的金额。</p>
      <div className="cost-input-grid">
        <label>
          <span>月服务或管理费</span>
          <NumberInput
            label={`${candidateTitle} 月服务或管理费`}
            value={comparison.monthlyServiceFee}
            onChange={(monthlyServiceFee) => onChange({ monthlyServiceFee })}
          />
        </label>
        <label>
          <span>月水电网预估</span>
          <NumberInput
            label={`${candidateTitle} 月水电网预估`}
            value={comparison.monthlyUtilitiesEstimate}
            onChange={(monthlyUtilitiesEstimate) => onChange({ monthlyUtilitiesEstimate })}
          />
        </label>
        <label>
          <span>其他月费用</span>
          <NumberInput
            label={`${candidateTitle} 其他月费用`}
            value={comparison.otherMonthlyCost}
            onChange={(otherMonthlyCost) => onChange({ otherMonthlyCost })}
          />
        </label>
        <label>
          <span>押金月数</span>
          <NumberInput
            label={`${candidateTitle} 押金月数`}
            value={comparison.depositMonths}
            onChange={(depositMonths) => onChange({ depositMonths })}
          />
        </label>
        <label>
          <span>中介费</span>
          <NumberInput
            label={`${candidateTitle} 中介费`}
            value={comparison.agencyFee}
            onChange={(agencyFee) => onChange({ agencyFee })}
          />
        </label>
        <label>
          <span>其他一次性费用</span>
          <NumberInput
            label={`${candidateTitle} 其他一次性费用`}
            value={comparison.otherUpfrontCost}
            onChange={(otherUpfrontCost) => onChange({ otherUpfrontCost })}
          />
        </label>
      </div>
      <dl className="calculated-costs">
        <div>
          <dt>每月额外费用</dt>
          <dd>{formatCurrency(calculated.monthlyExtras)}</dd>
        </div>
        <div>
          <dt>押金金额</dt>
          <dd>{calculated.depositAmount === undefined ? "待确认押金规则" : formatCurrency(calculated.depositAmount)}</dd>
        </div>
        <div>
          <dt>首期准备</dt>
          <dd>{calculated.upfrontCost === undefined ? "待确认押金规则" : formatCurrency(calculated.upfrontCost)}</dd>
        </div>
      </dl>
    </details>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateHybridScore(localScore: number, aiScore: number, aiResult: AiComparisonResult | null) {
  const localWeight = aiResult?.metadata.localWeight ?? 0.75;
  const aiWeight = aiResult?.metadata.aiWeight ?? 0.25;

  return Math.round(localScore * localWeight + aiScore * aiWeight);
}

function formatWeight(weight: number) {
  return `${Math.round(weight * 100)}%`;
}

function AiDecisionBlock({ decision }: { decision: AiComparisonCandidateDecision }) {
  return (
    <div className="ai-decision-block">
      <div>
        <strong>AI 适合条件</strong>
        <p>{decision.suitableWhen}</p>
      </div>
      <div className="ai-follow-up-grid">
        <div>
          <strong>AI 看到的优势</strong>
          <ul>
            {decision.mainAdvantages.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>AI 提醒的代价</strong>
          <ul>
            {decision.mainTradeoffs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {decision.missingInformation.length ? (
        <div>
          <strong>仍缺信息</strong>
          <ul className="advice-list">
            {decision.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p>{decision.decisionNote}</p>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}

function NumberInput({ label, value, onChange }: NumberInputProps) {
  return (
    <input
      aria-label={label}
      min="0"
      placeholder="待补充"
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
    />
  );
}
