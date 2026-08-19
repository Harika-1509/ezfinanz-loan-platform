import { describe, it, expect } from 'vitest';
import { MockCreditBureauService } from '../credit-bureau.service';
import { EligibilityResult } from '@prisma/client';

describe('CreditBureauService', () => {
  const service = new MockCreditBureauService();

  it('should return high score and ELIGIBLE decision for demo user Aarav Sharma', async () => {
    const report = await service.fetchCreditReport({
      idNumber: 'ABCPS1234A',
      fullName: 'Aarav Sharma',
      monthlyIncome: 125000,
      requestedAmount: 500000,
      existingDebts: 15000,
    });

    expect(report.cibilScore).toBe(785);
    expect(report.riskGrade).toBe('EXCELLENT');
    expect(report.result).toBe(EligibilityResult.ELIGIBLE);
    expect(report.recommendedInterestRate).toBe(12.5);
    expect(report.maxApprovedAmount).toBeGreaterThanOrEqual(500000);
  });

  it('should return score 810 for Rajesh Iyer', async () => {
    const report = await service.fetchCreditReport({
      idNumber: '654321098765',
      fullName: 'Rajesh Iyer',
      monthlyIncome: 160000,
      requestedAmount: 800000,
      existingDebts: 20000,
    });

    expect(report.cibilScore).toBe(810);
    expect(report.result).toBe(EligibilityResult.ELIGIBLE);
    expect(report.riskGrade).toBe('EXCELLENT');
  });

  it('should evaluate DTI ratio correctly', async () => {
    const report = await service.fetchCreditReport({
      idNumber: 'XYZPB9999K',
      fullName: 'Test High Debt',
      monthlyIncome: 50000,
      requestedAmount: 1000000,
      existingDebts: 40000,
    });

    // High obligations relative to income
    expect(report.dtiRatio).toBeGreaterThan(60);
    expect(report.result).toBe(EligibilityResult.NOT_ELIGIBLE);
  });
});
