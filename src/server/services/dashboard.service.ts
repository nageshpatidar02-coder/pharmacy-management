import "server-only";

import { prisma } from "@/server/db/prisma";

export async function getDashboardSummary() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + 90);

  try {
    const [medicineCount, supplierCount, batches, todayPurchases] = await Promise.all([
      prisma.medicine.count({ where: { active: true } }),
      prisma.supplier.count({ where: { status: "ACTIVE" } }),
      prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } }),
      prisma.purchase.aggregate({
        where: { invoiceDate: { gte: today, lt: tomorrow }, status: "COMPLETED" },
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),
    ]);

    const activeBatches = batches.filter((batch) => batch.medicine.active);
    const expired = activeBatches.filter((batch) => batch.expiryDate < now);
    const nearExpiry = activeBatches.filter((batch) => batch.expiryDate >= now && batch.expiryDate <= expiryDate);
    const currentStock = activeBatches.reduce((total, batch) => total + batch.quantity + batch.freeQuantity, 0);
    const stockValue = activeBatches.reduce((total, batch) => total + batch.quantity * batch.purchasePrice, 0);
    const lowStock = activeBatches.filter((batch) => batch.quantity + batch.freeQuantity <= batch.medicine.minimumStock);

    return {
      databaseAvailable: true,
      medicineCount,
      supplierCount,
      currentStock,
      stockValue,
      lowStockCount: lowStock.length,
      nearExpiryCount: nearExpiry.length,
      expiredCount: expired.length,
      todayPurchaseCount: todayPurchases._count._all,
      todayPurchaseValue: todayPurchases._sum.grandTotal ?? 0,
    };
  } catch (error) {
    console.error("Dashboard database query failed", error);
    return {
      databaseAvailable: false,
      medicineCount: 0,
      supplierCount: 0,
      currentStock: 0,
      stockValue: 0,
      lowStockCount: 0,
      nearExpiryCount: 0,
      expiredCount: 0,
      todayPurchaseCount: 0,
      todayPurchaseValue: 0,
    };
  }
}
