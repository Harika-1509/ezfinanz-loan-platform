import { z } from 'zod';

export const eligibilityCheckSchema = {
  body: z.object({
    income: z
      .number({ required_error: 'Monthly income is required' })
      .min(1000, 'Monthly income must be at least ₹1,000')
      .max(10000000, 'Monthly income cannot exceed ₹1,00,00,000'),
    requestedAmount: z
      .number({ required_error: 'Requested loan amount is required' })
      .min(10000, 'Requested amount must be at least ₹10,000')
      .max(5000000, 'Requested amount cannot exceed ₹50,00,000'),
    creditScore: z
      .number()
      .int('Credit score must be an integer')
      .min(300, 'Credit score cannot be less than 300')
      .max(900, 'Credit score cannot exceed 900')
      .optional(),
    existingDebts: z
      .number({ required_error: 'Existing monthly debts/EMI amount is required' })
      .min(0, 'Existing debts cannot be negative')
      .max(10000000, 'Existing debts cannot exceed ₹1,00,00,000'),
    employerName: z
      .string({ required_error: 'Employer or business name is required' })
      .trim()
      .min(2, 'Employer name must be at least 2 characters')
      .max(100, 'Employer name cannot exceed 100 characters'),
    designation: z
      .string({ required_error: 'Designation or profession is required' })
      .trim()
      .min(2, 'Designation must be at least 2 characters')
      .max(100, 'Designation cannot exceed 100 characters'),
  }),
};

export type EligibilityCheckInput = z.infer<typeof eligibilityCheckSchema.body>;
