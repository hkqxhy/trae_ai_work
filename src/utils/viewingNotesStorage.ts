import { readStorageJson, removeStorageItem, writeStorageJson } from "./browserStorage";

export interface ViewingNotes {
  summary: string;
  followUps: string;
  decision: ViewingDecision;
  updatedAt?: string;
}

export type ViewingDecision = "undecided" | "continue" | "hold" | "reject";

export const viewingDecisionLabels: Record<ViewingDecision, string> = {
  undecided: "尚未形成结论",
  continue: "继续推进",
  hold: "暂缓决定",
  reject: "淘汰房源",
};

const STORAGE_PREFIX = "renting-radar.viewing-notes.v1";

function getStorageKey(contextId: string) {
  return `${STORAGE_PREFIX}.${contextId || "general"}`;
}

export function loadViewingNotes(contextId: string): ViewingNotes {
  if (typeof window === "undefined") {
    return { summary: "", followUps: "", decision: "undecided" };
  }

  const parsedNotes = readStorageJson(getStorageKey(contextId)) as Partial<ViewingNotes> | undefined;
  return {
    summary: typeof parsedNotes?.summary === "string" ? parsedNotes.summary : "",
    followUps: typeof parsedNotes?.followUps === "string" ? parsedNotes.followUps : "",
    decision: isViewingDecision(parsedNotes?.decision) ? parsedNotes.decision : "undecided",
    updatedAt: typeof parsedNotes?.updatedAt === "string" ? parsedNotes.updatedAt : undefined,
  };
}

export function saveViewingNotes(contextId: string, notes: ViewingNotes) {
  if (typeof window === "undefined") {
    return;
  }

  return writeStorageJson(getStorageKey(contextId), {
    ...notes,
    updatedAt: new Date().toISOString(),
  });
}

export function clearViewingNotes(contextId: string) {
  if (typeof window === "undefined") {
    return;
  }

  return removeStorageItem(getStorageKey(contextId));
}

function isViewingDecision(value: unknown): value is ViewingDecision {
  return value === "undecided" || value === "continue" || value === "hold" || value === "reject";
}
