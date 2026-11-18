import { z } from "zod";
import { reportReasons } from "@/features/discoveries/types";
import { discoveryCategories } from "@/features/world/types";

/*
 * Client-side validation for community forms. The server validates again;
 * these limits are placeholders until the backend defines its own.
 */

export const commentSchema = z.object({
  body: z.string().trim().min(2, "Write at least 2 characters.").max(2000, "Keep comments under 2,000 characters."),
});

export const suggestionSchema = z.object({
  label: z.string().trim().min(2, "Name what you think it is.").max(80, "Keep the name under 80 characters."),
  category: z.enum(discoveryCategories, { message: "Choose a category." }),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
});

export const evidenceSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, "Describe the evidence in at least 10 characters.")
    .max(1000, "Keep evidence under 1,000 characters."),
  url: z
    .union([
      z.literal(""),
      z.url({ protocol: /^https?$/, message: "Enter a full link starting with http:// or https://" }),
    ])
    .optional(),
});

export const disputeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Say why in at least 10 characters, so reviewers can check it.")
    .max(500, "Keep the reason under 500 characters."),
});

const reasonValues = reportReasons.map((r) => r.value) as [string, ...string[]];

export const reportSchema = z.object({
  reason: z.enum(reasonValues, { message: "Choose a reason." }),
  details: z.string().trim().max(1000, "Keep details under 1,000 characters.").optional(),
});

export type CommentInput = z.infer<typeof commentSchema>;
export type SuggestionInput = z.infer<typeof suggestionSchema>;
export type EvidenceInput = z.infer<typeof evidenceSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type ReportInput = z.infer<typeof reportSchema>;

export const shareSchema = z.object({
  title: z.string().trim().min(3, "Give it a short title.").max(100, "Keep the title under 100 characters."),
  category: z.enum(discoveryCategories, { message: "Choose a category." }),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
  /** "" = not sure where it is. */
  locationId: z.string(),
});
