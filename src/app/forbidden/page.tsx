import Link from "next/link";

export default function ForbiddenPage() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center"><h1 className="text-2xl font-semibold">Access restricted</h1><p className="text-sm text-muted-foreground">Your account does not have permission to view this page.</p><Link className="font-semibold text-primary hover:underline" href="/">Return to dashboard</Link></main>;
}
