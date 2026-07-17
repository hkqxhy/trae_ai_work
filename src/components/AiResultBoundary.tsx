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
        <strong>还没有分析结果</strong>
        <span>提交房源信息后，AI 会直接给出风险结论和下一步。</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="ai-empty-state">
        <strong>正在分析</strong>
        <span>AI 正在读取文字、链接和图片内容，请稍候。</span>
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
          <span>AI 主结论</span>
          <strong>{result.conclusion}</strong>
        </div>
        <small>{result.metadata.mock ? "本地演示结果" : result.metadata.model}</small>
      </div>

      {result.reasons.length ? (
        <ul className="ai-brief-list">
          {result.reasons.slice(0, 2).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      {result.risks.length ? (
        <div className="ai-risk-list">
          {result.risks.slice(0, 4).map((risk) => (
            <article className={`risk-card ${risk.level}`} key={risk.id}>
              <span>{riskLevelLabels[risk.level]}</span>
              <h3>{risk.title}</h3>
              <p>{risk.evidence || risk.explanation}</p>
              <small>下一步：{risk.followUpQuestion}</small>
            </article>
          ))}
          {result.risks.length > 4 ? <span className="ai-more-hint">还有 {result.risks.length - 4} 项风险，建议结合原始信息逐条核对。</span> : null}
        </div>
      ) : (
        <div className="empty-box">
          <strong>AI 暂未识别出明显风险点</strong>
          <span>这不等于房源安全，仍需核对合同、付款和现场情况。</span>
        </div>
      )}

      {result.missingInformation.length || result.suggestedQuestions.length ? (
        <div className="ai-next-step">
          <strong>下一步先做什么</strong>
          <ul>
            {[...result.missingInformation, ...result.suggestedQuestions].slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="ai-disclaimer">{result.disclaimer}</p>
    </div>
  );
}
