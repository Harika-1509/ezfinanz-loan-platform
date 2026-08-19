import { EligibilityResult } from '@prisma/client';

export type CreditScoreBand = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface EligibilityCalculationInput {
  income: number; // Monthly net income in INR (e.g. 50000)
  requestedAmount: number; // Requested loan principal in INR (e.g. 200000)
  creditScore: number; // CIBIL credit score between 300 and 900 (e.g. 780)
  existingDebts: number; // Total existing monthly EMI obligations in INR (e.g. 10000)
  employerName?: string;
  designation?: string;
}

export interface EligibilityCalculationResult {
  result: EligibilityResult;
  creditScoreBand: CreditScoreBand;
  dtiRatio: number; // Percentage rounded to 2 decimal places (e.g. 20.00)
  maxApprovedAmount: number; // In INR, rounded to nearest 1,000
  reasons: string[];
}

/**
 * Minimum monthly net income threshold for personal loan eligibility (INR)
 */
export const MIN_INCOME_THRESHOLD = 15000;

/**
 * Maximum permissible Debt-To-Income (DTI) ratio before automatic decline
 */
export const MAX_ALLOWED_DTI_RATIO = 50.0;

/**
 * Minimum credit score for personal loan eligibility
 */
export const MIN_CREDIT_SCORE = 600;

/**
 * Determines the credit score tier based on standard Indian CIBIL grading:
 * - EXCELLENT: 750 to 900 (Prime borrower, lowest risk)
 * - GOOD:      650 to 749 (Near-prime borrower, acceptable risk)
 * - FAIR:      600 to 649 (Sub-prime borrower, moderate risk)
 * - POOR:      300 to 599 (High risk, automatic decline)
 */
export function getCreditScoreBand(creditScore: number): CreditScoreBand {
  if (creditScore >= 750) {
    return 'EXCELLENT';
  }
  if (creditScore >= 650) {
    return 'GOOD';
  }
  if (creditScore >= 600) {
    return 'FAIR';
  }
  return 'POOR';
}

/**
 * Pure, dependency-free business logic calculation engine for loan eligibility.
 * 
 * Performs deterministic assessment of:
 * 1. Debt-To-Income (DTI) ratio = (existingDebts / income) * 100
 * 2. Credit score classification band
 * 3. Final underwriting outcome: ELIGIBLE, PARTIALLY_ELIGIBLE, or NOT_ELIGIBLE
 * 4. Maximum sanctioned borrowing limit
 * 
 * @param input Pure calculation inputs (income, requestedAmount, creditScore, existingDebts)
 * @returns Comprehensive, deterministic eligibility assessment
 */
