"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, HeartPulse, LockKeyhole, Pill, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; redirectTo?: string };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "Invalid username or password.");
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

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#edf7f7] px-5 py-8 text-slate-900 md:px-10 lg:px-16">
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-cyan-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 size-96 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/70 bg-white/55 shadow-2xl shadow-cyan-900/10 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[680px] overflow-hidden bg-[#0b6970] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(135deg, transparent 0 45%, rgba(255,255,255,.12) 45% 46%, transparent 46% 100%), radial-gradient(circle at 20% 20%, rgba(255,255,255,.22), transparent 26%)" }} />
          <div className="relative">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-3"><Pill className="size-6" /></span><div><p className="text-lg font-semibold">Medica</p><p className="text-[10px] uppercase tracking-[0.25em] text-teal-100">Pharmacy operations</p></div></div>
            <div className="mt-28 max-w-md"><p className="flex items-center gap-2 text-sm font-semibold text-teal-100"><HeartPulse className="size-4" /> Care-ready workspace</p><h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight">Clarity for every medicine, every day.</h1><p className="mt-5 text-base leading-7 text-teal-50/80">Keep stock, batches, suppliers and daily operations connected in one focused workspace.</p></div>
          </div>
          <div className="relative grid grid-cols-3 gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><ShieldCheck className="size-5 text-teal-100" /><p className="mt-6 text-sm font-medium">Role-aware</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><Pill className="size-5 text-teal-100" /><p className="mt-6 text-sm font-medium">Medicine-first</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><HeartPulse className="size-5 text-teal-100" /><p className="mt-6 text-sm font-medium">Care focused</p></div></div>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="rounded-xl bg-primary p-3 text-primary-foreground"><Pill className="size-5" /></span><div><p className="font-semibold">Medica</p><p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Pharmacy operations</p></div></div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Secure workspace</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Welcome back</h2><p className="mt-2 text-muted-foreground">Sign in to manage your pharmacy.</p>
            <form onSubmit={submitLogin} className="mt-9 space-y-5">
              <div className="space-y-2"><label htmlFor="username" className="text-sm font-semibold">Username</label><Input id="username" name="username" type="text" autoComplete="username" placeholder="Enter username" required /></div>
              <div className="space-y-2"><div className="flex justify-between"><label htmlFor="password" className="text-sm font-semibold">Password</label><Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link></div><div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" className="pr-11" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
              <Button className="h-11 w-full" disabled={pending}><LockKeyhole className="size-4" />{pending ? "Signing in..." : "Sign in"}</Button>
            </form>
            <div className="mt-6 rounded-xl border border-dashed bg-white/70 p-4 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Temporary test access</p><p className="mt-1">Use the temporary admin credentials supplied for this preview.</p><p className="mt-2">Credentials are validated only on the server.</p></div>
            <Link href="/demo" className="mt-5 block text-center text-xs font-semibold text-primary hover:underline">Open read-only visual preview</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
