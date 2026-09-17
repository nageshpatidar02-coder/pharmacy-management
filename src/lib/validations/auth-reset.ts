import { z } from "zod";

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  newPassword: z.string().min(12, "Use at least 12 characters").max(128),
  confirmPassword: z.string().min(1).max(128),
}).refine(({ newPassword, confirmPassword }) => newPassword === confirmPassword, { message: "New passwords do not match", path: ["confirmPassword"] });
