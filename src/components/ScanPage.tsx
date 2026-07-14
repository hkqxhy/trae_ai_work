import { useEffect, useRef, useState } from "react";
import type {
  CandidateListing,
  ImageScanInput,
  ListingScanInput,
  ListingScanResult,
  RentingProfile,
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

const modeLabels: Record<ScanInputMode, string> = {
  text: "粘贴文字",
  link: "粘贴链接",
  image: "上传图片",
};

function createBlankScanInput(): ListingScanInput {
  return {
    mode: "text",
    text: "",
    url: "",
    imageNotes: "",
    images: [],
  };
}

export function ScanPage({ profile, onSaveCandidate }: ScanPageProps) {
  const [scanInput, setScanInput] = useState<ListingScanInput>(createBlankScanInput);
  const [result, setResult] = useState<ListingScanResult>(() =>
    scanListingRisk(createBlankScanInput(), profile),
  );
  const [candidateNote, setCandidateNote] = useState("");
  const [saveMessage, setSaveMessage] = useState("分析完成后，可以保存为候选房源");
  const [aiStatus, setAiStatus] = useState<AiRequestStatus>("idle");
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const latestImagesRef = useRef<ImageScanInput[]>([]);
  const aiAbortRef = useRef<AbortController | null>(null);

  const inputLength = [scanInput.text, scanInput.url, scanInput.imageNotes].join("").trim().length;
  const hasVisionInput = scanInput.images.some((image) => image.dataUrl);
  const hasInput = inputLength > 0 || hasVisionInput;
  const localScoreClass = result.level === "high" ? "danger" : result.level === "medium" ? "warning" : "";

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

  async function startAiAnalysis() {
    const localRuleResult = scanListingRisk(scanInput, profile);
    setResult(localRuleResult);
    setSaveMessage("分析完成后，可以保存为候选房源");
    await runAiAnalysis(localRuleResult);
  }

  async function runAiAnalysis(localRuleResult: ListingScanResult) {
    if (!hasInput) {
      setAiStatus("insufficient_input");
      setAiResult({
        status: "insufficient_input",
        conclusion: "请先粘贴房源文字、链接或上传图片。",
        reasons: [],
        risks: [],
        missingInformation: ["房源描述、链接文本或图片内容"],
        suggestedQuestions: ["补充租金、押金、费用、位置和发布者身份。"],
        disclaimer: "AI 结果依赖输入完整度，仅作租房风险提示，不构成事实认定或法律意见。",
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
          localRuleResult,
        },
        controller.signal,
      );
      setAiResult(nextResult);
      setAiStatus(nextResult.status === "insufficient_input" ? "insufficient_input" : "success");
      setSaveMessage("分析完成，可以保存为候选房源");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setAiStatus("idle");
        return;
      }

      setAiStatus("error");
      setAiErrorMessage(error instanceof Error ? error.message : "AI 服务暂时不可用，请稍后重试。");
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
    setImageUploadMessage("");
    setSaveMessage("示例已填入，点击“开始 AI 分析”");
    resetAiResult();
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const imageFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 6);

    if (!imageFiles.length) {
      setImageUploadMessage("没有识别到可用的图片文件。");
      return;
    }

    setImageUploadMessage("正在准备图片…");
    try {
      const images = await Promise.all(
        imageFiles.map(async (file): Promise<ImageScanInput> => {
          const dataUrl = await prepareImageForAi(file);
          return {
            id: file.name + "-" + file.size + "-" + crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            previewUrl: dataUrl,
            dataUrl,
          };
        }),
      );

      cleanupImageUrls(scanInput.images);
      updateScanInput({ mode: "image", images });
      setImageUploadMessage("已准备 " + images.length + " 张图片");
    } catch {
      setImageUploadMessage("图片处理失败，请换用 JPG、PNG 或 WebP 图片后重试。");
    }
  }

  function clearImages() {
    cleanupImageUrls(scanInput.images);
    updateScanInput({ images: [] });
    setImageUploadMessage("");
  }

  function saveCandidate() {
    const candidate = createCandidateFromScan(scanInput, result, candidateNote);
    onSaveCandidate(candidate);
    setSaveMessage("已保存到候选房源");
  }

  return (
    <div className="scan-workspace scan-workspace-simplified">
      <section className="panel scan-input-panel">
        <div className="scan-intro">
          <div>
            <p className="section-kicker">一步完成房源判断</p>
            <h2>把房源信息交给 AI，看清风险再决定</h2>
            <p>粘贴文字、链接或上传截图，点击一次开始分析。AI 会先给结论，再告诉你下一步核对什么。</p>
          </div>
          <span className="scan-step-count">01 / 02</span>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="房源信息类型">
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
              placeholder="粘贴平台房源链接，也可以把帖子文字一起粘贴到下方"
            />
          </label>
        ) : null}

        {scanInput.mode === "image" ? (
          <div className="image-upload-panel">
            <label className="image-dropzone">
              <span>上传房源、聊天或合同截图</span>
              <input accept="image/*" multiple type="file" onChange={(event) => void handleImageUpload(event.target.files)} />
            </label>
            {imageUploadMessage ? <span className="image-upload-status">{imageUploadMessage}</span> : null}
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
            ) : null}
            {scanInput.images.length ? (
              <button className="button secondary compact-button" type="button" onClick={clearImages}>
                清空图片
              </button>
            ) : null}
          </div>
        ) : null}

        <label className="scan-textarea-label">
          <span>{scanInput.mode === "image" ? "图片里的文字或补充说明（可选）" : "房源文字"}</span>
          <textarea
            value={scanInput.text}
            onChange={(event) => updateScanInput({ text: event.target.value })}
            placeholder="例如：租金、押金、地址、付款方式、发布者身份、合同或聊天内容"
          />
        </label>

        {scanInput.mode === "image" ? (
          <label className="scan-textarea-label scan-optional-field">
            <span>想让 AI 重点看什么（可选）</span>
            <input
              value={scanInput.imageNotes}
              onChange={(event) => updateScanInput({ imageNotes: event.target.value })}
              placeholder="例如：重点检查定金条款、费用说明或墙角发霉"
            />
          </label>
        ) : null}

        <div className="scan-input-footer">
          <div>
            <span>{hasInput ? inputLength + " 个文字字符 · " + scanInput.images.length + " 张图片" : "还没有输入内容"}</span>
            <button className="text-button" type="button" onClick={() => loadSample("risky")}>
              填入风险示例
            </button>
          </div>
          <button className="button primary scan-primary-button" disabled={!hasInput || aiStatus === "loading"} type="button" onClick={() => void startAiAnalysis()}>
            {aiStatus === "loading" ? "AI 正在分析…" : aiResult ? "重新 AI 分析" : "开始 AI 分析"}
          </button>
        </div>
      </section>

      <section className="panel scan-ai-panel">
        <div className="scan-ai-header">
          <div>
            <p className="section-kicker">02 / 02 · 主要结论</p>
            <h2>AI 分析结果</h2>
          </div>
          {aiResult ? <span className="ai-source-badge">{aiResult.metadata.mock ? "Mock 演示" : "视觉模型"}</span> : null}
        </div>

        <AiResultBoundary result={aiResult} status={aiStatus} errorMessage={aiErrorMessage} />

        {aiStatus === "loading" ? (
          <button className="text-button" type="button" onClick={cancelAiAnalysis}>
            取消分析
          </button>
        ) : null}

        {aiResult ? (
          <div className="scan-rule-summary">
            <span>本地规则基线 <strong className={localScoreClass}>{result.score}</strong></span>
            <span>已发现 {result.risks.length} 个辅助提醒</span>
            <span>{result.detectedFacts.find((fact) => fact.label === "识别月租")?.value || "尚未识别月租"}</span>
          </div>
        ) : null}

        <div className="save-candidate-box">
          <label>
            <span>保存到候选房源（可选）</span>
            <input
              value={candidateNote}
              onChange={(event) => setCandidateNote(event.target.value)}
              placeholder="例如：周末约看，重点确认水电和合同"
            />
          </label>
          <div className="save-candidate-actions">
            <span>{saveMessage}</span>
            <button className="button secondary" disabled={!aiResult} type="button" onClick={saveCandidate}>
              保存候选
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function cleanupImageUrls(images: ImageScanInput[]) {
  images.forEach((image) => {
    if (image.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl);
    }
  });
}

function prepareImageForAi(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image_decode_failed"));
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("canvas_unavailable"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return Math.max(1, Math.round(size / 1024)) + " KB";
  }

  return (size / 1024 / 1024).toFixed(1) + " MB";
}
