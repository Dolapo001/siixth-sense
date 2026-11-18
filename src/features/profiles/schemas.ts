import { z } from "zod";
import { avatarPresets } from "@/components/profiles/avatar-presets";

/*
 * Profile editing rules. The server checks again (and alone decides whether a
 * username is taken); these limits are placeholders until the backend sets its own.
 */

/** Names that would impersonate staff, the product or the game's owners. */
export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "support",
  "sixthsense",
  "sixth_sense",
  "rockstar",
  "rockstargames",
  "taketwo",
  "official",
  "system",
  "me",
  "settings",
];

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters.")
  .max(20, "At most 20 characters.")
  .regex(/^[a-z][a-z0-9_]*$/, "Start with a letter; then letters, numbers and underscores only.")
  .refine((name) => !RESERVED_USERNAMES.includes(name), "That name is reserved.");

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(2, "At least 2 characters.").max(32, "At most 32 characters."),
  bio: z.string().trim().max(160, "Keep it under 160 characters."),
  avatarId: z.enum(avatarPresets.map((preset) => preset.id) as [string, ...string[]]).nullable(),
});

export type ProfileFormInput = z.input<typeof profileSchema>;
