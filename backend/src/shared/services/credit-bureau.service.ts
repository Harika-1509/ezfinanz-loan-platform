/**
 * MOCK CREDIT BUREAU SERVICE
 *
 * NOTE: This is a deterministic mock credit scoring service for development and testing.
 * In a production FinTech platform, this would integrate with registered Indian credit bureaus
 * such as TransUnion CIBIL, Experian India, Equifax, or CRIF High Mark via their official APIs.
 */

import { EligibilityResult } from '@prisma/client';

export interface CreditReportParams {
  idNumber: string; // PAN or Aadhaar
  fullName: string;
  monthlyIncome: number;
  requestedAmount: number;
  existingDebts?: number;
}

export type RiskGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH_RISK';

export interface CreditBureauReport {
  cibilScore: number;
  riskGrade: RiskGrade;
  result: EligibilityResult;
  dtiRatio: number;
  monthlyIncome: number;
  requestedAmount: number;
  existingDebts: number;
  maxApprovedAmount: number;
  recommendedInterestRate: number;
  reasons: string[];
  reportGeneratedAt: Date;
}

export interface ICreditBureauService {
  fetchCreditReport(params: CreditReportParams): Promise<CreditBureauReport>;
}

export class MockCreditBureauService implements ICreditBureauService {
  /**
   * Deterministically calculate or retrieve credit score and loan eligibility
   */
  public async fetchCreditReport(params: CreditReportParams): Promise<CreditBureauReport> {
    const { idNumber, monthlyIncome, requestedAmount, existingDebts = 0 } = params;
    const cleanId = idNumber.trim().toUpperCase();

    // 1. Check known demo overrides for reproducible demo scenarios
    let cibilScore: number;

    switch (cleanId) {
      case 'ABCPS1234A': // Aarav Sharma
        cibilScore = 785;
        break;
      case '654321098765': // Rajesh Iyer
        cibilScore = 810;
        break;
      case 'BKIPP5678B': // Priya Patel
        cibilScore = 740;
        break;
      case 'CPYPV9876C': // Ananya Verma
        cibilScore = 715;
        break;
      default: {
        // Deterministic hash based on ID characters
        let hash = 0;
        for (let i = 0; i < cleanId.length; i++) {
          hash = (hash << 5) - hash + cleanId.charCodeAt(i);
          hash |= 0;
        }
        // Normalize to standard CIBIL range [550, 850]
        const positiveHash = Math.abs(hash);
        cibilScore = 600 + (positiveHash % 250);
        break;
      }
    }

    // 2. Compute Debt-to-Income (DTI) ratio
    // Assume rough initial EMI estimate of 3% of requested loan amount
    const estimatedNewEmi = requestedAmount * 0.03;
    const totalObligations = existingDebts + estimatedNewEmi;
    const dtiRatio = Number(((totalObligations / monthlyIncome) * 100).toFixed(2));

    // 3. Determine Risk Grade & Max Approved Amount
    let riskGrade: RiskGrade;
    let recommendedInterestRate: number;
    let maxApprovedMultiplier: number;
    const reasons: string[] = [];

    if (cibilScore >= 770) {
      riskGrade = 'EXCELLENT';
      recommendedInterestRate = 12.5;
      maxApprovedMultiplier = 10;
      reasons.push('High credit score with pristine repayment history');
    } else if (cibilScore >= 700) {
      riskGrade = 'GOOD';
      recommendedInterestRate = 14.0;
      maxApprovedMultiplier = 7;
      reasons.push('Healthy credit profile with low default probability');
    } else if (cibilScore >= 620) {
      riskGrade = 'FAIR';
      recommendedInterestRate = 16.5;
      maxApprovedMultiplier = 4;
      reasons.push('Moderate credit profile with acceptable risk tolerance');
    } else {
      riskGrade = 'HIGH_RISK';
      recommendedInterestRate = 19.5;
      maxApprovedMultiplier = 1.5;
      reasons.push('Low credit score indicates elevated credit risk');
    }

    // Calculate maximum approved amount (capped at ₹15,00,000 for standard personal loans)
    const maxCalculated = monthlyIncome * maxApprovedMultiplier;
    const maxApprovedAmount = Math.min(Math.round(maxCalculated / 10000) * 10000, 1500000);

    // 4. Determine final Eligibility Result
    let result: EligibilityResult;

    if (cibilScore >= 700 && dtiRatio <= 50) {
      result = EligibilityResult.ELIGIBLE;
      reasons.push('Meets all primary underwriting criteria for instant sanction');
    } else if (cibilScore >= 620 && dtiRatio <= 60) {
      result = EligibilityResult.PARTIALLY_ELIGIBLE;
      reasons.push('Partially eligible with reduced loan sanction limit');
    } else {
      result = EligibilityResult.NOT_ELIGIBLE;
      if (cibilScore < 620)
        reasons.push('CIBIL score is below mandatory underwriting threshold (620)');
      if (dtiRatio > 60)
        reasons.push(`DTI ratio (${dtiRatio}%) exceeds maximum permissible ceiling (60%)`);
    }

    console.log(`
    📊 [MockCreditBureauService] Credit Evaluation Completed:
    ID:            ${cleanId}
    Score:         ${cibilScore} (${riskGrade})
    Income:        ₹${monthlyIncome.toLocaleString('en-IN')}
    Requested:     ₹${requestedAmount.toLocaleString('en-IN')}
    DTI Ratio:     ${dtiRatio}%
    Decision:      ${result} (Max Eligible: ₹${maxApprovedAmount.toLocaleString('en-IN')})
    Interest Rate: ${recommendedInterestRate}%
    ----------------------------------------------------------
    `);

    return {
      cibilScore,
      riskGrade,
      result,
      dtiRatio,
      monthlyIncome,
      requestedAmount,
      existingDebts,
      maxApprovedAmount,
      recommendedInterestRate,
      reasons,
      reportGeneratedAt: new Date(),
    };
  }
}

export const creditBureauService: ICreditBureauService = new MockCreditBureauService();
