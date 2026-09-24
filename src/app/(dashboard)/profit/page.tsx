import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function ProfitPage({ searchParams }: { searchParams: Promise<{ search?: string; from?: string; to?: string }> }) {
  const user = await requirePermission(PERMISSIONS.dashboardView);
  const params = await searchParams;
  const dateFilter = params.from || params.to ? { invoiceDate: { ...(params.from ? { gte: new Date(`${params.from}T00:00:00.000Z`) } : {}), ...(params.to ? { lte: new Date(`${params.to}T23:59:59.999Z`) } : {}) } } : {};
  const searchFilter = params.search ? { OR: [{ invoiceNumber: { contains: params.search, mode: "insensitive" as const } }, { customer: { name: { contains: params.search, mode: "insensitive" as const } } }, { items: { some: { medicine: { name: { contains: params.search, mode: "insensitive" as const } } } } }] } : {};
  const sales = await prisma.sale.findMany({ where: { pharmacyId: user.pharmacyId, status: "COMPLETED", ...dateFilter, ...searchFilter }, select: { invoiceNumber: true, grandTotal: true, costAmount: true, invoiceDate: true }, orderBy: { invoiceDate: "desc" }, take: 200 });
  const revenue = sales.reduce((sum, sale) => sum + sale.grandTotal, 0);
  const cost = sales.reduce((sum, sale) => sum + sale.costAmount, 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const cards = [["Sales revenue", revenue.toFixed(2)], ["Medicine cost", cost.toFixed(2)], ["Gross profit", profit.toFixed(2)], ["Profit margin", `${margin.toFixed(1)}%`]];

  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Reports</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Profit &amp; margin</h1><p className="mt-2 text-muted-foreground">Only this pharmacy&apos;s sales and medicine costs are included.</p></div><Card><CardContent className="pt-6"><form className="grid gap-3 md:grid-cols-4"><Input name="search" defaultValue={params.search} placeholder="Bill, customer, or medicine" /><Input name="from" type="date" defaultValue={params.from} /><Input name="to" type="date" defaultValue={params.to} /><Button>Filter</Button></form></CardContent></Card><div className="grid gap-4 md:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Sales included in this report</CardTitle></CardHeader><CardContent>{sales.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No sales found for this pharmacy and date range.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3">Invoice</th><th className="pb-3">Date</th><th className="pb-3">Revenue</th><th className="pb-3">Cost</th><th className="pb-3">Profit</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.invoiceNumber} className="border-b last:border-0"><td className="py-3 font-medium">{sale.invoiceNumber}</td><td className="py-3">{sale.invoiceDate.toLocaleDateString()}</td><td className="py-3">{sale.grandTotal.toFixed(2)}</td><td className="py-3">{sale.costAmount.toFixed(2)}</td><td className="py-3">{(sale.grandTotal - sale.costAmount).toFixed(2)}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></AppShell>;
}
