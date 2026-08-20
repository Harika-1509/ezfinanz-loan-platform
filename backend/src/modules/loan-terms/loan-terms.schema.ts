import { z } from 'zod';

export const ALLOWED_TENURES = [6, 12, 18, 24, 36] as const;

export const loanTermsCalculationSchema = {
  body: z.object({
    amount: z
      .number({ required_error: 'Loan amount is required' })
      .min(10000, 'Loan amount must be at least ₹10,000')
      .max(500000, 'Loan amount cannot exceed ₹5,00,000'),
    tenureMonths: z
      .number({ required_error: 'Tenure in months is required' })
      .refine(
        (val) => ALLOWED_TENURES.includes(val as any),
        'Supported tenure options are 6, 12, 18, 24, or 36 months'
      ),
  }),
};

export const loanTermsConfirmSchema = {
  body: z.object({
    amount: z
      .number({ required_error: 'Loan amount is required' })
      .min(10000, 'Loan amount must be at least ₹10,000')
      .max(500000, 'Loan amount cannot exceed ₹5,00,000'),
    tenureMonths: z
      .number({ required_error: 'Tenure in months is required' })
      .refine(
        (val) => ALLOWED_TENURES.includes(val as any),
        'Supported tenure options are 6, 12, 18, 24, or 36 months'
      ),
  }),
};

export type LoanTermsCalculateInput = z.infer<
  typeof loanTermsCalculationSchema.body
>;
export type LoanTermsConfirmInput = z.infer<
  typeof loanTermsConfirmSchema.body
>;
