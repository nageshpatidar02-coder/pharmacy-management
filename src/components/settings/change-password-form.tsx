"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changePasswordAction, type ChangePasswordState } from "@/app/(dashboard)/change-password/actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});
  return <Card><CardHeader><CardTitle>Update your password</CardTitle></CardHeader><CardContent><form action={action} className="space-y-5"><PasswordField id="currentPassword" label="Current password" /><PasswordField id="newPassword" label="New password" /><PasswordField id="confirmPassword" label="Confirm new password" />{state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}{state.success && <p role="status" className="text-sm text-primary">{state.success}</p>}<Button disabled={pending}><KeyRound className="size-4" />{pending ? "Updating..." : "Update password"}</Button></form></CardContent></Card>;
}

function PasswordField({ id, label }: { id: string; label: string }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><Input id={id} name={id} type="password" autoComplete="new-password" required /></div>; }
