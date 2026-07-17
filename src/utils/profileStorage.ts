import type { RentingProfile } from "../models/renting";
import { readStorageJson, removeStorageItem, writeStorageJson } from "./browserStorage";

const STORAGE_KEY = "renting-radar.profile.v2";
const LEGACY_STORAGE_KEY = "renting-radar.profile.v1";
const SCHEMA_VERSION = 2;

interface ProfileStorageEnvelope {
  version: number;
  profile: RentingProfile;
}

export const emptyRentingProfile: RentingProfile = {
  city: "",
  commuteTarget: "",
  monthlyBudgetMin: 0,
  monthlyBudgetMax: 0,
  maxCommuteMinutes: 45,
  acceptsSharedHousing: false,
  preferences: [],
};

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

export function loadRentingProfile(): RentingProfile {
  const storedValue = readStorageJson(STORAGE_KEY);
  if (isProfileEnvelope(storedValue) && isRentingProfile(storedValue.profile)) {
    return storedValue.profile;
  }

  const legacyValue = readStorageJson(LEGACY_STORAGE_KEY);
  if (isRentingProfile(legacyValue)) {
    if (saveRentingProfile(legacyValue)) {
      removeStorageItem(LEGACY_STORAGE_KEY);
    }
    return legacyValue;
  }

  return emptyRentingProfile;
}

export function saveRentingProfile(profile: RentingProfile) {
  const envelope: ProfileStorageEnvelope = {
    version: SCHEMA_VERSION,
    profile,
  };
  return writeStorageJson(STORAGE_KEY, envelope);
}

export function resetRentingProfile() {
  removeStorageItem(STORAGE_KEY);
  removeStorageItem(LEGACY_STORAGE_KEY);
}

function isProfileEnvelope(value: unknown): value is ProfileStorageEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }
  const envelope = value as Partial<ProfileStorageEnvelope>;
  return envelope.version === SCHEMA_VERSION && Boolean(envelope.profile);
}
