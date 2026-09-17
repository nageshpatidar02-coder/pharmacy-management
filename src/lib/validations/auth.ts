import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12, "Use at least 12 characters").max(128),
  confirmPassword: z.string().min(1).max(128),
}).refine(({ newPassword, confirmPassword }) => newPassword === confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"],
});
