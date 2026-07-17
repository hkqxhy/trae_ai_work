import type { CandidateListing, RentingProfile } from "../models/renting";
import {
  loadViewingChecklistProgress,
  type ViewingChecklistProgress,
} from "./viewingChecklistProgressStorage";
import { loadViewingNotes, type ViewingNotes } from "./viewingNotesStorage";
import {
  isContractReviewRecord,
  loadContractReviews,
  type ContractReviewRecord,
} from "./contractReviewStorage";

const FORMAT_VERSION = 1;
const MAX_CANDIDATES = 200;

export interface PortableViewingRecord {
  contextId: string;
  progress: ViewingChecklistProgress;
  notes: ViewingNotes;
}

export interface RentingRadarDataBundle {
  product: "renting-radar";
  formatVersion: number;
  exportedAt: string;
  profile: RentingProfile;
  candidates: CandidateListing[];
  viewingRecords: PortableViewingRecord[];
  contractRecords: ContractReviewRecord[];
}

export function buildDataBundle(
  profile: RentingProfile,
  candidates: CandidateListing[],
): RentingRadarDataBundle {
  const contextIds = ["general", ...candidates.map((candidate) => candidate.id)];
  return {
    product: "renting-radar",
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    candidates: candidates.map(stripTransientImageData),
    viewingRecords: contextIds.map((contextId) => ({
      contextId,
      progress: loadViewingChecklistProgress(contextId),
      notes: loadViewingNotes(contextId),
    })),
    contractRecords: candidates.flatMap((candidate) => loadContractReviews(candidate.id)),
  };
}

export function serializeDataBundle(bundle: RentingRadarDataBundle) {
  return JSON.stringify(bundle, null, 2);
}

export function parseDataBundle(rawText: string): RentingRadarDataBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("文件不是有效的 JSON 数据。");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("文件内容不是租房雷达数据包。");
  }

  const bundle = parsed as Partial<RentingRadarDataBundle>;
  if (bundle.product !== "renting-radar" || bundle.formatVersion !== FORMAT_VERSION) {
    throw new Error("数据包版本不受支持，请使用当前版本重新导出。");
  }
  if (!isRentingProfile(bundle.profile)) {
    throw new Error("数据包中的需求画像不完整或格式错误。");
  }
  if (!Array.isArray(bundle.candidates) || bundle.candidates.length > MAX_CANDIDATES) {
    throw new Error(`候选房源数量无效，单次最多导入 ${MAX_CANDIDATES} 套。`);
  }

  const candidates = bundle.candidates.filter(isCandidateListing).map(stripTransientImageData);
  if (candidates.length !== bundle.candidates.length) {
    throw new Error("数据包包含无法识别的候选房源记录。");
  }

  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const viewingRecords = Array.isArray(bundle.viewingRecords)
    ? bundle.viewingRecords
        .filter(isViewingRecord)
        .filter((record) => record.contextId === "general" || candidateIds.has(record.contextId))
        .map((record) => ({
          contextId: record.contextId,
          progress: sanitizeProgress(record.progress),
          notes: sanitizeNotes(record.notes),
        }))
    : [];
  const contractRecords = Array.isArray(bundle.contractRecords)
    ? bundle.contractRecords
        .filter(isContractReviewRecord)
        .filter((record) => candidateIds.has(record.candidateId))
        .slice(0, 200)
        .map((record) => ({
          ...record,
          context: record.context.slice(0, 5000),
          contractText: record.contractText.slice(0, 50000),
        }))
    : [];

  return {
    product: "renting-radar",
    formatVersion: FORMAT_VERSION,
    exportedAt: typeof bundle.exportedAt === "string" ? bundle.exportedAt : new Date().toISOString(),
    profile: bundle.profile,
    candidates,
    viewingRecords,
    contractRecords,
  };
}

function stripTransientImageData(candidate: CandidateListing): CandidateListing {
  return {
    ...candidate,
    scanInput: {
      ...candidate.scanInput,
      images: candidate.scanInput.images.map(({ dataUrl: _dataUrl, ...image }) => ({
        ...image,
        previewUrl: "",
      })),
    },
  };
}

function isRentingProfile(value: unknown): value is RentingProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const profile = value as Partial<RentingProfile>;
  return (
    typeof profile.city === "string" &&
    typeof profile.commuteTarget === "string" &&
    typeof profile.monthlyBudgetMin === "number" &&
    typeof profile.monthlyBudgetMax === "number" &&
    typeof profile.maxCommuteMinutes === "number" &&
    typeof profile.acceptsSharedHousing === "boolean" &&
    Array.isArray(profile.preferences)
  );
}

function isCandidateListing(value: unknown): value is CandidateListing {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CandidateListing>;
  const scanInput = candidate.scanInput as Partial<CandidateListing["scanInput"]> | undefined;
  const scanResult = candidate.scanResult as Partial<CandidateListing["scanResult"]> | undefined;
  return Boolean(
    typeof candidate.id === "string" &&
      candidate.id &&
      typeof candidate.title === "string" &&
      typeof candidate.sourceLabel === "string" &&
      typeof candidate.createdAt === "string" &&
      typeof candidate.note === "string" &&
      candidate.comparison &&
      scanInput &&
      Array.isArray(scanInput.images) &&
      scanResult &&
      typeof scanResult.score === "number" &&
      (scanResult.level === "low" || scanResult.level === "medium" || scanResult.level === "high") &&
      Array.isArray(scanResult.risks),
  );
}

function isViewingRecord(value: unknown): value is PortableViewingRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<PortableViewingRecord>;
  return Boolean(
    typeof record.contextId === "string" &&
      record.progress &&
      typeof record.progress === "object" &&
      record.notes &&
      typeof record.notes === "object",
  );
}

function sanitizeProgress(progress: ViewingChecklistProgress) {
  return Object.fromEntries(
    Object.entries(progress)
      .filter(([key, value]) => key.length <= 200 && typeof value === "boolean")
      .slice(0, 500),
  );
}

function sanitizeNotes(notes: ViewingNotes): ViewingNotes {
  return {
    summary: typeof notes.summary === "string" ? notes.summary.slice(0, 20000) : "",
    followUps: typeof notes.followUps === "string" ? notes.followUps.slice(0, 20000) : "",
    decision:
      notes.decision === "continue" || notes.decision === "hold" || notes.decision === "reject"
        ? notes.decision
        : "undecided",
    updatedAt: typeof notes.updatedAt === "string" ? notes.updatedAt : undefined,
  };
}
