import { useEffect, useState } from "react";
import type { CandidateListing, ContractScanResult, RiskLevel } from "../models/renting";
import { scanContractRisk } from "../utils/contractRiskScanner";
import {
  createContractReviewRecord,
  loadContractReviews,
  saveContractReview,
  type ContractReviewRecord,
} from "../utils/contractReviewStorage";

const contractSample =
  "租赁期限为一年，押一付三。乙方提前退租视为违约，押金不予退还，并需支付剩余租期租金的 30% 作为违约金。物业费、网络费、管理费由乙方承担，水电按公寓标准结算；管理方有权调整服务费收费标准。房屋及附属设施的全部维修费用由乙方承担。";

const balancedContractSample =
  "租赁期限为一年，月租 3200 元，押一付一。物业费每月 120 元，水电按居民阶梯单价和独立表计结算，无管理费、服务费。房屋本体、管道、电路及非乙方人为造成的家具家电故障由甲方负责维修并承担费用；乙方人为损坏的部分由乙方承担。紧急漏水、断电等故障，甲方应在收到通知后 24 小时内响应。合同终止并完成房屋验收、水电费用结清后，甲方应在 5 个工作日内退还剩余押金。乙方需要提前退租时，应提前 30 日书面通知甲方，违约金上限为一个月租金；双方协商找到替代承租人后可减免。";

const riskLevelLabels: Record<RiskLevel, string> = {
  high: "重点协商",
  medium: "需要补充",
  low: "暂未发现明显风险",
};

export function ContractPage({
  candidates,
  initialCandidateId = "",
}: {
  candidates: CandidateListing[];
  initialCandidateId?: string;
}) {
  const defaultCandidateId = candidates.some((candidate) => candidate.id === initialCandidateId)
    ? initialCandidateId
    : candidates[0]?.id ?? "";
  const [contractText, setContractText] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<ContractScanResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(defaultCandidateId);
  const [history, setHistory] = useState<ContractReviewRecord[]>(() =>
    loadContractReviews(defaultCandidateId),
  );

  useEffect(() => {
    const candidateId = candidates.some((candidate) => candidate.id === selectedCandidateId)
      ? selectedCandidateId
      : candidates[0]?.id ?? "";
    if (candidateId !== selectedCandidateId) setSelectedCandidateId(candidateId);
    setHistory(loadContractReviews(candidateId));
  }, [candidates, selectedCandidateId]);

  useEffect(() => {
    if (initialCandidateId && candidates.some((candidate) => candidate.id === initialCandidateId)) {
      setSelectedCandidateId(initialCandidateId);
    }
  }, [candidates, initialCandidateId]);

  function loadSample(sample: string, sampleContext: string) {
    setContractText(sample);
    setContext(sampleContext);
    setResult(null);
  }

  function clearInput() {
    setContractText("");
    setContext("");
    setResult(null);
  }

  function scanContract() {
    if (!contractText.trim()) {
      return;
    }

    const nextResult = scanContractRisk(contractText);
    setResult(nextResult);
    if (selectedCandidateId) {
      saveContractReview(
        createContractReviewRecord(selectedCandidateId, context, contractText, nextResult),
      );
      setHistory(loadContractReviews(selectedCandidateId));
    }
  }

  return (
    <div className="contract-workspace">
      <section className="panel span-full">
        <div className="panel-heading">
          <p className="section-kicker">维修责任识别</p>
          <h2>把退出成本、每月支出和入住后的维修边界一起核对</h2>
          <p>本地规则会识别押金、违约金、费用和维修责任，仅作风险提示与追问建议。</p>
        </div>
        <div className="contract-samples">
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              loadSample(contractSample, "准备签约，重点关注提前退租、押金退还和违约金上限")
            }
          >
            加载高风险示例
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              loadSample(balancedContractSample, "准备签约，希望确认押金退还时点和提前退租安排")
            }
          >
            加载相对清晰示例
          </button>
        </div>
      </section>

      <section className="panel contract-input-panel">
        <label className="contract-field contract-candidate-field">
          <span>关联候选房源</span>
          <select
            value={selectedCandidateId}
            onChange={(event) => {
              setSelectedCandidateId(event.target.value);
              setResult(null);
            }}
          >
            <option value="">不关联，仅本次检查</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
            ))}
          </select>
        </label>
        <label className="contract-field">
          <span>合同条款或费用明细</span>
          <textarea
            maxLength={50000}
            value={contractText}
            onChange={(event) => {
              setContractText(event.target.value);
              setResult(null);
            }}
            placeholder="粘贴租期、押金、违约、费用、维修、转租等相关条款"
          />
        </label>
        <div className="input-counter">{contractText.trim().length} 个字符</div>
      </section>

      <section className="panel contract-context-panel">
        <label className="contract-field">
          <span>补充背景</span>
          <textarea
            className="compact-textarea"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="例如：尚未签约、对方要求当天付款、最在意提前退租规则"
          />
        </label>
        <div className="contract-input-guide">
          <strong>建议优先提供</strong>
          <ul>
            <li>押金退还与提前退租条款</li>
            <li>中介费、管理费、水电和物业费</li>
            <li>家具电器和房屋维修责任</li>
          </ul>
        </div>
      </section>

      <section className="panel span-full contract-input-footer">
        <div>
          <strong>输入状态</strong>
          <span>
            {contractText.trim()
              ? result
                ? "已完成合同条款扫描"
                : "已录入合同内容，可以开始扫描"
              : "请先粘贴合同条款"}
          </span>
        </div>
        <div className="contract-actions">
          <button className="button secondary" type="button" onClick={clearInput}>
            清空输入
          </button>
          <button
            className="button primary"
            disabled={!contractText.trim()}
            type="button"
            onClick={scanContract}
          >
            扫描合同条款
          </button>
        </div>
      </section>

      {result ? <ContractResult result={result} /> : null}

      {selectedCandidateId ? (
        <section className="panel span-full contract-history-panel">
          <div className="panel-heading">
            <p className="section-kicker">检查记录</p>
            <h2>同一套房的合同变化可以回看</h2>
            <p>每次扫描都会保留时间、结果和原文，最多保存最近 10 次。</p>
          </div>
          {history.length ? (
            <div className="contract-history-list">
              {history.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  onClick={() => {
                    setContractText(record.contractText);
                    setContext(record.context);
                    setResult(record.result);
                  }}
                >
                  <span>{formatReviewTime(record.createdAt)}</span>
                  <strong>{riskLevelLabels[record.result.level]}</strong>
                  <small>{record.result.findings.length} 项提示</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-box">
              <strong>这套房还没有合同检查记录</strong>
              <span>完成扫描后，结果会自动关联到当前候选。</span>
            </div>
          )}
        </section>
      ) : null}

      <p className="product-boundary-note">合同检查仅作风险提示，不构成法律意见；付款和签署前请核对完整原件与合同主体。</p>
    </div>
  );
}

function formatReviewTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ContractResult({ result }: { result: ContractScanResult }) {
  return (
    <>
      <section className={`panel span-full contract-result-summary ${result.level}`}>
        <div>
          <p className="section-kicker">规则扫描结果</p>
          <h2>{riskLevelLabels[result.level]}</h2>
          <p>{result.summary}</p>
        </div>
        <strong>{result.findings.length} 项提示</strong>
      </section>

      <section className="panel contract-facts-panel">
        <h3>识别摘要</h3>
        <ul className="contract-fact-list">
          {result.detectedFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </section>

      <section className="panel contract-questions-panel">
        <h3>签约前建议追问</h3>
        {result.followUpQuestions.length ? (
          <ol className="question-list">
            {result.followUpQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        ) : (
          <p>当前没有新增追问，但仍建议核对合同主体、附件与完整上下文。</p>
        )}
      </section>

      <section className="panel span-full">
        <div className="panel-heading">
          <p className="section-kicker">条款提示</p>
          <h2>每一项都保留原文依据和协商方向</h2>
        </div>
        {result.findings.length ? (
          <div className="contract-finding-list">
            {result.findings.map((finding) => (
              <article className={`contract-finding ${finding.level}`} key={finding.id}>
                <div className="contract-finding-heading">
                  <span>
                    {finding.category === "deposit"
                      ? "押金"
                      : finding.category === "breach"
                        ? "违约"
                        : finding.category === "fee"
                          ? "费用"
                          : "维修"}
                  </span>
                  <strong>{finding.title}</strong>
                </div>
                <blockquote>{finding.evidence}</blockquote>
                <p>{finding.reason}</p>
                <div>
                  <span>建议追问</span>
                  <strong>{finding.followUpQuestion}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-box">
            <strong>未匹配到明显风险规则</strong>
            <span>这不代表合同一定没有风险，结论依赖当前粘贴内容的完整度。</span>
          </div>
        )}
      </section>
    </>
  );
}
