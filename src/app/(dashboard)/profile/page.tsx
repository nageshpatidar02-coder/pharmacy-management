import Link from "next/link";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Receipt, 
  ShieldCheck, 
  Users, 
  IndianRupee, 
  Lock 
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";

export default async function ProfilePage() {
  const user = await requireUser();

  // Parallel fetching for stats & pharmacy store settings
  const [customerCount, billCount, paymentTotal, storeSettings] = await Promise.all([
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.sale.count({ where: { status: "COMPLETED" } }),
    prisma.customerPayment.aggregate({ _sum: { amount: true } }),
    prisma.pharmacySettings.findFirst({ where: { key: "singleton" } }),
  ]);

  const currencySymbol = storeSettings?.currency || "₹";

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Account & Workspace
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Profile & Store Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account identity, access level, and associated pharmacy store configuration.
            </p>
          </div>
          <Badge className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200 py-1.5 px-3 font-medium">
            <ShieldCheck className="size-4 mr-1.5 inline" /> {user.role.name.replaceAll("_", " ")}
          </Badge>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                <Users className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">{customerCount}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Completed Bills</p>
                <Receipt className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">{billCount}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Payments Recorded</p>
                <IndianRupee className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {currencySymbol}{(paymentTotal._sum.amount ?? 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Account & Store Info Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Admin Identity Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">User Account Details</CardTitle>
              <CardDescription>Your system credentials and role permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="mt-0.5 font-semibold text-base">{user.name}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Email Address</p>
                <p className="mt-0.5 font-medium flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {user.email}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Role & Permissions</p>
                <p className="mt-0.5 font-medium uppercase tracking-wide text-xs bg-muted px-2 py-1 rounded w-fit">
                  {user.role.name.replaceAll("_", " ")}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Account Created</p>
                <p className="mt-0.5 font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground">Security</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep your admin password secure.
                </p>
                <Link
                  href="/change-password"
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  <Lock className="size-3.5" />
                  Change Password
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Associated Store Profile Card (Printed on Invoices) */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="size-5 text-primary" />
                Pharmacy Store Profile
              </CardTitle>
              <CardDescription>
                Yeh information aapke Invoices (Sales/Purchase Bills) ke header par print hoti hai.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Pharmacy Name</p>
                <p className="mt-0.5 font-semibold text-base">
                  {storeSettings?.pharmacyName || "Not configured"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="mt-0.5 font-medium flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" />
                    {storeSettings?.mobile || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="mt-0.5 font-medium truncate">
                    {storeSettings?.email || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">GSTIN Number</p>
                  <p className="mt-0.5 font-mono font-medium">
                    {storeSettings?.gstin || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Drug License (D.L. No.)</p>
                  <p className="mt-0.5 font-mono font-medium">
                    {storeSettings?.drugLicenseNo || "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="mt-0.5 font-medium flex items-start gap-1.5">
                  <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  {storeSettings?.address || "Address not provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Prefix</p>
                  <span className="mt-1 inline-block font-mono bg-muted px-2 py-0.5 rounded text-xs font-bold">
                    {storeSettings?.invoicePrefix || "INV-"}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Currency Symbol</p>
                  <span className="mt-1 inline-block font-mono bg-muted px-2 py-0.5 rounded text-xs font-bold">
                    {storeSettings?.currency || "₹"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/sales"
            className="rounded-md border bg-background px-4 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted"
          >
            Customer Bills
          </Link>
          <Link
            href="/payments"
            className="rounded-md border bg-background px-4 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted"
          >
            Payment Ledger
          </Link>
          <Link
            href="/settings"
            className="rounded-md border bg-primary/10 text-primary px-4 py-2 text-sm font-semibold transition-colors hover:bg-primary/20"
          >
            Edit Pharmacy Settings
          </Link>
        </div>
      </div>
    </AppShell>
  );
}