import { z } from "zod";

export const supplierSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  contactPerson: z.string().trim().max(120).optional().default(""),
  mobile: z.string().trim().max(30).optional().default(""),
  email: z.union([z.string().email(), z.literal("")]).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  gstin: z.string().trim().max(30).optional().default(""),
  paymentTerms: z.string().trim().max(120).optional().default(""),
  openingBalance: z.coerce.number().finite().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
