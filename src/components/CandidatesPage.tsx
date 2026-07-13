import type { CandidateListing, RiskLevel } from "../models/renting";

interface CandidatesPageProps {
  candidates: CandidateListing[];
  onDeleteCandidate: (candidateId: string) => void;
  onClearCandidates: () => void;
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

export function CandidatesPage({
  candidates,
  onDeleteCandidate,
  onClearCandidates,
}: CandidatesPageProps) {
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
          <button
            className="button secondary"
            disabled={!candidates.length}
            type="button"
            onClick={onClearCandidates}
          >
            清空候选
          </button>
        </div>
      </section>

      {candidates.length ? (
        <section className="candidate-list span-full">
          {candidates.map((candidate) => (
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
                  <span>{riskLevelLabels[candidate.scanResult.level]}</span>
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
              </dl>

              {candidate.note ? (
                <div className="candidate-note">
                  <strong>备注</strong>
                  <span>{candidate.note}</span>
                </div>
              ) : null}

              <div className="candidate-risk-preview">
                {candidate.scanResult.risks.slice(0, 3).map((risk) => (
                  <span key={risk.id}>{risk.title}</span>
                ))}
                {!candidate.scanResult.risks.length ? <span>暂无明显高风险话术</span> : null}
              </div>

              <div className="candidate-card-actions">
                <button className="button secondary danger-button" type="button" onClick={() => onDeleteCandidate(candidate.id)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel empty-candidate-state span-full">
          <div className="panel-heading">
            <p className="section-kicker">暂无候选</p>
            <h2>先去“房源扫描”保存一个房源</h2>
          </div>
          <p>建议先扫描高风险示例、小红书示例或你自己的房源文案，再点击“保存为候选”。</p>
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
