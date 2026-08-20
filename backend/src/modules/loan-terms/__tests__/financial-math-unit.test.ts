import { describe, it, expect } from 'vitest';
import {
  calculateEmi,
  calculateIrr,
  calculateLoanTerms,
  DEFAULT_RATE_CONFIG,
} from '../loan-terms.calculator';
import {
  calculateEligibility,
  getCreditScoreBand,
  MIN_INCOME_THRESHOLD,
  MAX_ALLOWED_DTI_RATIO,
  MIN_CREDIT_SCORE,
} from '../../eligibility/eligibility.calculator';
import { EligibilityResult } from '@prisma/client';

describe('Chunk 26: Financial Pure Mathematics & Boundary Unit Test Suite', () => {
  // ==========================================================================
  // 1. EMI CALCULATION (calculateEmi) MATHEMATICAL INVARIANTS & BOUNDARIES
  // ==========================================================================
  describe('EMI Calculation Mathematical Invariants & Boundaries', () => {
    it('should compute exact EMI for minimum borrowing boundary (₹10,000 at 12% for 6 months)', () => {
      const emi = calculateEmi(10000, 12.0, 6);
      // P = 10000, r = 0.01, n = 6
      // EMI = 10000 * 0.01 * (1.01)^6 / ((1.01)^6 - 1) = 1725.48
      expect(emi).toBe(1725.48);
    });

    it('should compute exact EMI for maximum borrowing ceiling (₹50,00,000 at 15% for 36 months)', () => {
      const emi = calculateEmi(5000000, 15.0, 36);
      // P = 5000000, r = 0.0125, n = 36
      // Exact calculation: ₹1,73,326.64
      expect(emi).toBe(173326.64);
    });

    it('should handle fractional interest rates with exact mathematical precision (e.g. 13.75% for 18 months)', () => {
      const emi = calculateEmi(250000, 13.75, 18);
      // Monthly rate = 13.75 / 1200 = 0.0114583333...
      // Exact calculation: ₹15,449.52
      expect(emi).toBe(15449.52);
    });

    it('should calculate 1-month tenure single instalment with 1 month of interest', () => {
      const emi = calculateEmi(100000, 12.0, 1);
      // 100000 + 1% interest = 101,000
      expect(emi).toBe(101000.0);
    });

    it('should correctly handle 0% nominal interest rate (flat division)', () => {
      expect(calculateEmi(120000, 0, 12)).toBe(10000.0);
      expect(calculateEmi(50000, 0, 5)).toBe(10000.0);
      expect(calculateEmi(100000, 0, 3)).toBe(33333.33);
    });

    it('should return 0 for zero or negative principal amounts', () => {
      expect(calculateEmi(0, 14.0, 12)).toBe(0);
      expect(calculateEmi(-10000, 14.0, 12)).toBe(0);
    });

    it('should return 0 for zero or negative tenure months', () => {
      expect(calculateEmi(100000, 14.0, 0)).toBe(0);
      expect(calculateEmi(100000, 14.0, -12)).toBe(0);
    });

    it('should satisfy monotonic property: EMI strictly increases with interest rate for same principal & tenure', () => {
      const emiLow = calculateEmi(200000, 10.0, 24);
      const emiMid = calculateEmi(200000, 14.0, 24);
      const emiHigh = calculateEmi(200000, 18.0, 24);

      expect(emiLow).toBeLessThan(emiMid);
      expect(emiMid).toBeLessThan(emiHigh);
    });

    it('should satisfy monotonic property: EMI strictly decreases with tenure length for same principal & rate', () => {
      const emiShort = calculateEmi(200000, 14.0, 12);
      const emiMed = calculateEmi(200000, 14.0, 24);
      const emiLong = calculateEmi(200000, 14.0, 36);

      expect(emiShort).toBeGreaterThan(emiMed);
      expect(emiMed).toBeGreaterThan(emiLong);
    });
  });

  // ==========================================================================
  // 2. NEWTON-RAPHSON IRR SOLVER MATHEMATICAL INVARIANTS & CONVERGENCE
  // ==========================================================================
  describe('Newton-Raphson IRR Solver Mathematical Invariants', () => {
    it('should prove IRR equals nominal interest rate when total charges are zero ($NetDisbursement == Principal$)', () => {
      const principal = 300000;
      const nominalRate = 13.5;
      const tenure = 24;
      const emi = calculateEmi(principal, nominalRate, tenure);

      const irr = calculateIrr(principal, emi, tenure, nominalRate);
      expect(Math.round(irr * 10) / 10).toBe(nominalRate);
    });

    it('should prove IRR is strictly greater than nominal rate when upfront processing fees/GST exist', () => {
      const principal = 200000;
      const nominalRate = 13.0;
      const tenure = 12;
      const emi = calculateEmi(principal, nominalRate, tenure);
      const netDisbursement = principal - 5720; // 2% fee + 18% GST + 1000 other = 194,280

      const irr = calculateIrr(netDisbursement, emi, tenure, nominalRate);
      expect(irr).toBeGreaterThan(nominalRate);
      expect(irr).toBeGreaterThan(18.0);
    });

    it('should converge accurately for heavy fee deductions (e.g. 5% processing fee + GST)', () => {
      const principal = 100000;
      const nominalRate = 12.0;
      const tenure = 12;
      const emi = calculateEmi(principal, nominalRate, tenure);
      const netDisbursement = 90000; // ₹10,000 total deduction (10% haircut)

      const irr = calculateIrr(netDisbursement, emi, tenure, nominalRate);
      expect(irr).toBeGreaterThan(30.0);
      expect(irr).toBeLessThan(40.0);
    });

    it('should safely return 0 when total repayments do not exceed net disbursement', () => {
      // Net disbursement 1,00,000 but repayments are only 12 * 8,000 = 96,000
      expect(calculateIrr(100000, 8000, 12)).toBe(0);
      expect(calculateIrr(100000, 0, 12)).toBe(0);
      expect(calculateIrr(0, 10000, 12)).toBe(0);
    });

    it('should solve IRR across all supported tenures (6, 12, 18, 24, 36 months) with positive values', () => {
      const tenures = [6, 12, 18, 24, 36];

      for (const t of tenures) {
        const terms = calculateLoanTerms({ amount: 100000, tenureMonths: t });
        expect(terms.irr).toBeGreaterThan(terms.interestRate);
        expect(terms.irr).toBeLessThan(35.0);
      }
    });
  });

  // ==========================================================================
  // 3. AMORTIZATION SCHEDULE MATHEMATICAL INVARIANTS
  // ==========================================================================
  describe('Amortization Schedule Mathematical Invariants', () => {
    it('should verify amortization schedule properties: Principal sums to Loan Amount and final balance is 0.00', () => {
      const principal = 150000;
      const annualRate = 14.0;
      const tenureMonths = 12;
      const emi = calculateEmi(principal, annualRate, tenureMonths);

      const monthlyRate = annualRate / 1200;
      let balance = principal;
      let totalPrincipalPaid = 0;
      let totalInterestPaid = 0;

      for (let month = 1; month <= tenureMonths; month++) {
        const interestForMonth = Math.round(balance * monthlyRate * 100) / 100;
        let principalForMonth = Math.round((emi - interestForMonth) * 100) / 100;

        // Final month adjustment
        if (month === tenureMonths) {
          principalForMonth = balance;
        }

        balance = Math.round((balance - principalForMonth) * 100) / 100;
        totalPrincipalPaid += principalForMonth;
        totalInterestPaid += interestForMonth;

        // Invariant: Balance decreases each month
        expect(balance).toBeLessThan(principal);
      }

      // Invariants
      expect(Math.round(totalPrincipalPaid)).toBe(principal);
      expect(balance).toBe(0.0);
      expect(totalInterestPaid).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 4. DTI & ELIGIBILITY CALCULATION BOUNDARY CONDITIONS
  // ==========================================================================
  describe('DTI & Eligibility Pure Calculation Boundaries', () => {
    it('should correctly classify exact credit score boundaries (300, 599, 600, 649, 650, 749, 750, 900)', () => {
      expect(getCreditScoreBand(300)).toBe('POOR');
      expect(getCreditScoreBand(599)).toBe('POOR');
      expect(getCreditScoreBand(600)).toBe('FAIR');
      expect(getCreditScoreBand(649)).toBe('FAIR');
      expect(getCreditScoreBand(650)).toBe('GOOD');
      expect(getCreditScoreBand(749)).toBe('GOOD');
      expect(getCreditScoreBand(750)).toBe('EXCELLENT');
      expect(getCreditScoreBand(900)).toBe('EXCELLENT');
    });

    it('should reject income below minimum floor (₹14,999 vs ₹15,000)', () => {
      const belowFloor = calculateEligibility({
        income: 14999,
        requestedAmount: 50000,
        creditScore: 800,
        existingDebts: 0,
      });
      expect(belowFloor.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(belowFloor.maxApprovedAmount).toBe(0);

      const atFloor = calculateEligibility({
        income: 15000,
        requestedAmount: 50000,
        creditScore: 800,
        existingDebts: 0,
      });
      expect(atFloor.result).toBe(EligibilityResult.ELIGIBLE);
      expect(atFloor.maxApprovedAmount).toBeGreaterThanOrEqual(50000);
    });

    it('should reject DTI exceeding ceiling (50.00% vs 50.01%)', () => {
      const atCeiling = calculateEligibility({
        income: 100000,
        requestedAmount: 100000,
        creditScore: 700,
        existingDebts: 50000, // Exactly 50.0% DTI
      });
      expect(atCeiling.result).toBe(EligibilityResult.PARTIALLY_ELIGIBLE);

      const aboveCeiling = calculateEligibility({
        income: 100000,
        requestedAmount: 100000,
        creditScore: 700,
        existingDebts: 50010, // 50.01% DTI
      });
      expect(aboveCeiling.result).toBe(EligibilityResult.NOT_ELIGIBLE);
      expect(aboveCeiling.maxApprovedAmount).toBe(0);
    });

    it('should handle zero debt (0% DTI) perfectly', () => {
      const zeroDebt = calculateEligibility({
        income: 80000,
        requestedAmount: 300000,
        creditScore: 820,
        existingDebts: 0,
      });
      expect(zeroDebt.result).toBe(EligibilityResult.ELIGIBLE);
      expect(zeroDebt.dtiRatio).toBe(0.0);
      expect(zeroDebt.maxApprovedAmount).toBeGreaterThanOrEqual(300000);
    });

    it('should compute appropriate max approved limits based on income multipliers (10x for EXCELLENT)', () => {
      const result = calculateEligibility({
        income: 50000,
        requestedAmount: 600000,
        creditScore: 800,
        existingDebts: 5000,
      });
      // EXCELLENT credit with requested 6,00,000 (10x income = 5,00,000; 1.25x requested = 7,50,000)
      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
      expect(result.maxApprovedAmount).toBe(600000);
    });

    it('should cap FAIR credit applicants to 50% requested or 4x income (max ₹3,00,000)', () => {
      const result = calculateEligibility({
        income: 80000,
        requestedAmount: 400000,
        creditScore: 620, // FAIR
        existingDebts: 10000, // DTI = 12.5%
      });
      // 50% of 400,000 = 200,000
      expect(result.result).toBe(EligibilityResult.PARTIALLY_ELIGIBLE);
      expect(result.maxApprovedAmount).toBe(200000);
    });
  });
});
