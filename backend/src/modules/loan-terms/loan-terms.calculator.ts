export interface RateConfigEntry {
  tenureMonths: number;
  baseAnnualInterestRate: number; // e.g. 13.5 (%)
  processingFeePercent: number; // e.g. 2.0 (%)
  gstPercent: number; // e.g. 18.0 (%)
  otherCharges: number; // e.g. 500 (INR)
}

/**
 * Seeded, configurable interest rate and fee matrix by tenure
 */
export const DEFAULT_RATE_CONFIG: Record<number, RateConfigEntry> = {
  6: {
    tenureMonths: 6,
    baseAnnualInterestRate: 12.0,
    processingFeePercent: 2.0,
    gstPercent: 18.0,
    otherCharges: 500,
  },
  12: {
    tenureMonths: 12,
    baseAnnualInterestRate: 13.0,
    processingFeePercent: 2.0,
    gstPercent: 18.0,
    otherCharges: 500,
  },
  18: {
    tenureMonths: 18,
    baseAnnualInterestRate: 13.5,
    processingFeePercent: 2.5,
    gstPercent: 18.0,
    otherCharges: 500,
  },
  24: {
    tenureMonths: 24,
    baseAnnualInterestRate: 14.0,
    processingFeePercent: 2.5,
    gstPercent: 18.0,
    otherCharges: 750,
  },
  36: {
    tenureMonths: 36,
    baseAnnualInterestRate: 15.0,
    processingFeePercent: 3.0,
    gstPercent: 18.0,
    otherCharges: 1000,
  },
};

export interface LoanTermsCalculationInput {
  amount: number;
  tenureMonths: number;
  customAnnualRate?: number;
  customProcessingFeePercent?: number;
  customGstPercent?: number;
  customOtherCharges?: number;
}

export interface LoanTermsCalculationResult {
  amount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee: number;
  gst: number;
  otherCharges: number;
  totalCharges: number;
  netDisbursement: number;
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  irr: number; // Annualized percentage rounded to 2 decimal places
}

/**
 * Pure function: Calculate Equated Monthly Instalment (EMI)
 * Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param principal Loan principal amount (P)
 * @param annualRate Nominal annual interest rate percentage (e.g. 13.5)
 * @param tenureMonths Number of monthly instalments (n)
 * @returns Monthly EMI amount rounded to 2 decimal places
 */
export function calculateEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / (12 * 100);

  if (monthlyRate === 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Pure function: Calculate Internal Rate of Return (IRR) numerically
 * using the Newton-Raphson method with Bisection fallback.
 *
 * Solves for monthly rate m:
 *   NPV(m) = (EMI / m) * (1 - (1 + m)^(-n)) - netDisbursement = 0
 *
 * @param netDisbursement Actual loan funds disbursed to borrower
 * @param emi Monthly EMI instalment
 * @param tenureMonths Number of instalments (n)
 * @param initialGuessAnnualRate Starting annual rate for solver (default 14%)
 * @returns Annualized IRR (Effective Annual Percentage Rate) rounded to 2 decimals
 */
export function calculateIrr(
  netDisbursement: number,
  emi: number,
  tenureMonths: number,
  initialGuessAnnualRate: number = 14.0
): number {
  if (netDisbursement <= 0 || emi <= 0 || tenureMonths <= 0) {
    return 0;
  }

  // If total repayments are less than or equal to disbursement, return 0
  if (emi * tenureMonths <= netDisbursement) {
    return 0;
  }

  let m = Math.max(0.001, initialGuessAnnualRate / (12 * 100));
  const MAX_ITERATIONS = 100;
  const TOLERANCE = 1e-7;

  let converged = false;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const factor = Math.pow(1 + m, -tenureMonths);
    const f = (emi / m) * (1 - factor) - netDisbursement;

    if (Math.abs(f) < TOLERANCE) {
      converged = true;
      break;
    }

    const df =
      (-emi / (m * m)) * (1 - factor) +
      (emi / m) * (tenureMonths * Math.pow(1 + m, -tenureMonths - 1));

    if (Math.abs(df) < 1e-12) {
      break;
    }

    const nextM = m - f / df;

    if (isNaN(nextM) || nextM <= 0 || nextM > 2.0) {
      // Divergence detected; switch to Bisection
      break;
    }

    if (Math.abs(nextM - m) < 1e-9) {
      m = nextM;
      converged = true;
      break;
    }

    m = nextM;
  }

  // Fallback: Bisection Method if Newton-Raphson did not converge
  if (!converged) {
    let low = 0.0001; // ~0.12% annual
    let high = 1.0; // 1200% annual
    for (let j = 0; j < 60; j++) {
      const mid = (low + high) / 2;
      const factorMid = Math.pow(1 + mid, -tenureMonths);
      const fMid = (emi / mid) * (1 - factorMid) - netDisbursement;

      if (Math.abs(fMid) < TOLERANCE) {
        m = mid;
        break;
      }

      if (fMid > 0) {
        low = mid;
      } else {
        high = mid;
      }
      m = mid;
    }
  }

  const annualizedIrr = m * 12 * 100;
  return Math.round(annualizedIrr * 100) / 100;
}

/**
 * Pure function: Calculate full loan terms breakdown
 */
export function calculateLoanTerms(
  input: LoanTermsCalculationInput
): LoanTermsCalculationResult {
  const { amount, tenureMonths } = input;
  const config = DEFAULT_RATE_CONFIG[tenureMonths] || {
    tenureMonths,
    baseAnnualInterestRate: 14.0,
    processingFeePercent: 2.5,
    gstPercent: 18.0,
    otherCharges: 500,
  };

  const interestRate = input.customAnnualRate ?? config.baseAnnualInterestRate;
  const processingFeePercent =
    input.customProcessingFeePercent ?? config.processingFeePercent;
  const gstPercent = input.customGstPercent ?? config.gstPercent;
  const otherCharges = input.customOtherCharges ?? config.otherCharges;

  // 1. Calculate Charges
  const processingFee =
    Math.round(amount * (processingFeePercent / 100) * 100) / 100;
  const gst = Math.round(processingFee * (gstPercent / 100) * 100) / 100;
  const totalCharges =
    Math.round((processingFee + gst + otherCharges) * 100) / 100;

  // 2. Net Disbursement
  const netDisbursement = Math.max(
    0,
    Math.round((amount - totalCharges) * 100) / 100
  );

  // 3. EMI & Repayment
  const emi = calculateEmi(amount, interestRate, tenureMonths);
  const totalRepayment = Math.round(emi * tenureMonths * 100) / 100;
  const totalInterest = Math.max(
    0,
    Math.round((totalRepayment - amount) * 100) / 100
  );

  // 4. IRR (Effective Annualized Rate)
  const irr = calculateIrr(
    netDisbursement,
    emi,
    tenureMonths,
    interestRate
  );

  return {
    amount,
    tenureMonths,
    interestRate,
    processingFee,
    gst,
    otherCharges,
    totalCharges,
    netDisbursement,
    emi,
    totalInterest,
    totalRepayment,
    irr,
  };
}
