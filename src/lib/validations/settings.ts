import { z } from "zod";

export const settingsSchema = z.object({
  pharmacyName: z.string().trim().min(1, "Pharmacy name is required").max(120),
  address: z.string().trim().max(500).optional(),
  mobile: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  gstin: z.string().trim().max(30).optional(),
  logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
  invoicePrefix: z.string().trim().min(1).max(12),
  currency: z.string().trim().length(3),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000),
  expiryWarningDays: z.coerce.number().int().min(0).max(3650),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
