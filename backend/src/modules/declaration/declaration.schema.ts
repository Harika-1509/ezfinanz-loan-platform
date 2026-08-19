import { z } from 'zod';

export const declarationAcceptSchema = {
  body: z.object({
    accepted: z.literal(true, {
      errorMap: () => ({
        message:
          'You must explicitly accept and confirm the loan terms declaration to proceed.',
      }),
    }),
    termsVersion: z.string().trim().min(1).default('v1.0'),
  }),
};

export type DeclarationAcceptInput = z.infer<
  typeof declarationAcceptSchema.body
>;
