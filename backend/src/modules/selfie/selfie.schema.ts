import { z } from 'zod';

export const selfieSubmissionSchema = {
  body: z
    .object({
      imageBase64: z.string().optional(),
      selfieBase64: z.string().optional(),
      photo: z.string().optional(),
      image: z.string().optional(),
      base64Data: z.string().optional(),
      base64Image: z.string().optional(),
    })
    .optional(),
};

export type SelfieSubmissionInput = z.infer<
  typeof selfieSubmissionSchema.body
>;
