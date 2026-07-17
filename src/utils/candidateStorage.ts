import type { CandidateListing } from "../models/renting";
import { readStorageJson, removeStorageItem, writeStorageJson } from "./browserStorage";

const STORAGE_KEY = "renting-radar.candidates.v2";
const LEGACY_STORAGE_KEY = "renting-radar.candidates.v1";
const SCHEMA_VERSION = 2;

interface CandidateStorageEnvelope {
  version: number;
  candidates: CandidateListing[];
}

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
  const storedValue = readStorageJson(STORAGE_KEY);
  if (isCandidateEnvelope(storedValue)) {
    return normalizeCandidates(storedValue.candidates);
  }

  const legacyValue = readStorageJson(LEGACY_STORAGE_KEY);
  if (!Array.isArray(legacyValue)) {
    return [];
  }

  const migratedCandidates = normalizeCandidates(legacyValue);
  if (saveCandidateListings(migratedCandidates)) {
    removeStorageItem(LEGACY_STORAGE_KEY);
  }
  return migratedCandidates;
}

export function saveCandidateListings(candidates: CandidateListing[]) {
  const envelope: CandidateStorageEnvelope = {
    version: SCHEMA_VERSION,
    candidates,
  };
  return writeStorageJson(STORAGE_KEY, envelope);
}

export function clearCandidateListings() {
  return removeStorageItem(STORAGE_KEY);
}

function isCandidateEnvelope(value: unknown): value is CandidateStorageEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const envelope = value as Partial<CandidateStorageEnvelope>;
  return envelope.version === SCHEMA_VERSION && Array.isArray(envelope.candidates);
}

function normalizeCandidates(value: unknown[]) {
  return value.filter(isCandidateListing).map((candidate) => ({
    ...candidate,
    comparison: candidate.comparison ?? {},
  }));
}
