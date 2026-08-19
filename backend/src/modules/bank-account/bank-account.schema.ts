import { z } from 'zod';

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export const bankAccountSchema = {
  body: z.object({
    holderName: z
      .string({ required_error: 'Account holder name is required' })
      .trim()
      .min(2, 'Account holder name must be at least 2 characters')
      .max(100, 'Account holder name cannot exceed 100 characters'),
    accountNumber: z
      .string({ required_error: 'Bank account number is required' })
      .trim()
      .regex(
        ACCOUNT_NUMBER_REGEX,
        'Invalid bank account number. Must contain 9 to 18 digits.'
      ),
    ifsc: z
      .string({ required_error: 'Bank IFSC code is required' })
      .trim()
      .transform((val) => val.toUpperCase())
      .refine(
        (val) => IFSC_REGEX.test(val),
        'Invalid IFSC code format. Must be 11 characters (e.g., HDFC0001234 or SBIN0004567).'
      ),
    bankName: z
      .string({ required_error: 'Bank name is required' })
      .trim()
      .min(2, 'Bank name must be at least 2 characters')
      .max(100, 'Bank name cannot exceed 100 characters'),
  }),
};

export type BankAccountInput = z.infer<typeof bankAccountSchema.body>;
