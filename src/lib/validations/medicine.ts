import { z } from "zod";

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));
const money = z.coerce.number().finite().min(0);

export const medicineSchema = z.object({
  name: z.string().trim().min(1).max(200), genericName: optionalText, composition: optionalText,
  categoryId: optionalText, manufacturerId: optionalText, dosageForm: optionalText, itemType: z.enum(["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "OINTMENT", "EQUIPMENT", "OTHER"]).default("TABLET"), strength: optionalText, packSize: optionalText,
  unit: z.string().trim().min(1).max(40), hsnCode: optionalText, gstPercentage: z.coerce.number().finite().min(0).max(100),
  prescriptionRequired: z.coerce.boolean().default(false), barcode: optionalText, sku: z.string().trim().max(80).optional().or(z.literal("")),
  mrp: money, purchasePrice: money, sellingPrice: money, minimumStock: z.coerce.number().int().min(0), active: z.coerce.boolean().default(true),
  initialQuantity: z.coerce.number().int().min(0).default(0), quantity: z.coerce.number().int().min(0).optional(),
  batchNumber: z.string().trim().max(80).optional().or(z.literal("")), expiryDate: z.string().trim().optional().or(z.literal("")),
});

export const categorySchema = z.object({ name: z.string().trim().min(1).max(120), description: optionalText, active: z.coerce.boolean().default(true) });
export const manufacturerSchema = z.object({ name: z.string().trim().min(1).max(160), contact: optionalText, email: z.union([z.string().email(), z.literal("")]).optional(), address: optionalText, active: z.coerce.boolean().default(true) });
export const batchSchema = z.object({ medicineId: z.string().min(1), batchNumber: z.string().trim().min(1).max(80), manufacturingDate: z.coerce.date(), expiryDate: z.coerce.date(), purchasePrice: money, mrp: money, sellingPrice: money, quantity: z.coerce.number().int().min(0), freeQuantity: z.coerce.number().int().min(0) }).refine((value) => value.expiryDate > value.manufacturingDate, { message: "Expiry date must be after manufacturing date", path: ["expiryDate"] });
export const stockAdjustmentSchema = z.object({ batchId: z.string().min(1), quantityChange: z.coerce.number().int(), reason: z.string().trim().min(2).max(120), reference: optionalText }).refine((value) => value.quantityChange !== 0, { message: "Adjustment cannot be zero", path: ["quantityChange"] });
