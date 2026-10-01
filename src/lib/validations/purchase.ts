import { z } from "zod";

const wholeNumber = z.coerce.number().refine(Number.isInteger, {
  message: "Please enter a whole number.",
});

const purchaseItemSchema = z
  .object({
    medicineId: z.string().min(1, "Medicine select karein"),
    batchNumber: z.string().trim().min(1, "Batch number zaroori hai").max(80),
    manufacturingDate: z.coerce.date().optional(), // 1. Optional kar diya
    expiryDate: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const shortYear = value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
      if (shortYear) {
        return new Date(Date.UTC(2000 + Number(shortYear[2]), Number(shortYear[1]), 0, 23, 59, 59, 999));
      }
      const fullYear = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
      if (fullYear) {
        return new Date(Date.UTC(Number(fullYear[1]), Number(fullYear[2]), 0, 23, 59, 59, 999));
      }
      return value;
    }, z.coerce.date({ error: "Expiry month/year MM/YY mein likhein, jaise 08/27" })),
    quantity: wholeNumber.positive("Quantity 1 ya usse zyada honi chahiye"),
    freeQuantity: wholeNumber.min(0).default(0),
    purchaseRate: z.coerce.number().finite().nonnegative(),
    mrp: z.coerce.number().finite().nonnegative(),
    sellingPrice: z.coerce.number().finite().nonnegative(),
    discount: z.coerce.number().finite().min(0).default(0),
    gstPercentage: z.coerce.number().finite().min(0).max(100).default(0),
  })
  // 2. Expiry > Manufacturing check ko optional date aware banaya
  .refine(
    (item) => {
      if (!item.manufacturingDate) return true; // Agar MFG nahi di, toh check skip karein
      return item.expiryDate > item.manufacturingDate;
    },
    { message: "Expiry date manufacturing date ke baad ki honi chahiye", path: ["expiryDate"] }
  )
  .refine((item) => item.expiryDate > new Date(), {
    message: "Expired batches ko purchase nahi kiya ja sakta",
    path: ["expiryDate"],
  });

export const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier select karein"),
  invoiceNumber: z.string().trim().min(1, "Invoice number required hai").max(80),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  igst: z.coerce.number().finite().min(0).default(0),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK", "CREDIT"]).default("CREDIT"),
  paidAmount: z.coerce.number().finite().min(0).default(0),
  paymentReference: z.string().trim().max(120).optional().default(""),
  discountType: z.enum(["AMOUNT", "PERCENTAGE"]).default("AMOUNT"),
  discountValue: z.coerce.number().finite().min(0).default(0),
  items: z.array(purchaseItemSchema).min(1, "Kum se kum 1 item add karein"),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;