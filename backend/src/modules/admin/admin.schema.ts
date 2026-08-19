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
