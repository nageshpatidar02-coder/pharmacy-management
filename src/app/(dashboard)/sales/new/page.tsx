import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaleForm } from "@/components/sales/sale-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listCustomers } from "@/server/services/customer.service";
import { attachPharmacyPrices } from "@/server/services/medicine.service";
import { prisma } from "@/server/db/prisma";

export default async function NewSalePage() {
  const user = await requirePermission(PERMISSIONS.salesCreate);
  const [customers, medicineCatalog] = await Promise.all([
    listCustomers(),
    prisma.medicine.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        itemType: true,
        packSize: true,
        unit: true,
        batches: {
          where: { pharmacyId: user.pharmacyId, quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
          select: { id: true, batchNumber: true, quantity: true, sellingPrice: true, mrp: true, purchasePrice: true, expiryDate: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const medicines = await attachPharmacyPrices(user.pharmacyId, medicineCatalog);
  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customer billing</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Add customer bill</h1><p className="mt-2 text-muted-foreground">Select customer, medicine, batch and payment details to generate an invoice.</p></div><Card><CardHeader><CardTitle>New customer bill</CardTitle></CardHeader><CardContent><SaleForm customers={customers} medicines={medicines} /></CardContent></Card></div></AppShell>;
}
