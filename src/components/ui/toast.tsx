"use client";

import { useEffect } from "react";

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);

  return <div role="status" className="fixed bottom-5 right-5 z-50 rounded-lg border bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-lg">{message}</div>;
}
