import type { ContractScanResult } from "../models/renting";
import { readStorageJson, removeStorageItem, writeStorageJson } from "./browserStorage";

const STORAGE_PREFIX = "renting-radar.contract-reviews.v1";
const MAX_HISTORY = 10;

export interface ContractReviewRecord {
  id: string;
  candidateId: string;
  createdAt: string;
  context: string;
  contractText: string;
  result: ContractScanResult;
}

function getStorageKey(candidateId: string) {
  return `${STORAGE_PREFIX}.${candidateId}`;
}

export function loadContractReviews(candidateId: string): ContractReviewRecord[] {
  if (typeof window === "undefined" || !candidateId) return [];
  const value = readStorageJson(getStorageKey(candidateId));
  return Array.isArray(value) ? value.filter(isContractReviewRecord).slice(0, MAX_HISTORY) : [];
}

export function saveContractReview(record: ContractReviewRecord) {
  if (typeof window === "undefined" || !record.candidateId) return;
  const next = [record, ...loadContractReviews(record.candidateId)].slice(0, MAX_HISTORY);
  return writeStorageJson(getStorageKey(record.candidateId), next);
}

export function replaceContractReviews(candidateId: string, records: ContractReviewRecord[]) {
  if (typeof window === "undefined" || !candidateId) return;
  return writeStorageJson(
    getStorageKey(candidateId),
    records.filter((record) => record.candidateId === candidateId && isContractReviewRecord(record)).slice(0, MAX_HISTORY),
  );
}

export function clearContractReviews(candidateId: string) {
  if (typeof window === "undefined" || !candidateId) return;
  return removeStorageItem(getStorageKey(candidateId));
}

export function createContractReviewRecord(
  candidateId: string,
  context: string,
  contractText: string,
  result: ContractScanResult,
): ContractReviewRecord {
  return {
    id: `contract-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    candidateId,
    createdAt: new Date().toISOString(),
    context: context.slice(0, 5000),
    contractText: contractText.slice(0, 50000),
    result,
  };
}

export function isContractReviewRecord(value: unknown): value is ContractReviewRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ContractReviewRecord>;
  return Boolean(
    typeof record.id === "string" &&
      typeof record.candidateId === "string" &&
      typeof record.createdAt === "string" &&
      typeof record.context === "string" &&
      typeof record.contractText === "string" &&
      record.result &&
      (record.result.level === "low" || record.result.level === "medium" || record.result.level === "high") &&
      Array.isArray(record.result.findings),
  );
}
