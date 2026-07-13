export interface ViewingNotes {
  summary: string;
  followUps: string;
  updatedAt?: string;
}

const STORAGE_PREFIX = "renting-radar.viewing-notes.v1";

function getStorageKey(contextId: string) {
  return `${STORAGE_PREFIX}.${contextId || "general"}`;
}

export function loadViewingNotes(contextId: string): ViewingNotes {
  if (typeof window === "undefined") {
    return { summary: "", followUps: "" };
  }

  const rawNotes = window.localStorage.getItem(getStorageKey(contextId));

  if (!rawNotes) {
    return { summary: "", followUps: "" };
  }

  try {
    const parsedNotes = JSON.parse(rawNotes) as Partial<ViewingNotes>;
    return {
      summary: typeof parsedNotes.summary === "string" ? parsedNotes.summary : "",
      followUps: typeof parsedNotes.followUps === "string" ? parsedNotes.followUps : "",
      updatedAt: typeof parsedNotes.updatedAt === "string" ? parsedNotes.updatedAt : undefined,
    };
  } catch {
    return { summary: "", followUps: "" };
  }
}

export function saveViewingNotes(contextId: string, notes: ViewingNotes) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getStorageKey(contextId),
    JSON.stringify({
      ...notes,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearViewingNotes(contextId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getStorageKey(contextId));
}
