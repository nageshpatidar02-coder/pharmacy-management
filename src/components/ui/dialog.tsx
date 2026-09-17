"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return <dialog open={open} aria-labelledby="dialog-title" className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/30" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="flex items-center justify-between border-b p-6"><h2 id="dialog-title" className="font-semibold">{title}</h2><button type="button" className={cn("rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted")} onClick={onClose} aria-label="Close dialog">Close</button></div><div className="p-6">{children}</div></dialog>;
}
