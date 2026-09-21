import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { ReferenceForm } from "@/components/medicines/reference-form";

export default async function ManufacturersPage() { const user = await requirePermission(PERMISSIONS.medicineView); const manufacturers = await prisma.manufacturer.findMany({ orderBy: { name: "asc" } }); return <AppShell user={user}><div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Medicine master</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Manufacturers</h1></div><ReferenceForm type="manufacturers" /><Card><CardHeader><CardTitle>Manufacturers</CardTitle></CardHeader><CardContent>{manufacturers.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No manufacturers created yet.</p> : <ul className="divide-y">{manufacturers.map((manufacturer) => <li key={manufacturer.id} className="flex justify-between py-3"><span className="font-medium">{manufacturer.name}</span><span className="text-sm text-muted-foreground">{manufacturer.contact ?? "-"}</span></li>)}</ul>}</CardContent></Card></div></AppShell>; }
