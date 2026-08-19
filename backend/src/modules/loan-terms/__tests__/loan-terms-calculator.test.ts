import { describe, it, expect } from 'vitest';
import {
  calculateEmi,
  calculateIrr,
  calculateLoanTerms,
  DEFAULT_RATE_CONFIG,
} from '../loan-terms.calculator';

describe('Loan Terms Pure Calculation Engine (Unit Tests)', () => {
  describe('EMI Calculation (calculateEmi)', () => {
    it('should calculate correct EMI for reference standard loan: ₹1,00,000 at 12% for 12 months', () => {
      const emi = calculateEmi(100000, 12.0, 12);
      // Reference standard: ₹8,884.88
      expect(emi).toBe(8884.88);
    });

    it('should calculate correct EMI for ₹5,00,000 at 14% for 24 months', () => {
      const emi = calculateEmi(500000, 14.0, 24);
      // Exact calculation: ₹24,006.44
      expect(emi).toBe(24006.44);
    });

    it('should calculate correct EMI for ₹2,00,000 at 15% for 36 months', () => {
      const emi = calculateEmi(200000, 15.0, 36);
      // Reference standard: ₹6,933.07
      expect(emi).toBe(6933.07);
    });

    it('should calculate correct EMI for minimum tenure (6 months)', () => {
      const emi = calculateEmi(60000, 12.0, 6);
      // Reference: ₹10,352.90
      expect(emi).toBe(10352.9);
    });

    it('should handle zero interest rate edge case (0% nominal interest)', () => {
      const emi = calculateEmi(60000, 0, 6);
      expect(emi).toBe(10000);
    });

    it('should return 0 for non-positive principal or tenure', () => {
      expect(calculateEmi(0, 12.0, 12)).toBe(0);
      expect(calculateEmi(100000, 12.0, 0)).toBe(0);
      expect(calculateEmi(-50000, 12.0, 12)).toBe(0);
    });
  });

  describe('IRR Calculation (calculateIrr - Newton-Raphson Numerical Solver)', () => {
    it('should equal the nominal rate in a zero-fee scenario (Net Disbursement == Principal)', () => {
      const principal = 100000;
      const annualRate = 12.0;
      const tenureMonths = 12;
      const emi = calculateEmi(principal, annualRate, tenureMonths);

      const irr = calculateIrr(principal, emi, tenureMonths, annualRate);
      // In a zero-fee structure, annualized IRR must match the nominal interest rate
      expect(Math.round(irr * 10) / 10).toBe(12.0);
    });

    it('should compute higher effective rate when upfront fees reduce net disbursement', () => {
      const principal = 100000;
      const annualRate = 12.0;
      const tenureMonths = 12;
      const emi = calculateEmi(principal, annualRate, tenureMonths);
      const totalCharges = 2860; // 2% fee + 18% GST + 500 other
      const netDisbursement = principal - totalCharges; // 97,140

      const irr = calculateIrr(netDisbursement, emi, tenureMonths, annualRate);

      // Effective rate (IRR) must be higher than nominal rate 12%
      expect(irr).toBeGreaterThan(12.0);
      expect(irr).toBeGreaterThanOrEqual(17.0);
      expect(irr).toBeLessThanOrEqual(18.5);
    });

    it('should converge accurately for 36 months loan with fees', () => {
      const principal = 300000;
      const annualRate = 15.0;
      const tenureMonths = 36;
      const emi = calculateEmi(principal, annualRate, tenureMonths);
      const netDisbursement = principal - 10000; // ₹2,90,000

      const irr = calculateIrr(netDisbursement, emi, tenureMonths, annualRate);
      expect(irr).toBeGreaterThan(15.0);
      expect(irr).toBeLessThan(20.0);
    });

    it('should return 0 for invalid inputs or when total repayments <= disbursement', () => {
      expect(calculateIrr(0, 5000, 12)).toBe(0);
      expect(calculateIrr(100000, 0, 12)).toBe(0);
      expect(calculateIrr(100000, 5000, 12)).toBe(0); // 5000*12 = 60,000 < 100,000
    });
  });

  describe('Full Loan Terms Breakdown (calculateLoanTerms)', () => {
    it('should generate complete loan terms breakdown for 12 months tenure', () => {
      const result = calculateLoanTerms({
        amount: 100000,
        tenureMonths: 12,
      });

      const config = DEFAULT_RATE_CONFIG[12];
      expect(result.amount).toBe(100000);
      expect(result.tenureMonths).toBe(12);
      expect(result.interestRate).toBe(config.baseAnnualInterestRate); // 13.0%

      // Processing fee: 2% of 100,000 = 2,000
      expect(result.processingFee).toBe(2000);
      // GST: 18% of 2,000 = 360
      expect(result.gst).toBe(360);
      // Other charges: 500
      expect(result.otherCharges).toBe(500);
      // Total charges: 2860
      expect(result.totalCharges).toBe(2860);
      // Net disbursement: 100,000 - 2860 = 97,140
      expect(result.netDisbursement).toBe(97140);

      expect(result.emi).toBeGreaterThan(0);
      expect(result.totalRepayment).toBeGreaterThan(result.amount);
      expect(result.totalInterest).toBe(
        Math.round((result.totalRepayment - result.amount) * 100) / 100
      );
      expect(result.irr).toBeGreaterThan(result.interestRate);
    });

    it('should support custom fee overrides in zero-fee scenario', () => {
      const result = calculateLoanTerms({
        amount: 200000,
        tenureMonths: 24,
        customAnnualRate: 14.0,
        customProcessingFeePercent: 0,
        customGstPercent: 0,
        customOtherCharges: 0,
      });

      expect(result.totalCharges).toBe(0);
      expect(result.netDisbursement).toBe(200000);
      expect(Math.round(result.irr * 10) / 10).toBe(14.0);
    });

    it('should compute valid terms across all supported tenures: 6, 12, 18, 24, 36 months', () => {
      const tenures = [6, 12, 18, 24, 36];

      for (const tenure of tenures) {
        const result = calculateLoanTerms({
          amount: 150000,
          tenureMonths: tenure,
        });

        expect(result.tenureMonths).toBe(tenure);
        expect(result.emi).toBeGreaterThan(0);
        expect(result.netDisbursement).toBeGreaterThan(0);
        expect(result.irr).toBeGreaterThan(0);
        expect(result.totalRepayment).toBeGreaterThan(150000);
      }
    });
  });
});
