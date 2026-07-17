import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CandidateListing, RentingProfile } from "../models/renting";
import { loadCandidateListings } from "./candidateStorage";
import { emptyRentingProfile, loadRentingProfile } from "./profileStorage";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

let previousWindow: typeof globalThis.window | undefined;
let storage: MemoryStorage;

beforeEach(() => {
  previousWindow = globalThis.window;
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true },
  });
});
afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  });
});

describe("versioned local storage", () => {
  it("returns a genuinely empty profile for a new user", () => {
    expect(loadRentingProfile()).toEqual(emptyRentingProfile);
  });

  it("migrates the legacy profile without losing user data", () => {
    const profile: RentingProfile = {
      city: "成都",
      commuteTarget: "金融城",
      monthlyBudgetMin: 2800,
      monthlyBudgetMax: 4200,
      maxCommuteMinutes: 40,
      acceptsSharedHousing: false,
      preferences: [],
    };
    storage.setItem("renting-radar.profile.v1", JSON.stringify(profile));

    expect(loadRentingProfile()).toEqual(profile);
    expect(JSON.parse(storage.getItem("renting-radar.profile.v2") ?? "{}")).toEqual({
      version: 2,
      profile,
    });
    expect(storage.getItem("renting-radar.profile.v1")).toBeNull();
  });

  it("migrates legacy candidates and restores missing comparison objects", () => {
    const candidate = {
      id: "candidate-a",
      title: "候选 A",
      sourceLabel: "房东直租",
      createdAt: "2026-07-17T00:00:00.000Z",
      note: "",
      scanInput: { mode: "text", text: "示例", url: "", imageNotes: "", images: [] },
      scanResult: { score: 80, level: "low" },
    } as unknown as CandidateListing;
    storage.setItem("renting-radar.candidates.v1", JSON.stringify([candidate]));

    const migrated = loadCandidateListings();
    expect(migrated).toHaveLength(1);
    expect(migrated[0].comparison).toEqual({});
    expect(storage.getItem("renting-radar.candidates.v1")).toBeNull();
  });
});
