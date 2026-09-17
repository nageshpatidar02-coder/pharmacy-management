import { AppShell } from "@/components/layout/app-shell";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { requireUser } from "@/server/auth/auth";

export default async function ChangePasswordPage() {
  const user = await requireUser();
  return <AppShell user={user}><div className="mx-auto max-w-xl space-y-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Security</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Change password</h1></div><ChangePasswordForm /></div></AppShell>;
}
