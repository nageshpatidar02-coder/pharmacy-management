"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPasswordAction, type ResetPasswordState } from "@/app/(auth)/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(resetPasswordAction, {});
  return <section className="w-full max-w-md rounded-xl border bg-surface p-8 shadow-sm"><h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1><p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p><form action={(formData) => { formData.set("token", token); return action(formData); }} className="mt-8 space-y-5"><div className="space-y-2"><label htmlFor="newPassword" className="text-sm font-medium">New password</label><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required /></div><div className="space-y-2"><label htmlFor="confirmPassword" className="text-sm font-medium">Confirm new password</label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required /></div>{state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}<Button className="w-full" disabled={pending}>{pending ? "Updating..." : "Set password"}</Button><Link className="block text-center text-sm font-semibold text-primary hover:underline" href="/login">Return to sign in</Link></form></section>;
}