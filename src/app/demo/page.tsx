import Link from "next/link";
import { ArrowRight, ClipboardList, HeartPulse, PackageCheck, ShieldCheck, Stethoscope, type LucideIcon } from "lucide-react";

const medicines = [
  {
    name: "Amoxicillin 500 mg",
    type: "Antibiotic capsules",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=720&q=85",
  },
  {
    name: "Daily wellness stock",
    type: "Pharmacy essentials",
    image: "https://images.unsplash.com/photo-1550572017-edd951aa8ca6?auto=format&fit=crop&w=720&q=85",
  },
];

export default function DemoPage() {
  const metrics: Array<[string, string, string, LucideIcon]> = [
    ["Today's sales", "₹24,860", "12 invoices", ClipboardList],
    ["Stock health", "94%", "Well supplied", PackageCheck],
    ["Expiry watch", "08", "Need review", ShieldCheck],
  ];

  return (
    <main className="min-h-screen bg-background px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col justify-between gap-5 border-b pb-7 md:flex-row md:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><HeartPulse className="size-4" /> Medical workspace</p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">A calmer way to run your pharmacy.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">A read-only visual preview of the pharmacy operations dashboard. No account, database writes, or admin access is created here.</p>
          </div>
          <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Go to secure login <ArrowRight className="size-4" /></Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {metrics.map(([label, value, detail, Icon]) => (
            <div key={String(label)} className="rounded-xl border bg-surface p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-lg bg-muted p-2.5 text-primary"><Icon className="size-5" /></span></div></div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-sm">
            <div className="relative h-72 overflow-hidden"><img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=85" alt="Doctor reviewing a patient's care" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" /><div className="absolute bottom-6 left-6 text-white"><p className="flex items-center gap-2 text-sm font-semibold"><Stethoscope className="size-4" /> Care-aware operations</p><h2 className="mt-2 text-2xl font-semibold">Every detail in one place.</h2></div></div>
            <div className="grid gap-3 p-6 sm:grid-cols-3"><div><p className="text-sm font-semibold">Inventory</p><p className="mt-1 text-xs text-muted-foreground">Batch and expiry visibility.</p></div><div><p className="text-sm font-semibold">Purchasing</p><p className="mt-1 text-xs text-muted-foreground">Supplier workflows, organized.</p></div><div><p className="text-sm font-semibold">Permissions</p><p className="mt-1 text-xs text-muted-foreground">Role-aware by design.</p></div></div>
          </div>
          <div className="space-y-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Medicine shelf</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">A quick visual sample</h2></div>{medicines.map((medicine) => <article key={medicine.name} className="flex gap-4 rounded-xl border bg-surface p-3 shadow-sm"><img src={medicine.image} alt={medicine.name} className="h-24 w-24 rounded-lg object-cover" /><div className="py-1"><p className="font-semibold">{medicine.name}</p><p className="mt-1 text-sm text-muted-foreground">{medicine.type}</p><span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary">Preview item</span></div></article>)}</div>
        </section>
      </div>
    </main>
  );
}
