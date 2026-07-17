import type { CandidateComparison } from "../models/renting";

export interface RentalCostCalculation {
  totalMonthlyCost?: number;
  upfrontCost?: number;
  monthlyExtras: number;
  depositAmount?: number;
}
export function calculateRentalCosts(comparison: CandidateComparison): RentalCostCalculation {
  const monthlyRent = validAmount(comparison.monthlyRent);
  const monthlyExtras = sumAmounts([
    comparison.monthlyServiceFee,
    comparison.monthlyUtilitiesEstimate,
    comparison.otherMonthlyCost,
  ]);
  const depositMonths = validAmount(comparison.depositMonths);
  const agencyFee = validAmount(comparison.agencyFee) ?? 0;
  const otherUpfrontCost = validAmount(comparison.otherUpfrontCost) ?? 0;
  const depositAmount = monthlyRent !== undefined && depositMonths !== undefined
    ? Math.round(monthlyRent * depositMonths)
    : undefined;

  return {
    monthlyExtras,
    totalMonthlyCost: monthlyRent === undefined ? undefined : Math.round(monthlyRent + monthlyExtras),
    depositAmount,
    upfrontCost:
      monthlyRent === undefined || depositAmount === undefined
        ? undefined
        : Math.round(monthlyRent + depositAmount + agencyFee + otherUpfrontCost),
  };
}

export function applyCalculatedRentalCosts(comparison: CandidateComparison): CandidateComparison {
  const calculated = calculateRentalCosts(comparison);
  return {
    ...comparison,
    totalMonthlyCost: calculated.totalMonthlyCost,
    upfrontCost: calculated.upfrontCost,
  };
}

function validAmount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function sumAmounts(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (validAmount(value) ?? 0), 0);
}
