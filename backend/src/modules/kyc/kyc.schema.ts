import { z } from 'zod';
import { IdType } from '@prisma/client';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^[2-9]{1}[0-9]{11}$/;

/**
 * Calculates accurate age from a birth date string
 */
export function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) {
    return -1;
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export const kycSubmissionSchema = {
  body: z
    .object({
      fullName: z
        .string({ required_error: 'Full name is required' })
        .trim()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name cannot exceed 100 characters'),
      dob: z
        .string({ required_error: 'Date of birth is required' })
        .refine((val) => !isNaN(Date.parse(val)), {
          message: 'Please enter a valid date of birth (YYYY-MM-DD)',
        })
        .refine((val) => calculateAge(val) >= 18, {
          message: 'Applicant must be at least 18 years old to apply for a loan',
        }),
      gender: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        z.enum(['MALE', 'FEMALE', 'OTHER'], {
          required_error: 'Gender is required (MALE, FEMALE, or OTHER)',
        })
      ),
      address: z
        .string({ required_error: 'Current residential address is required' })
        .trim()
        .min(5, 'Address must be at least 5 characters')
        .max(300, 'Address cannot exceed 300 characters'),
      idType: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        z.nativeEnum(IdType, {
          required_error: 'ID type is required (PAN or AADHAAR)',
        })
      ),
      idNumber: z
        .string({ required_error: 'ID number is required' })
        .trim()
        .toUpperCase(),
      idPhotoUrl: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.idType === IdType.PAN) {
        if (!PAN_REGEX.test(data.idNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['idNumber'],
            message: 'Invalid PAN card format. Must be 10 characters (e.g. ABCDE1234F)',
          });
        }
      } else if (data.idType === IdType.AADHAAR) {
        // Remove whitespace/dashes if any
        const cleanedAadhaar = data.idNumber.replace(/[\s-]/g, '');
        if (!AADHAAR_REGEX.test(cleanedAadhaar)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['idNumber'],
            message:
              'Invalid Aadhaar format. Must be a valid 12-digit number starting with 2-9',
          });
        }
      }
    }),
};

export type KycSubmissionInput = z.infer<typeof kycSubmissionSchema.body>;
