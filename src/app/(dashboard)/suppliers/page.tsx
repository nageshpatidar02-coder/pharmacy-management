import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listSuppliers } from "@/server/services/supplier.service";
import { SupplierActions } from "@/components/suppliers/supplier-actions";
import { LiveFilterForm } from "@/components/filters/live-filter-form";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const user = await requirePermission(PERMISSIONS.suppliersView);
  const params = await searchParams;
  const suppliers = await listSuppliers(params.search);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Purchasing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Wholesalers</h1>
            <p className="mt-2 text-muted-foreground">See supplier contact details, medicines supplied, purchase history, and outstanding balance.</p>
          </div>
          <Link href="/suppliers/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add wholesaler</Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Wholesaler list</CardTitle>
            <LiveFilterForm fields={["search"]}><div className="flex gap-2">
              <Input name="search" defaultValue={params.search} placeholder="Search company, contact, mobile, or GSTIN" />
              <Button type="submit">Search</Button>
            </div></LiveFilterForm>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No wholesalers found.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="pb-3">Company</th><th className="pb-3">Contact person</th><th className="pb-3">Mobile</th><th className="pb-3">Purchases</th><th className="pb-3">Outstanding</th><th className="pb-3">Action</th></tr></thead>
                  <tbody>{suppliers.map((supplier) => <tr key={supplier.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{supplier.businessName}<span className="block text-xs text-muted-foreground">{supplier.gstin ?? "GSTIN not added"}</span></td>
                    <td className="py-3">{supplier.contactPerson ?? "-"}</td><td className="py-3">{supplier.mobile ?? "-"}</td>
                    <td className="py-3">{supplier._count.purchases}</td><td className="py-3 font-semibold">{supplier.outstandingBalance.toFixed(2)}</td>
                    <td className="py-3"><div className="flex flex-col gap-1"><Link href={`/suppliers/${supplier.id}`} className="font-semibold text-primary hover:underline">View details</Link><SupplierActions id={supplier.id} name={supplier.businessName} /></div></td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
