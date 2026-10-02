"use client";

import Link from "next/link";
import { Database, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-2xl border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Database className="size-6" /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">Medical workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This module is temporarily offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">This page could not load. Try again in a moment. If it continues, share the error reference with support.</p>
        {error.digest ? <p className="mt-3 text-xs text-muted-foreground">Error reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => reset()}><RefreshCw className="size-4" /> Try again</Button><Link href="/dashboard" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold hover:bg-muted">Back to dashboard</Link></div>
      </section>
    </div>
  );
}
