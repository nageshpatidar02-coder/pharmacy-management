"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Pill } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; redirectTo?: string };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to sign in with those details.");
        return;
      }
      router.replace(result.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Login service is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section className="w-full max-w-md rounded-xl border bg-surface p-8 shadow-sm"><div className="mb-8 flex items-center gap-3"><span className="rounded-lg bg-primary p-2 text-primary-foreground"><Pill className="size-5" /></span><div><p className="font-semibold tracking-tight">Medical</p><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Management</p></div></div><h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to manage your pharmacy.</p><form onSubmit={submitLogin} className="mt-8 space-y-5"><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email</label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div className="space-y-2"><div className="flex justify-between"><label htmlFor="password" className="text-sm font-medium">Password</label><Link className="text-xs font-semibold text-primary hover:underline" href="/forgot-password">Forgot password?</Link></div><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<Button className="w-full" disabled={pending}><LockKeyhole className="size-4" />{pending ? "Signing in..." : "Sign in"}</Button></form>{process.env.NODE_ENV !== "production" && <div className="mt-6 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Local test mode</p><p className="mt-1">Email: <span className="font-mono">admin@example.com</span></p><p>Password: <span className="font-mono">Admin@12345678</span></p><p className="mt-2">This panel is hidden in production builds.</p></div>}</section></main>;
}
