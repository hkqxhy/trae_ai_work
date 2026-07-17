import { useState } from "react";
import type {
  AppRouteId,
  CandidateListing,
  RiskLevel,
  RiskVerificationStatus,
} from "../models/renting";
import { loadContractReviews } from "../utils/contractReviewStorage";
import { loadViewingNotes, viewingDecisionLabels } from "../utils/viewingNotesStorage";

interface CandidatesPageProps {
  candidates: CandidateListing[];
  onDeleteCandidate: (candidateId: string) => void;
  onClearCandidates: () => void;
  onNavigate: (route: AppRouteId, candidateId?: string) => void;
  onUpdateRiskStatus: (candidateId: string, riskId: string, status: RiskVerificationStatus) => void;
}

const riskLevelLabels: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

const modeLabels = {
  text: "文字",
  link: "链接",
  image: "图片",
};

const verificationStatusLabels: Record<RiskVerificationStatus, string> = {
  pending: "待核验",
  confirmed: "已确认",
  explained: "已解释",
  rejected: "不接受",
  not_applicable: "不适用",
};

export function CandidatesPage({
  candidates,
  onDeleteCandidate,
  onClearCandidates,
  onNavigate,
  onUpdateRiskStatus,
}: CandidatesPageProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  function confirmDelete(candidateId: string) {
    onDeleteCandidate(candidateId);
    setPendingDeleteId(null);
  }

  function confirmClear() {
    onClearCandidates();
    setIsConfirmingClear(false);
    setPendingDeleteId(null);
  }

  return (
    <div className="candidate-workspace">
      <section className="panel span-full">
        <div className="panel-heading">
          <p className="section-kicker">候选房源管理</p>
          <h2>把值得继续看的房源先收进一个篮子</h2>
          <p>
            候选房源来自风险扫描结果。你可以在这里保存、查看和删除房源，并继续进入多房源对比。
          </p>
        </div>
        <div className="candidate-toolbar">
          <span>已保存 {candidates.length} 个候选房源</span>
          <div>
            <button className="button secondary" type="button" onClick={() => onNavigate("scan")}>
              添加房源
            </button>
            <button
              className="button primary"
              disabled={candidates.length < 2}
              type="button"
              onClick={() => onNavigate("compare")}
            >
              开始对比
            </button>
            <button
              className="button secondary"
              disabled={!candidates.length}
              type="button"
              onClick={() => setIsConfirmingClear(true)}
            >
              清空候选
            </button>
          </div>
        </div>
        {isConfirmingClear ? (
          <div className="inline-confirmation" role="alertdialog" aria-labelledby="clear-candidates-title">
            <div>
              <strong id="clear-candidates-title">清空全部候选？</strong>
              <p>这也会删除每套房源对应的看房进度、现场结论和合同检查记录，操作无法撤销。</p>
            </div>
            <div>
              <button className="button secondary" type="button" onClick={() => setIsConfirmingClear(false)}>
                取消
              </button>
              <button className="button danger-button" type="button" onClick={confirmClear}>
                确认清空
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {candidates.length ? (
        <section className="candidate-list span-full">
          {candidates.map((candidate) => {
            const viewingNotes = loadViewingNotes(candidate.id);
            const latestContractReview = loadContractReviews(candidate.id)[0];
            return (
            <article className={`candidate-card ${candidate.scanResult.level}`} key={candidate.id}>
              <div className="candidate-card-main">
                <div>
                  <span className="candidate-source">
                    {modeLabels[candidate.scanInput.mode]} · {candidate.sourceLabel}
                  </span>
                  <h3>{candidate.title}</h3>
                  <p>{candidate.scanResult.recommendation}</p>
                </div>
                <div className="candidate-score">
                  <strong>{candidate.scanResult.score}</strong>
                  <span>资料可信度</span>
                  <em className={`risk-text ${candidate.scanResult.level}`}>{riskLevelLabels[candidate.scanResult.level]}</em>
                </div>
              </div>

              <dl className="candidate-meta">
                <div>
                  <dt>保存时间</dt>
                  <dd>{formatDate(candidate.createdAt)}</dd>
                </div>
                <div>
                  <dt>输入类型</dt>
                  <dd>{modeLabels[candidate.scanInput.mode]}</dd>
                </div>
                <div>
                  <dt>风险点</dt>
                  <dd>{candidate.scanResult.risks.length} 项</dd>
                </div>
                <div>
                  <dt>已处理</dt>
                  <dd>{candidate.scanResult.risks.filter((risk) => (risk.verificationStatus ?? "pending") !== "pending").length} 项</dd>
                </div>
              </dl>

              <section className="candidate-dossier-summary" aria-label={`${candidate.title}决策档案`}>
                <div>
                  <span>真实月成本</span>
                  <strong>
                    {candidate.comparison.totalMonthlyCost
                      ? `¥${candidate.comparison.totalMonthlyCost.toLocaleString("zh-CN")}`
                      : "待补充"}
                  </strong>
                </div>
                <div>
                  <span>现场结论</span>
                  <strong>{viewingDecisionLabels[viewingNotes.decision]}</strong>
                </div>
                <div>
                  <span>合同检查</span>
                  <strong>
                    {latestContractReview
                      ? latestContractReview.result.level === "high"
                        ? "重点协商"
                        : latestContractReview.result.level === "medium"
                          ? "需要补充"
                          : "暂未发现明显风险"
                      : "尚未检查"}
                  </strong>
                </div>
              </section>

              {candidate.note ? (
                <div className="candidate-note">
                  <strong>备注</strong>
                  <span>{candidate.note}</span>
                </div>
              ) : null}

              {candidate.scanResult.risks.length ? (
                <div className="candidate-evidence-list">
                  {candidate.scanResult.risks.map((risk) => (
                    <article className="candidate-evidence-item" key={risk.id}>
                      <div className="candidate-evidence-heading">
                        <div>
                          <span className={`risk-text ${risk.level}`}>{riskLevelLabels[risk.level]}</span>
                          <strong>{risk.title}</strong>
                        </div>
                        <label>
                          <span>核验状态</span>
                          <select
                            value={risk.verificationStatus ?? "pending"}
                            onChange={(event) =>
                              onUpdateRiskStatus(
                                candidate.id,
                                risk.id,
                                event.target.value as RiskVerificationStatus,
                              )
                            }
                          >
                            {Object.entries(verificationStatusLabels).map(([status, label]) => (
                              <option key={status} value={status}>{label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <p>{risk.reason}</p>
                      <blockquote>{risk.evidence || "当前记录没有保存可定位的原文证据，建议重新扫描或人工补充。"}</blockquote>
                      <div className="candidate-follow-up">
                        <span>下一步</span>
                        <strong>{risk.followUpQuestion}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="candidate-no-risk">当前材料未命中明显风险规则，仍建议核验身份、费用和合同。</div>
              )}

              <div className="candidate-card-actions">
                <button className="button secondary" type="button" onClick={() => onNavigate("checklist", candidate.id)}>
                  现场结论
                </button>
                <button className="button secondary" type="button" onClick={() => onNavigate("contract", candidate.id)}>
                  合同记录
                </button>
                {pendingDeleteId === candidate.id ? (
                  <div className="candidate-delete-confirmation" role="alertdialog" aria-label={`删除 ${candidate.title}`}>
                    <span>会同时删除这套房源的看房结论和合同记录。</span>
                    <button className="button secondary" type="button" onClick={() => setPendingDeleteId(null)}>
                      取消
                    </button>
                    <button className="button danger-button" type="button" onClick={() => confirmDelete(candidate.id)}>
                      确认删除
                    </button>
                  </div>
                ) : (
                  <button className="button secondary danger-button" type="button" onClick={() => setPendingDeleteId(candidate.id)}>
                    删除
                  </button>
                )}
              </div>
            </article>
          );})}
        </section>
      ) : (
        <section className="panel empty-candidate-state span-full">
          <div className="panel-heading">
            <p className="section-kicker">暂无候选</p>
            <h2>先去“房源扫描”保存一个房源</h2>
          </div>
          <p>建议先扫描高风险示例、小红书示例或你自己的房源文案，再点击“保存为候选”。</p>
          <button className="button primary" type="button" onClick={() => onNavigate("scan")}>
            添加第一个房源
          </button>
        </section>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
