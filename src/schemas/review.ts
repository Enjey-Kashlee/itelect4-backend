import { z } from "zod";

export const aiRequestSchema = z.strictObject({
  prompt: z
    .string()
    .trim()
    .min(
      20,
      "Describe your item and ownership evidence in at least 20 characters.",
    )
    .max(2000, "Keep the description under 2000 characters."),
});

export const reviewSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe(
      "One sentence summarizing the item and ownership evidence provided.",
    ),
  strengths: z
    .array(z.string().trim().min(1).max(400))
    .min(1)
    .max(3)
    .describe(
      "Specific useful identifying details already provided; say if none are provided.",
    ),
  improvements: z
    .array(z.string().trim().min(1).max(400))
    .min(1)
    .max(3)
    .describe(
      "Honest, practical next steps before submitting a claim; never invent evidence.",
    ),
  readiness: z
    .enum(["ready", "almost", "not-yet"])
    .describe(
      "Quality of the description for submission, never approval or proof of ownership.",
    ),
});

export type Review = z.infer<typeof reviewSchema>;
export const reviewJsonSchema = z.toJSONSchema(reviewSchema);
