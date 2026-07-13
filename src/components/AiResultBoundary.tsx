import type { AiAnalysisResult, AiRequestStatus } from "../models/ai";
import type { RiskLevel } from "../models/renting";

const riskLevelLabels: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

interface AiResultBoundaryProps {
  result: AiAnalysisResult | null;
  status: AiRequestStatus;
  errorMessage: string;
}

export function AiResultBoundary({ result, status, errorMessage }: AiResultBoundaryProps) {
  if (status === "idle") {
    return (
      <div className="ai-empty-state">
        <strong>AI 补充分析尚未运行</strong>
        <span>先完成本地扫描，再手动触发 AI；规则结果会一直保留。</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="ai-empty-state">
        <strong>正在分析</strong>
        <span>请求服务端适配层中，本地规则结果不会被清空。</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="ai-empty-state error">
        <strong>AI 暂不可用</strong>
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="ai-result">
      <div className="ai-result-summary">
        <div>
          <span>AI 补充分析</span>
          <strong>{result.conclusion}</strong>
        </div>
      </div>

      {result.reasons.length ? (
        <ul className="advice-list">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      {result.risks.length ? (
        <div className="risk-card-list ai-risk-list">
          {result.risks.map((risk) => (
            <article className={`risk-card ${risk.level}`} key={risk.id}>
              <span>AI 补充提示 · {riskLevelLabels[risk.level]}</span>
              <h3>{risk.title}</h3>
              <blockquote>{risk.evidence}</blockquote>
              <p>{risk.explanation}</p>
              <strong>{risk.followUpQuestion}</strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-box">
          <strong>AI 未新增风险点</strong>
          <span>这不等于房源安全，仍以线下核验、合同和付款边界为准。</span>
        </div>
      )}

      {result.missingInformation.length || result.suggestedQuestions.length ? (
        <div className="ai-follow-up-grid">
          <div>
            <strong>仍缺信息</strong>
            <ul>
              {result.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>建议追问</strong>
            <ul>
              {result.suggestedQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <p className="ai-disclaimer">{result.disclaimer}</p>
    </div>
  );
}
