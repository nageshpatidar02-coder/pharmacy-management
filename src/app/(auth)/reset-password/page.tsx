import { ResetPasswordForm } from "@/components/settings/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><ResetPasswordForm token={token ?? ""} /></main>;
}
