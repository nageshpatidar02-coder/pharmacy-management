import { z } from "zod";

export const supplierSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  contactPerson: z.string().trim().max(120).optional().default(""),
  mobile: z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid mobile number").optional().default(""),
  email: z.union([z.string().email(), z.literal("")]).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  gstin: z.string().trim().max(30).optional().default(""),
  dlNumber: z.string().trim().max(80).optional().default(""),
  paymentTerms: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  state: z.string().trim().max(100).optional().default(""),
  creditLimit: z.coerce.number().finite().min(0).default(0),
  openingBalance: z.coerce.number().finite().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
