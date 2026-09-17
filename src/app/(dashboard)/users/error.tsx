"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4"><p className="text-sm text-muted-foreground">Users could not be loaded.</p><Button onClick={reset}>Try again</Button></div>; }
