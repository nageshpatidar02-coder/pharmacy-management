"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"><h2 className="text-xl font-semibold">Something went wrong</h2><p className="text-sm text-muted-foreground">The workspace could not load this view.</p><Button onClick={() => reset()}>Try again</Button></div>;
}
