import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export const registrationSchema = z.object({
  pharmacyName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^[+\d][\d\s().-]{7,19}$/),
  password: z.string().min(12).max(128),
  confirmPassword: z.string().min(1).max(128),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pincode: z.string().trim().regex(/^\d{6}$/).optional().or(z.literal("")),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  drugLicenseNumber: z.string().trim().max(40).optional().or(z.literal("")),
}).refine(({ password, confirmPassword }) => password === confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
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
