import { readStorageJson, removeStorageItem, writeStorageJson } from "./browserStorage";

export type ViewingChecklistProgress = Record<string, boolean>;

const STORAGE_PREFIX = "renting-radar.viewing-checklist.v1";

function getStorageKey(contextId: string) {
  return `${STORAGE_PREFIX}.${contextId || "general"}`;
}

export function loadViewingChecklistProgress(contextId: string): ViewingChecklistProgress {
  if (typeof window === "undefined") {
    return {};
  }

  const parsedProgress = readStorageJson(getStorageKey(contextId));
  return parsedProgress && typeof parsedProgress === "object"
    ? (parsedProgress as ViewingChecklistProgress)
    : {};
}

export function saveViewingChecklistProgress(
  contextId: string,
  progress: ViewingChecklistProgress,
) {
  if (typeof window === "undefined") {
    return;
  }

  return writeStorageJson(getStorageKey(contextId), progress);
}

export function clearViewingChecklistProgress(contextId: string) {
  if (typeof window === "undefined") {
    return;
  }

  return removeStorageItem(getStorageKey(contextId));
}