export function calculateEligibility(
  input: EligibilityCalculationInput
): EligibilityCalculationResult {
  const { income, requestedAmount, creditScore, existingDebts } = input;
  const reasons: string[] = [];

  // 1. Boundary & Sanity Checks for Income
  if (income <= 0) {
    return {
      result: EligibilityResult.NOT_ELIGIBLE,
      creditScoreBand: getCreditScoreBand(creditScore),
      dtiRatio: 100.0,
      maxApprovedAmount: 0,
      reasons: ['Monthly income must be greater than zero.'],
    };
  }

  // 2. Compute Debt-to-Income (DTI) Ratio (Percentage rounded to 2 decimal places)
  const rawDti = (Math.max(0, existingDebts) / income) * 100;
  const dtiRatio = Math.round(rawDti * 100) / 100;

  // 3. Determine Credit Score Band
  const creditScoreBand = getCreditScoreBand(creditScore);

  // 4. Hard Decline Rules
  let isHardDeclined = false;

  if (income < MIN_INCOME_THRESHOLD) {
    reasons.push(
      `Monthly income of ₹${income.toLocaleString('en-IN')} is below the minimum threshold of ₹${MIN_INCOME_THRESHOLD.toLocaleString('en-IN')}.`
    );
    isHardDeclined = true;
  }

  if (creditScore < MIN_CREDIT_SCORE) {
    reasons.push(
      `Credit score of ${creditScore} is below the minimum required credit score of ${MIN_CREDIT_SCORE}.`
    );
    isHardDeclined = true;
  }

  if (dtiRatio > MAX_ALLOWED_DTI_RATIO) {
    reasons.push(
      `Debt-to-Income (DTI) ratio of ${dtiRatio.toFixed(1)}% exceeds the maximum allowable limit of ${MAX_ALLOWED_DTI_RATIO}%.`
    );
    isHardDeclined = true;
  }

  if (isHardDeclined) {
    return {
      result: EligibilityResult.NOT_ELIGIBLE,
      creditScoreBand,
      dtiRatio,
      maxApprovedAmount: 0,
      reasons,
    };
  }

  // 5. Tiered Underwriting Logic for Approved & Partially Approved applicants

  // Tier 1: EXCELLENT Credit (>= 750) & Manageable DTI (<= 40%)
  if (creditScoreBand === 'EXCELLENT' && dtiRatio <= 40.0) {
    // Borrower can borrow up to 10x monthly income, capped at maximum requested or 1.25x requested
    const incomeMultiplierMax = income * 10;
    const maxApprovedAmount = Math.round(
      Math.max(requestedAmount, Math.min(incomeMultiplierMax, requestedAmount * 1.25))
    );

    reasons.push('Excellent credit history and low debt obligations qualify for full requested loan amount.');
    return {
      result: EligibilityResult.ELIGIBLE,
      creditScoreBand,
      dtiRatio,
      maxApprovedAmount,
      reasons,
    };
  }

  // Tier 2: GOOD Credit (650–749) & Ideal DTI (<= 35%)
  if (creditScoreBand === 'GOOD' && dtiRatio <= 35.0 && income >= 25000) {
    const maxApprovedAmount = requestedAmount;
    reasons.push('Good credit profile and low debt obligations qualify for requested loan amount.');
    return {
      result: EligibilityResult.ELIGIBLE,
      creditScoreBand,
      dtiRatio,
      maxApprovedAmount,
      reasons,
    };
  }

  // Tier 3: Partially Eligible - GOOD Credit (650–749) with Moderate DTI (35% < DTI <= 50%)
  if (creditScoreBand === 'GOOD' && dtiRatio > 35.0 && dtiRatio <= 50.0) {
    // 75% of requested amount or up to 6x income
    const maxApprovedAmount = Math.round(
      Math.min(requestedAmount * 0.75, income * 6)
    );
    reasons.push(
      `Moderate Debt-to-Income ratio (${dtiRatio.toFixed(1)}%) qualifies for a partially approved amount of ₹${maxApprovedAmount.toLocaleString('en-IN')}.`
    );
    return {
      result: EligibilityResult.PARTIALLY_ELIGIBLE,
      creditScoreBand,
      dtiRatio,
      maxApprovedAmount,
      reasons,
    };
  }

  // Tier 4: Partially Eligible - FAIR Credit (600–649) with Low/Moderate DTI (<= 40%)
  if (creditScoreBand === 'FAIR' && dtiRatio <= 40.0) {
    // 50% of requested amount or up to 4x income, capped at ₹3,00,000
    const maxApprovedAmount = Math.round(
      Math.min(requestedAmount * 0.5, income * 4, 300000)
    );
    reasons.push(
      `Fair credit score (${creditScore}) qualifies for a reduced sanctioned limit of ₹${maxApprovedAmount.toLocaleString('en-IN')}.`
    );
    return {
      result: EligibilityResult.PARTIALLY_ELIGIBLE,
      creditScoreBand,
      dtiRatio,
      maxApprovedAmount,
      reasons,
    };
  }

  // Tier 5: Fallback if EXCELLENT credit but 40% < DTI <= 50%
  if (creditScoreBand === 'EXCELLENT' && dtiRatio > 40.0 && dtiRatio <= 50.0) {
    const maxApprovedAmount = Math.round(Math.min(requestedAmount * 0.85, income * 7));
    reasons.push(
      `Higher debt obligation (${dtiRatio.toFixed(1)}% DTI) qualifies for a partially adjusted amount of ₹${maxApprovedAmount.toLocaleString('en-IN')}.`
    );
    return {
      result: EligibilityResult.PARTIALLY_ELIGIBLE,
      creditScoreBand,
      dtiRatio,
      maxApprovedAmount,
      reasons,
    };
  }

  // Tier 6: Default Decline for all unclassified risk combinations
  reasons.push('Financial risk profile exceeds our current underwriting criteria.');
  return {
    result: EligibilityResult.NOT_ELIGIBLE,
    creditScoreBand,
    dtiRatio,
    maxApprovedAmount: 0,
    reasons,
  };
}
