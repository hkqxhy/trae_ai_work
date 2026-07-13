import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CandidateListing,
  ImageScanInput,
  ListingScanInput,
  ListingScanResult,
  RentingProfile,
  RiskLevel,
  ScanInputMode,
} from "../models/renting";
import type { AiAnalysisResult, AiRequestStatus } from "../models/ai";
import {
  createEmptyScanInput,
  riskyListingSample,
  saferListingSample,
  scanListingRisk,
  xiaohongshuLinkSample,
} from "../utils/listingRiskScanner";
import { createCandidateFromScan } from "../utils/candidateFactory";
import { requestListingAiAnalysis } from "../api/aiClient";
import { AiResultBoundary } from "./AiResultBoundary";

interface ScanPageProps {
  profile: RentingProfile;
  onSaveCandidate: (candidate: CandidateListing) => void;
}

const riskLevelLabels: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

const modeLabels: Record<ScanInputMode, string> = {
  text: "文字",
  link: "链接",
  image: "图片",
};

export function ScanPage({ profile, onSaveCandidate }: ScanPageProps) {
  const [scanInput, setScanInput] = useState<ListingScanInput>(() => createEmptyScanInput());
  const [result, setResult] = useState<ListingScanResult>(() =>
    scanListingRisk(createEmptyScanInput(), profile),
  );
  const [candidateNote, setCandidateNote] = useState("");
  const [saveMessage, setSaveMessage] = useState("扫描后可保存为候选房源");
  const [aiStatus, setAiStatus] = useState<AiRequestStatus>("idle");
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const latestImagesRef = useRef<ImageScanInput[]>([]);
  const aiAbortRef = useRef<AbortController | null>(null);

  const scoreClass = result.level === "high" ? "danger" : result.level === "medium" ? "warning" : "";
  const highlightedQuestions = useMemo(() => result.followUpQuestions.slice(0, 6), [result]);
  const inputLength = [scanInput.text, scanInput.url, scanInput.imageNotes].join("").trim().length;

  function updateScanInput(nextInput: Partial<ListingScanInput>) {
    setScanInput((current) => ({ ...current, ...nextInput }));
    resetAiResult();
  }

  useEffect(() => {
    latestImagesRef.current = scanInput.images;
  }, [scanInput.images]);

  useEffect(() => {
    return () => {
      cleanupImageUrls(latestImagesRef.current);
      aiAbortRef.current?.abort();
    };
  }, []);

  function setMode(mode: ScanInputMode) {
    updateScanInput({ mode });
  }

  function runScan() {
    setResult(scanListingRisk(scanInput, profile));
    setSaveMessage("扫描完成，可以保存为候选房源");
    resetAiResult();
  }

  async function runAiAnalysis() {
    if (!inputLength && !scanInput.images.length) {
      setAiStatus("insufficient_input");
      setAiResult({
        status: "insufficient_input",
        conclusion: "请先输入房源文字、链接或图片信息，再运行 AI 补充分析。",
        reasons: [],
        risks: [],
        missingInformation: ["房源描述、链接文本或图片内容"],
        suggestedQuestions: ["请补充租金、押金、费用、位置、发布者身份和合同信息。"],
        disclaimer: "AI 结果依赖你提供的信息完整度，仅作租房风险提示，不构成事实认定或法律意见。",
        metadata: {
          model: "local-ui",
          requestId: "local-insufficient-input",
          inputModalities: [],
          provider: "local",
          promptVersion: "listing-ui-guard",
          mock: true,
        },
      });
      return;
    }

    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiStatus("loading");
    setAiErrorMessage("");

    try {
      const nextResult = await requestListingAiAnalysis(
        {
          listing: scanInput,
          profile,
          localRuleResult: result,
        },
        controller.signal,
      );
      setAiResult(nextResult);
      setAiStatus(nextResult.status === "insufficient_input" ? "insufficient_input" : "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setAiStatus("idle");
        return;
      }

      setAiStatus("error");
      setAiErrorMessage(error instanceof Error ? error.message : "AI 服务暂时不可用，本地规则结果仍可继续使用。");
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null;
      }
    }
  }

  function cancelAiAnalysis() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStatus("idle");
  }

  function resetAiResult() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStatus("idle");
    setAiResult(null);
    setAiErrorMessage("");
  }

  function loadSample(kind: "risky" | "safer" | "link") {
    const nextInput =
      kind === "link"
        ? {
            ...createEmptyScanInput(),
            mode: "link" as const,
            text: xiaohongshuLinkSample,
            url: "https://www.xiaohongshu.com/explore/renting-demo",
          }
        : {
            ...createEmptyScanInput(),
            mode: "text" as const,
            text: kind === "risky" ? riskyListingSample : saferListingSample,
          };

    cleanupImageUrls(scanInput.images);
    setScanInput(nextInput);
    setResult(scanListingRisk(nextInput, profile));
    setCandidateNote("");
    setSaveMessage("示例已加载，可以保存为候选房源");
    resetAiResult();
  }

  function handleImageUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const images: ImageScanInput[] = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 6)
      .map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      }));

    cleanupImageUrls(scanInput.images);
    updateScanInput({ mode: "image", images });
  }

  function clearImages() {
    cleanupImageUrls(scanInput.images);
    updateScanInput({ images: [] });
  }

  function saveCandidate() {
    const candidate = createCandidateFromScan(scanInput, result, candidateNote);
    onSaveCandidate(candidate);
    setSaveMessage("已保存到候选房源");
  }

  return (
    <div className="scan-workspace">
      <section className="panel scan-input-panel">
        <div className="panel-heading">
          <p className="section-kicker">多模态房源风险扫描</p>
          <h2>文字、图片、链接都能先进入同一套判断流程</h2>
          <p>
            文字、链接和图片都可以进入同一套判断流程：文字可直接识别，链接可识别来源和风险线索，图片可作为证据补充。
          </p>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="扫描输入类型">
          {(["text", "link", "image"] as ScanInputMode[]).map((mode) => (
            <button
              className={scanInput.mode === mode ? "mode-tab active" : "mode-tab"}
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>

        {scanInput.mode === "link" ? (
          <label className="scan-textarea-label">
            <span>房源链接</span>
            <input
              value={scanInput.url}
              onChange={(event) => updateScanInput({ url: event.target.value })}
              placeholder="粘贴小红书、豆瓣、平台房源或中介页面链接"
            />
          </label>
        ) : null}

        {scanInput.mode === "image" ? (
          <div className="image-upload-panel">
            <label className="image-dropzone">
              <span>上传房源截图或聊天截图</span>
              <input accept="image/*" multiple type="file" onChange={(event) => handleImageUpload(event.target.files)} />
            </label>
            {scanInput.images.length ? (
              <div className="image-preview-grid">
                {scanInput.images.map((image) => (
                  <figure className="image-preview" key={image.id}>
                    <img alt={image.name} src={image.previewUrl} />
                    <figcaption>
                      <strong>{image.name}</strong>
                      <span>{formatFileSize(image.size)}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                <strong>还没有图片</strong>
                <span>建议上传房源详情页、聊天记录、费用说明或合同截图。</span>
              </div>
            )}
            {scanInput.images.length ? (
              <button className="button secondary" type="button" onClick={clearImages}>
                清空图片
              </button>
            ) : null}
          </div>
        ) : null}

        <label className="scan-textarea-label">
          <span>{scanInput.mode === "image" ? "图片备注或 OCR 文本" : "房源描述、平台文案或聊天片段"}</span>
          <textarea
            value={scanInput.text}
            onChange={(event) => updateScanInput({ text: event.target.value })}
            placeholder={
              scanInput.mode === "image"
                ? "可手动补充截图里的关键文字，例如租金、押金、水电费、地址、中介话术"
                : "粘贴房源文案，例如租金、地址、付款方式、水电费、发布者身份等"
            }
          />
        </label>

        {scanInput.mode === "image" ? (
          <label className="scan-textarea-label">
            <span>看图时希望重点检查什么</span>
            <textarea
              className="compact-textarea"
              value={scanInput.imageNotes}
              onChange={(event) => updateScanInput({ imageNotes: event.target.value })}
              placeholder="例如：看墙角是否发霉、窗外是否遮挡、聊天截图中有没有定金和合同条款"
            />
          </label>
        ) : null}

        <div className="scan-actions">
          <span>
            {inputLength || scanInput.images.length
              ? `${inputLength} 个字符 · ${scanInput.images.length} 张图片待分析`
              : "请先输入房源信息"}
          </span>
          <div>
            <button className="button secondary" type="button" onClick={() => loadSample("safer")}>
              稳妥示例
            </button>
            <button className="button secondary" type="button" onClick={() => loadSample("risky")}>
              高风险示例
            </button>
            <button className="button secondary" type="button" onClick={() => loadSample("link")}>
              小红书示例
            </button>
            <button className="button primary" type="button" onClick={runScan}>
              扫描房源
            </button>
          </div>
        </div>
      </section>

      <section className="panel scan-result-panel">
        <div className="score-header">
          <div>
            <p className="section-kicker">可信度评分</p>
            <h2>{result.verdict}</h2>
          </div>
          <strong className={`scan-score ${scoreClass}`}>{result.score}</strong>
        </div>
        <p className="scan-recommendation">{result.recommendation}</p>

        <div className="fact-grid">
          {result.detectedFacts.map((fact) => (
            <div className="fact-card" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
        <div className="save-candidate-box">
          <label>
            <span>候选备注</span>
            <input
              value={candidateNote}
              onChange={(event) => setCandidateNote(event.target.value)}
              placeholder="例如：周末约看，重点确认水电和合同"
            />
          </label>
          <div className="save-candidate-actions">
            <span>{saveMessage}</span>
            <button className="button primary" type="button" onClick={saveCandidate}>
              保存为候选
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <p className="section-kicker">识别到的风险点</p>
          <h2>{result.risks.length ? `共 ${result.risks.length} 项需要确认` : "暂未发现明显高风险话术"}</h2>
        </div>
        {result.risks.length ? (
          <div className="risk-card-list">
            {result.risks.map((risk) => (
              <article className={`risk-card ${risk.level}`} key={risk.id}>
                <span>{riskLevelLabels[risk.level]}</span>
                <h3>{risk.title}</h3>
                <p>{risk.reason}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-box">
            <strong>继续核验，不等于已经安全</strong>
            <span>请继续确认发布者身份、费用明细、合同模板和现场居住条件。</span>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <p className="section-kicker">建议追问</p>
          <h2>约看或转账前，先问这些问题</h2>
        </div>
        <ol className="question-list">
          {highlightedQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <p className="section-kicker">多模态处理说明</p>
          <h2>这次扫描用了哪些输入</h2>
        </div>
        <ul className="advice-list">
          {result.modalityNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <p className="section-kicker">结合你的画像</p>
          <h2>这套房和你的需求有什么关系</h2>
        </div>
        <ul className="advice-list">
          {result.profileNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="panel span-full ai-analysis-panel">
        <div className="panel-heading">
          <p className="section-kicker">AI 补充分析</p>
          <h2>补充判断语义风险和遗漏信息</h2>
          <p>
            AI 只补充语义风险，不覆盖本地评分。结果会保留本地规则依据，方便你继续核对事实、费用和合同边界。
          </p>
        </div>
        <div className="ai-actions">
          <span>
            {aiStatus === "loading"
              ? "正在等待服务端返回"
              : aiResult
                ? "已生成补充分析"
                : "需要你手动触发，浏览器不会保存敏感配置"}
          </span>
          <div>
            {aiStatus === "loading" ? (
              <button className="button secondary" type="button" onClick={cancelAiAnalysis}>
                取消
              </button>
            ) : null}
            <button
              className="button primary"
              disabled={aiStatus === "loading"}
              type="button"
              onClick={runAiAnalysis}
            >
              {aiResult ? "重新 AI 分析" : "AI 补充分析"}
            </button>
          </div>
        </div>
        <AiResultBoundary result={aiResult} status={aiStatus} errorMessage={aiErrorMessage} />
      </section>
    </div>
  );
}

function cleanupImageUrls(images: ImageScanInput[]) {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
