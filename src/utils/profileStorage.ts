import { starterProfile } from "../data/mockData";
import type { RentingProfile } from "../models/renting";

const STORAGE_KEY = "renting-radar.profile.v1";

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
  if (typeof window === "undefined") {
    return starterProfile;
  }

  const rawProfile = window.localStorage.getItem(STORAGE_KEY);

  if (!rawProfile) {
    return starterProfile;
  }

  try {
    const parsedProfile: unknown = JSON.parse(rawProfile);
    return isRentingProfile(parsedProfile) ? parsedProfile : starterProfile;
  } catch {
    return starterProfile;
  }
}

export function saveRentingProfile(profile: RentingProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function resetRentingProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
