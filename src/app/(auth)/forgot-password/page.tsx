"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/app/(auth)/forgot-password/actions";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  async function submit(formData: FormData) { await forgotPasswordAction(formData); setSent(true); }
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section className="w-full max-w-md rounded-xl border bg-surface p-8 shadow-sm"><h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1><p className="mt-2 text-sm text-muted-foreground">Enter your account email. If it exists, an administrator will send reset instructions.</p>{sent ? <div className="mt-8 space-y-4"><p className="rounded-md bg-muted p-4 text-sm" role="status">Check your email for next steps.</p><Link className="text-sm font-semibold text-primary hover:underline" href="/login">Return to sign in</Link></div> : <form action={submit} className="mt-8 space-y-5"><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email</label><Input id="email" name="email" type="email" autoComplete="email" required /></div><Button className="w-full">Send reset instructions</Button><Link className="block text-center text-sm font-semibold text-primary hover:underline" href="/login">Return to sign in</Link></form>}</section></main>;
}
