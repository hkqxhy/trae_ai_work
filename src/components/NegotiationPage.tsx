import { useRef, useState } from "react";
import { negotiationStyles } from "../data/negotiationStyles";
import type { AiNegotiationResult, AiRequestStatus } from "../models/ai";
import type { NegotiationReplyResult, NegotiationReplyStyle } from "../models/renting";
import { generateNegotiationReply } from "../utils/negotiationReplyGenerator";
import { requestNegotiationAiReply } from "../api/aiClient";

const pressureSample =
  "中介说：这套房今天很多人看，你要是确定就先转 1000 元定金，我帮你锁房。合同等签约当天再看，定金正常不退。";

const feeSample =
  "房东说：月租可以少 100，但是物业费、网费和维修费要你自己承担。提前退租的话押金不退，具体细节到时候写合同。";

export function NegotiationPage() {
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [replyStyle, setReplyStyle] = useState<NegotiationReplyStyle>("gentle");
  const [result, setResult] = useState<NegotiationReplyResult | null>(null);
  const [editableReply, setEditableReply] = useState("");
  const [aiStatus, setAiStatus] = useState<AiRequestStatus>("idle");
  const [aiResult, setAiResult] = useState<AiNegotiationResult | null>(null);
  const [editableAiReply, setEditableAiReply] = useState("");
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const aiAbortRef = useRef<AbortController | null>(null);
  const selectedStyle =
    negotiationStyles.find((style) => style.id === replyStyle) ?? negotiationStyles[0];

  function loadSample(sample: string, sampleGoal: string) {
    setMessage(sample);
    setGoal(sampleGoal);
    resetAiReply();
  }

  function clearInput() {
    setMessage("");
    setGoal("");
    setReplyStyle("gentle");
    setResult(null);
    setEditableReply("");
    resetAiReply();
  }

  function generateReply() {
    if (!message.trim() || !goal.trim()) {
      return;
    }

    const nextResult = generateNegotiationReply(message, goal, replyStyle);
    setResult(nextResult);
    setEditableReply(nextResult.reply);
    resetAiReply();
  }

  async function generateAiReply() {
    if (!message.trim() || !goal.trim()) {
      setAiStatus("insufficient_input");
      setAiErrorMessage("请先补充对方原话和你的沟通目标。");
      return;
    }

    const localResult = result ?? generateNegotiationReply(message, goal, replyStyle);
    if (!result) {
      setResult(localResult);
      setEditableReply(localResult.reply);
    }

    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiStatus("loading");
    setAiErrorMessage("");

    try {
      const nextResult = await requestNegotiationAiReply(
        {
          negotiation: {
            message,
            goal,
            style: replyStyle,
          },
          localRuleResult: localResult,
        },
        controller.signal,
      );
      setAiResult(nextResult);
      setEditableAiReply(nextResult.reply);
      setAiStatus("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setAiStatus("idle");
        return;
      }

      setAiStatus("error");
      setAiErrorMessage(error instanceof Error ? error.message : "AI 回复服务暂时不可用，本地规则回复仍可继续使用。");
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null;
      }
    }
  }

  function cancelAiReply() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStatus("idle");
  }

  function resetAiReply() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStatus("idle");
    setAiResult(null);
    setEditableAiReply("");
    setAiErrorMessage("");
  }

  return (
    <div className="negotiation-workspace">
      <section className="panel span-full">
        <div className="panel-heading">
          <p className="section-kicker">话术输入</p>
          <h2>先把对方原话和你的目标整理清楚</h2>
          <p>
            粘贴中介或房东发来的消息，并说明你希望达成什么结果。系统会根据你的目标生成可编辑回复。
          </p>
        </div>

        <div className="negotiation-samples">
          <button
            className="button secondary"
            type="button"
            onClick={() => loadSample(pressureSample, "不先转定金，要求先看合同和身份材料")}
          >
            加载催定金示例
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => loadSample(feeSample, "把所有费用和提前退租规则确认清楚")}
          >
            加载费用示例
          </button>
        </div>
      </section>

      <section className="panel negotiation-input-panel">
        <label className="negotiation-field">
          <span>对方原话</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="粘贴中介、房东或转租人的消息，例如定金、费用、合同、看房安排等"
          />
        </label>
        <div className="input-counter">{message.trim().length} 个字符</div>
      </section>

      <section className="panel negotiation-goal-panel">
        <label className="negotiation-field">
          <span>你的沟通目标</span>
          <textarea
            className="compact-textarea"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="例如：争取押一付一、拒绝看房前交定金、要求提前查看合同"
          />
        </label>

        <div className="negotiation-context">
          <strong>建议包含</strong>
          <ul>
            <li>你愿意接受和不能接受的条件</li>
            <li>希望对方提供的证明或费用明细</li>
            <li>是否已经看房、何时需要作出决定</li>
          </ul>
        </div>
      </section>

      <section className="panel span-full negotiation-style-panel">
        <div className="panel-heading">
          <p className="section-kicker">回复风格</p>
          <h2>选择你希望采用的表达方式</h2>
          <p>风格会影响后续规则版回复的措辞和边界，但不会改变你设定的沟通目标。</p>
        </div>

        <div className="negotiation-style-options">
          {negotiationStyles.map((style) => (
            <button
              aria-pressed={replyStyle === style.id}
              className={replyStyle === style.id ? "negotiation-style active" : "negotiation-style"}
              key={style.id}
              type="button"
              onClick={() => setReplyStyle(style.id)}
            >
              <strong>{style.label}</strong>
              <span>{style.description}</span>
            </button>
          ))}
        </div>

        <div className="selected-style-summary">
          <div>
            <span>当前风格</span>
            <strong>{selectedStyle.label}</strong>
            <p>{selectedStyle.description}</p>
          </div>
          <ul>
            {selectedStyle.principles.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel span-full negotiation-footer">
        <div>
          <strong>当前输入状态</strong>
          <span>
            {message.trim() && goal.trim()
              ? `信息较完整，已选择“${selectedStyle.label}”`
              : "请补充对方原话和沟通目标"}
          </span>
        </div>
        <div>
          <button className="button secondary" type="button" onClick={clearInput}>
            清空输入
          </button>
          <button
            className="button primary"
            disabled={!message.trim() || !goal.trim()}
            type="button"
            onClick={generateReply}
          >
            生成规则回复
          </button>
          <button
            className="button primary"
            disabled={!message.trim() || !goal.trim() || aiStatus === "loading"}
            type="button"
            onClick={generateAiReply}
          >
            {aiResult ? "重新 AI 生成" : "AI 生成回复"}
          </button>
        </div>
      </section>

      {result ? (
        <section className="panel span-full negotiation-result-panel">
          <div className="panel-heading">
            <p className="section-kicker">回复建议</p>
            <h2>已识别：{result.scenarioLabel}</h2>
            <p>回复由本地规则生成，可在发送前继续编辑。</p>
          </div>
          <label className="negotiation-field">
            <span>建议回复</span>
            <textarea value={editableReply} onChange={(event) => setEditableReply(event.target.value)} />
          </label>
          <div className="negotiation-result-grid">
            <div>
              <strong>识别信号</strong>
              <ul>
                {result.detectedSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>仍建议确认</strong>
              <ul>
                {result.nextQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel span-full negotiation-result-panel ai-negotiation-panel">
        <div className="panel-heading">
          <p className="section-kicker">AI 回复生成</p>
          <h2>生成更自然的可编辑回复</h2>
          <p>AI 会参考对方原话、你的目标、回复风格和本地场景识别；不会自动发送，也不会替你承诺付款或签约。</p>
        </div>

        <div className="ai-actions">
          <span>
            {aiStatus === "loading"
              ? "正在请求服务端千问适配层"
              : aiResult
                ? "已生成可编辑回复"
                : "需要你手动触发，浏览器不会保存敏感配置"}
          </span>
          <div>
            {aiStatus === "loading" ? (
              <button className="button secondary" type="button" onClick={cancelAiReply}>
                取消
              </button>
            ) : null}
            <button
              className="button primary"
              disabled={!message.trim() || !goal.trim() || aiStatus === "loading"}
              type="button"
              onClick={generateAiReply}
            >
              {aiResult ? "重新 AI 生成" : "AI 生成回复"}
            </button>
          </div>
        </div>

        {aiStatus === "idle" && !aiResult ? (
          <div className="ai-empty-state">
            <strong>AI 回复尚未生成</strong>
            <span>先补充输入，再点击 AI 生成回复。本地规则回复会保留。</span>
          </div>
        ) : null}

        {aiStatus === "loading" ? (
          <div className="ai-empty-state">
            <strong>正在生成</strong>
            <span>请稍候，生成后仍可手动编辑。</span>
          </div>
        ) : null}

        {aiStatus === "error" || aiStatus === "insufficient_input" ? (
          <div className="ai-empty-state error">
            <strong>AI 回复暂不可用</strong>
            <span>{aiErrorMessage}</span>
          </div>
        ) : null}

        {aiResult ? (
          <div className="ai-negotiation-result">
            <label className="negotiation-field">
              <span>AI 建议回复</span>
              <textarea value={editableAiReply} onChange={(event) => setEditableAiReply(event.target.value)} />
            </label>
            <div className="negotiation-result-grid">
              <div>
                <strong>AI 识别信号</strong>
                <ul>
                  {aiResult.detectedSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>仍建议确认</strong>
                <ul>
                  {aiResult.nextQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>已避免表述</strong>
                <ul>
                  {aiResult.avoidedClaims.map((claim) => (
                    <li key={claim}>{claim}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>生成状态</strong>
                <ul>
                  <li>已结合你的目标和本地识别信号</li>
                  <li>发送前请核对金额、时间和承诺边界</li>
                </ul>
              </div>
            </div>
            <p className="ai-disclaimer">{aiResult.disclaimer}</p>
          </div>
        ) : null}
      </section>

      <section className="panel span-full checklist-boundary">
        <strong>本轮功能边界</strong>
        <p>当前支持本地规则回复与 AI 回复生成。回复不会自动发送，发送前请自行核对事实、金额、合同和语气。</p>
      </section>
    </div>
  );
}
