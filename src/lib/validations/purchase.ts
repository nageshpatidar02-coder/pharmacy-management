import { z } from "zod";

const purchaseItemSchema = z.object({
  medicineId: z.string().min(1), batchNumber: z.string().trim().min(1).max(80), manufacturingDate: z.coerce.date(), expiryDate: z.coerce.date(), quantity: z.coerce.number().int().positive(), freeQuantity: z.coerce.number().int().min(0).default(0), purchaseRate: z.coerce.number().finite().nonnegative(), mrp: z.coerce.number().finite().nonnegative(), sellingPrice: z.coerce.number().finite().nonnegative(), discount: z.coerce.number().finite().min(0).default(0), gstPercentage: z.coerce.number().finite().min(0).max(100).default(0),
}).refine((item) => item.expiryDate > item.manufacturingDate, { message: "Expiry must be after manufacturing date", path: ["expiryDate"] }).refine((item) => item.expiryDate > new Date(), { message: "Expired batches cannot be purchased", path: ["expiryDate"] });
+
+export const purchaseSchema = z.object({ supplierId: z.string().min(1), invoiceNumber: z.string().trim().min(1).max(80), invoiceDate: z.coerce.date(), dueDate: z.coerce.date().optional(), igst: z.coerce.number().finite().min(0).default(0), paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK", "CREDIT"]).default("CREDIT"), paidAmount: z.coerce.number().finite().min(0).default(0), paymentReference: z.string().trim().max(120).optional().default(""), items: z.array(purchaseItemSchema).min(1),
+});
+
+export type PurchaseInput = z.infer<typeof purchaseSchema>;
*** End Patch