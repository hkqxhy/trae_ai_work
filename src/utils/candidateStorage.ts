import type { CandidateListing } from "../models/renting";

const STORAGE_KEY = "renting-radar.candidates.v1";

function isCandidateListing(value: unknown): value is CandidateListing {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CandidateListing>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.sourceLabel === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.note === "string" &&
    Boolean(candidate.comparison ?? {}) &&
    Boolean(candidate.scanInput) &&
    Boolean(candidate.scanResult)
  );
}

export function loadCandidateListings(): CandidateListing[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawCandidates = window.localStorage.getItem(STORAGE_KEY);

  if (!rawCandidates) {
    return [];
  }

  try {
    const parsedCandidates: unknown = JSON.parse(rawCandidates);
    return Array.isArray(parsedCandidates)
      ? parsedCandidates.filter(isCandidateListing).map((candidate) => ({
          ...candidate,
          comparison: candidate.comparison ?? {},
        }))
      : [];
  } catch {
    return [];
  }
}

export function saveCandidateListings(candidates: CandidateListing[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
}

export function clearCandidateListings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
