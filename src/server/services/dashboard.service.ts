import "server-only";

import { prisma } from "@/server/db/prisma";

export type DashboardActivity = {
  title: string;
  description: string;
  time: string;
};

export type DashboardSummary = {
  todaySalesValue: number;
  todaySalesCount: number;
  todayProfitValue: number;
  todayProfitCount: number;
  todayPurchaseValue: number;
  todayPurchaseCount: number;
  recentActivities: DashboardActivity[];
  medicineCount: number;
  totalStockCount: number;
  currentStock: number;
  stockValue: number;
  lowStockCount: number;
  nearExpiryCount: number;
  expiredCount: number;
  supplierCount: number;
  databaseAvailable: boolean;
};

const emptySummary: DashboardSummary = {
  todaySalesValue: 0,
  todaySalesCount: 0,
  todayProfitValue: 0,
  todayProfitCount: 0,
  todayPurchaseValue: 0,
  todayPurchaseCount: 0,
  recentActivities: [],
  medicineCount: 0,
  totalStockCount: 0,
  currentStock: 0,
  stockValue: 0,
  lowStockCount: 0,
  nearExpiryCount: 0,
  expiredCount: 0,
  supplierCount: 0,
  databaseAvailable: false,
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + 90);

  try {
    const [
      medicineCount, 
      supplierCount, 
      batches, 
      todayPurchases, 
      todaySales, 
      recentSales, 
      recentPurchases
    ] = await Promise.all([
      prisma.medicine.count({ where: { active: true } }),
      prisma.supplier.count({ where: { status: "ACTIVE" } }),
      prisma.batch.findMany({ 
        include: { medicine: true }, 
        orderBy: { expiryDate: "asc" } 
      }),
      prisma.purchase.aggregate({
        where: { invoiceDate: { gte: today, lt: tomorrow }, status: "COMPLETED" },
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),
      prisma.sale.aggregate({
        where: { invoiceDate: { gte: today, lt: tomorrow }, status: "COMPLETED" },
        _sum: { grandTotal: true, costAmount: true },
        _count: { _all: true },
      }),
      prisma.sale.findMany({
        select: { invoiceNumber: true, grandTotal: true, invoiceDate: true },
        orderBy: { invoiceDate: "desc" },
        take: 5,
      }),
      prisma.purchase.findMany({
        select: { invoiceNumber: true, grandTotal: true, invoiceDate: true },
        orderBy: { invoiceDate: "desc" },
        take: 5,
      }),
    ]);

    // Filter valid batches with active medicine
    const activeBatches = batches.filter((batch: any) => batch.medicine && batch.medicine.active);
    
    const expired = activeBatches.filter((batch: any) => new Date(batch.expiryDate) < now);
    const nearExpiry = activeBatches.filter((batch: any) => {
      const exp = new Date(batch.expiryDate);
      return exp >= now && exp <= expiryDate;
    });
    
    // Total Stock Units
    const currentStock = activeBatches.reduce((total: number, batch: any) => {
      return total + (Number(batch.quantity) || 0) + (Number(batch.freeQuantity) || 0);
    }, 0);

    // Pack/Strip Stock Calculation
    const totalStockCount = activeBatches.reduce((total: number, batch: any) => {
      const units = (Number(batch.quantity) || 0) + (Number(batch.freeQuantity) || 0);
      const itemType = String(batch.medicine?.itemType || batch.medicine?.unit || "OTHER").toUpperCase();
      
      if (itemType !== "TABLET" && itemType !== "CAPSULE") return total + units;
      
      const packMatch = String(batch.medicine?.packSize || "").match(/\d+/);
      const perStrip = Math.max(1, Number(packMatch ? packMatch[0] : 10));
      const strips = Math.floor(units / perStrip);
      const loose = units % perStrip;
      
      return total + (loose > 0 ? strips + (loose >= perStrip / 2 ? 1 : loose) : strips);
    }, 0);

    // Stock Valuation
    const stockValue = activeBatches.reduce((total: number, batch: any) => {
      const price = Number(batch.purchasePrice) || 0;
      const qty = Number(batch.quantity) || 0;
      return total + (qty * price);
    }, 0);

    // Low Stock Items
    const lowStock = activeBatches.filter((batch: any) => {
      const totalQty = (Number(batch.quantity) || 0) + (Number(batch.freeQuantity) || 0);
      const minStock = Number(batch.medicine?.minimumStock) || 0;
      return totalQty <= minStock;
    });

    // Formatting Recent Activities
    const recentActivities: DashboardActivity[] = [
      ...recentSales.map((sale: any) => ({
        title: "Customer sale",
        description: `${sale.invoiceNumber} • ₹${Number(sale.grandTotal || 0).toFixed(2)}`,
        time: new Date(sale.invoiceDate).toISOString(),
      })),
      ...recentPurchases.map((purchase: any) => ({
        title: "Stock purchase",
        description: `${purchase.invoiceNumber} • ₹${Number(purchase.grandTotal || 0).toFixed(2)}`,
        time: new Date(purchase.invoiceDate).toISOString(),
      })),
    ]
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 8);

    const salesVal = Number(todaySales?._sum?.grandTotal || 0);
    const costVal = Number(todaySales?._sum?.costAmount || 0);
    const todayProfitValue = salesVal - costVal;

    return {
      databaseAvailable: true,
      medicineCount: medicineCount ?? 0,
      totalStockCount,
      supplierCount: supplierCount ?? 0,
      currentStock: currentStock ?? 0,
      stockValue: stockValue ?? 0,
      lowStockCount: lowStock.length,
      nearExpiryCount: nearExpiry.length,
      expiredCount: expired.length,
      todaySalesCount: todaySales?._count?._all ?? 0,
      todaySalesValue: salesVal,
      todayProfitValue: todayProfitValue,
      todayProfitCount: todaySales?._count?._all ?? 0,
      todayPurchaseCount: todayPurchases?._count?._all ?? 0,
      todayPurchaseValue: Number(todayPurchases?._sum?.grandTotal || 0),
      recentActivities,
    };
  } catch (error) {
    console.error("Dashboard database query failed", error);
    return emptySummary;
  }
}