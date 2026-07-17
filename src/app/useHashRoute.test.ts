import { describe, expect, it } from "vitest";
import { getRouteHash, readRouteFromHash } from "./useHashRoute";

describe("hash routing", () => {
  it("creates stable hashes for product pages", () => {
    expect(getRouteHash("compare")).toBe("#/compare");
    expect(getRouteHash("overview")).toBe("#/overview");
  });

  it("restores a known route and rejects unknown routes", () => {
    expect(readRouteFromHash("#/checklist")).toBe("checklist");
    expect(readRouteFromHash("#contract")).toBe("contract");
    expect(readRouteFromHash("#/not-a-route")).toBe("overview");
    expect(readRouteFromHash("")).toBe("overview");
  });
});
