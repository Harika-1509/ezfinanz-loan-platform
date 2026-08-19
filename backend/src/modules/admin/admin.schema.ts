import { z } from 'zod';
import { ApplicationStage } from '@prisma/client';

export const listApplicationsSchema = {
  query: z.object({
    page: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : 1))
      .pipe(z.number().int().min(1)),
    limit: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val ? Number(val) : 10))
      .pipe(z.number().int().min(1).max(100)),
    stage: z.nativeEnum(ApplicationStage).optional(),
    search: z.string().trim().optional(),
    q: z.string().trim().optional(),
  }),
};

export type ListApplicationsQuery = z.infer<
  typeof listApplicationsSchema.query
>;

export const reviewSelfieSchema = {
  body: z.object({
    action: z.enum(['APPROVE', 'REJECT'], {
      required_error: "Action is required and must be either 'APPROVE' or 'REJECT'",
    }),
    reason: z
      .string()
      .trim()
      .max(500, 'Rejection reason cannot exceed 500 characters')
      .optional(),
  }),
};

export type ReviewSelfieInput = z.infer<typeof reviewSelfieSchema.body>;

export const rejectSelfieSchema = {
  body: z.object({
    reason: z
      .string({ required_error: 'Rejection reason is required' })
      .trim()
      .min(3, 'Rejection reason must be at least 3 characters long')
      .max(500, 'Rejection reason cannot exceed 500 characters'),
  }),
};

export type RejectSelfieInput = z.infer<typeof rejectSelfieSchema.body>;

export const disburseLoanSchema = {
  body: z
    .object({
      referenceId: z.string().trim().optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .optional(),
};

export type DisburseLoanInput = z.infer<typeof disburseLoanSchema.body>;
