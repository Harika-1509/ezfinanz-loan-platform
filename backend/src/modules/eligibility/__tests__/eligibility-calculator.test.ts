import { describe, it, expect } from 'vitest';
import {
  calculateEligibility,
  getCreditScoreBand,
  MIN_INCOME_THRESHOLD,
  MAX_ALLOWED_DTI_RATIO,
  MIN_CREDIT_SCORE,
} from '../eligibility.calculator';
import { EligibilityResult } from '@prisma/client';

describe('Eligibility Pure Calculation Engine (Unit Tests)', () => {
  describe('Credit Score Band Determination (getCreditScoreBand)', () => {
    it('should classify credit score >= 750 as EXCELLENT', () => {
      expect(getCreditScoreBand(750)).toBe('EXCELLENT');
      expect(getCreditScoreBand(820)).toBe('EXCELLENT');
      expect(getCreditScoreBand(900)).toBe('EXCELLENT');
    });

    it('should classify credit score 650 to 749 as GOOD', () => {
      expect(getCreditScoreBand(650)).toBe('GOOD');
      expect(getCreditScoreBand(700)).toBe('GOOD');
      expect(getCreditScoreBand(749)).toBe('GOOD');
    });

    it('should classify credit score 600 to 649 as FAIR', () => {
      expect(getCreditScoreBand(600)).toBe('FAIR');
      expect(getCreditScoreBand(625)).toBe('FAIR');
      expect(getCreditScoreBand(649)).toBe('FAIR');
    });

    it('should classify credit score < 600 as POOR', () => {
      expect(getCreditScoreBand(599)).toBe('POOR');
      expect(getCreditScoreBand(450)).toBe('POOR');
      expect(getCreditScoreBand(300)).toBe('POOR');
    });
  });

  describe('Boundary Scenarios for ELIGIBLE Outcome', () => {
    it('should return ELIGIBLE for EXCELLENT credit (>=750) and DTI <= 40%', () => {
      const result = calculateEligibility({
        income: 60000,
        requestedAmount: 200000,
        creditScore: 780,
        existingDebts: 12000, // DTI = 20%
      });

      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
      expect(result.creditScoreBand).toBe('EXCELLENT');
      expect(result.dtiRatio).toBe(20.0);
      expect(result.maxApprovedAmount).toBeGreaterThanOrEqual(200000);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should return ELIGIBLE for GOOD credit (650-749), DTI <= 35%, and income >= 25,000', () => {
      const result = calculateEligibility({
        income: 50000,
        requestedAmount: 150000,
        creditScore: 700,
        existingDebts: 15000, // DTI = 30%
      });

      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
      expect(result.creditScoreBand).toBe('GOOD');
      expect(result.dtiRatio).toBe(30.0);
      expect(result.maxApprovedAmount).toBe(150000);
    });
  });

  describe('Boundary Scenarios for PARTIALLY_ELIGIBLE Outcome', () => {
    it('should return PARTIALLY_ELIGIBLE for GOOD credit (650-749) with moderate DTI (35% < DTI <= 50%)', () => {
      const result = calculateEligibility({
        income: 50000,
        requestedAmount: 200000,
        creditScore: 680,
        existingDebts: 22000, // DTI = 44%
      });

      expect(result.result).toBe(EligibilityResult.PARTIALLY_ELIGIBLE);
      expect(result.creditScoreBand).toBe('GOOD');
      expect(result.dtiRatio).toBe(44.0);
      expect(result.maxApprovedAmount).toBe(150000); // 75% of 200,000
    });

    it('should return PARTIALLY_ELIGIBLE for FAIR credit (600-649) with DTI <= 40%', () => {
      const result = calculateEligibility({
        income: 40000,
        requestedAmount: 100000,
        creditScore: 620,
        existingDebts: 10000, // DTI = 25%
      });

      expect(result.result).toBe(EligibilityResult.PARTIALLY_ELIGIBLE);
      expect(result.creditScoreBand).toBe('FAIR');
      expect(result.dtiRatio).toBe(25.0);
      expect(result.maxApprovedAmount).toBe(50000); // 50% of 100,000
    });
  });

  describe('Boundary Scenarios for NOT_ELIGIBLE Outcome', () => {
    it('should return NOT_ELIGIBLE when credit score is below minimum threshold (< 600)', () => {
      const result = calculateEligibility({
        income: 80000,
        requestedAmount: 100000,
        creditScore: 580, // Sub-prime decline
        existingDebts: 5000,
      });

      expect(result.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(result.creditScoreBand).toBe('POOR');
      expect(result.maxApprovedAmount).toBe(0);
      expect(result.reasons.some((r) => r.includes(`${MIN_CREDIT_SCORE}`))).toBe(true);
    });

    it('should return NOT_ELIGIBLE when DTI ratio exceeds maximum allowable threshold (> 50%)', () => {
      const result = calculateEligibility({
        income: 50000,
        requestedAmount: 100000,
        creditScore: 800,
        existingDebts: 28000, // DTI = 56%
      });

      expect(result.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(result.dtiRatio).toBe(56.0);
      expect(result.maxApprovedAmount).toBe(0);
      expect(result.reasons.some((r) => r.includes(`${MAX_ALLOWED_DTI_RATIO}%`))).toBe(true);
    });

    it('should return NOT_ELIGIBLE when monthly income is below minimum threshold (< ₹15,000)', () => {
      const result = calculateEligibility({
        income: 12000, // Below 15,000
        requestedAmount: 50000,
        creditScore: 750,
        existingDebts: 2000,
      });

      expect(result.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(result.maxApprovedAmount).toBe(0);
      expect(result.reasons.some((r) => r.includes(`${MIN_INCOME_THRESHOLD.toLocaleString('en-IN')}`))).toBe(true);
    });

    it('should return NOT_ELIGIBLE with specific rejection reasons for low salary (e.g. ₹10,030) and high DTI', () => {
      const result = calculateEligibility({
        income: 10030,
        requestedAmount: 300000,
        creditScore: 720,
        existingDebts: 15000, // DTI = 149.55%
      });

      expect(result.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(result.maxApprovedAmount).toBe(0);
      expect(result.dtiRatio).toBe(149.55);
      expect(result.reasons.some((r) => r.includes('10,030') && r.includes('15,000'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('149.6%') && r.includes('50%'))).toBe(true);
    });

    it('should handle zero or negative income safely', () => {
      const result = calculateEligibility({
        income: 0,
        requestedAmount: 50000,
        creditScore: 750,
        existingDebts: 0,
      });

      expect(result.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(result.maxApprovedAmount).toBe(0);
      expect(result.dtiRatio).toBe(100.0);
    });
  });
});
