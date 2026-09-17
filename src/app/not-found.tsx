import Link from "next/link";

export default function NotFound() {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center"><h2 className="text-2xl font-semibold">Page not found</h2><p className="text-sm text-muted-foreground">This workspace view does not exist.</p><Link className="font-semibold text-primary hover:underline" href="/">Return to overview</Link></div>;
}
