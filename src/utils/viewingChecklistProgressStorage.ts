export type ViewingChecklistProgress = Record<string, boolean>;

const STORAGE_PREFIX = "renting-radar.viewing-checklist.v1";

function getStorageKey(contextId: string) {
  return `${STORAGE_PREFIX}.${contextId || "general"}`;
}

export function loadViewingChecklistProgress(contextId: string): ViewingChecklistProgress {
  if (typeof window === "undefined") {
    return {};
  }

  const rawProgress = window.localStorage.getItem(getStorageKey(contextId));

  if (!rawProgress) {
    return {};
  }

  try {
    const parsedProgress: unknown = JSON.parse(rawProgress);
    return parsedProgress && typeof parsedProgress === "object"
      ? (parsedProgress as ViewingChecklistProgress)
      : {};
  } catch {
    return {};
  }
}

export function saveViewingChecklistProgress(
  contextId: string,
  progress: ViewingChecklistProgress,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(contextId), JSON.stringify(progress));
}

export function clearViewingChecklistProgress(contextId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getStorageKey(contextId));
}
