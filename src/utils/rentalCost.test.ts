import { describe, expect, it } from "vitest";
import { applyCalculatedRentalCosts, calculateRentalCosts } from "./rentalCost";

describe("rental cost calculation", () => {
  it("calculates real monthly cost from rent and recurring fees", () => {
    expect(
      calculateRentalCosts({
        monthlyRent: 3200,
        monthlyServiceFee: 180,
        monthlyUtilitiesEstimate: 260,
        otherMonthlyCost: 60,
      }),
    ).toMatchObject({ monthlyExtras: 500, totalMonthlyCost: 3700 });
  });

  it("calculates first payment from first rent, deposit and one-time fees", () => {
    expect(
      calculateRentalCosts({
        monthlyRent: 3200,
        depositMonths: 1,
        agencyFee: 1600,
        otherUpfrontCost: 300,
      }),
    ).toMatchObject({ depositAmount: 3200, upfrontCost: 8300 });
  });

  it("does not invent first payment before deposit terms are known", () => {
    expect(calculateRentalCosts({ monthlyRent: 3200 }).upfrontCost).toBeUndefined();
  });

  it("writes calculated totals back without dropping comparison fields", () => {
    expect(
      applyCalculatedRentalCosts({ monthlyRent: 3000, depositMonths: 2, commuteMinutes: 35 }),
    ).toEqual({
      monthlyRent: 3000,
      depositMonths: 2,
      commuteMinutes: 35,
      totalMonthlyCost: 3000,
      upfrontCost: 9000,
    });
  });
});
