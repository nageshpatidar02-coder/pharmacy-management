import { Activity, ArrowUpRight, ClipboardList, PackageCheck, ReceiptText, ShieldCheck, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";

export default async function Home() {
  const user = await requirePermission(PERMISSIONS.dashboardView);
  const summaryCards: Array<[string, string, string, LucideIcon]> = [
    ["Today's sales", "0", "No sales recorded yet", ReceiptText],
    ["Today's purchase", "0", "No purchases recorded yet", PackageCheck],
    ["Today's profit", "0", "No sales recorded yet", Activity],
    ["Total medicines", "0", "Medicine module not seeded", ShieldCheck],
    ["Current stock", "0", "No inventory recorded yet", PackageCheck],
    ["Low stock", "0", "No inventory alerts", Activity],
    ["Near expiry", "0", "No expiry alerts", ShieldCheck],
    ["Customer outstanding", "0", "No outstanding balance", ReceiptText],
    ["Supplier outstanding", "0", "No outstanding balance", ClipboardList],
  ];

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Thursday, September 17, 2026</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Good morning, team.</h1>
            <p className="mt-2 text-muted-foreground">Your store operations at a glance.</p>
          </div>
          <Button><ClipboardList className="size-4" /> View activity</Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map(([label, value, detail, Icon]) => (
            <Card key={String(label)}>
              <CardContent className="flex items-start justify-between pt-6">
                <div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
                <span className="rounded-lg bg-muted p-2.5 text-primary"><Icon className="size-5" /></span>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Recent activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">Live events from your store will appear here.</p></div><Button variant="ghost" size="icon" aria-label="Open recent activity"><ArrowUpRight className="size-4" /></Button></CardHeader>
            <CardContent><div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed bg-muted/40"><p className="text-sm text-muted-foreground">No activity to display yet.</p></div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quick actions</CardTitle><p className="mt-1 text-sm text-muted-foreground">Common workflows, ready when you connect the store.</p></CardHeader>
            <CardContent className="grid gap-3"><Button variant="outline" className="justify-start"><PackageCheck className="size-4" /> Add inventory item</Button><Button variant="outline" className="justify-start"><ReceiptText className="size-4" /> Create sale</Button><Button variant="outline" className="justify-start"><ClipboardList className="size-4" /> Review prescriptions</Button></CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}