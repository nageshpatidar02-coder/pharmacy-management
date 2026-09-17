"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  return <div className="flex items-center gap-3 border-l pl-4"><Link href="/change-password" className="hidden text-right sm:block"><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{role.replace("_", " ")}</p></Link><span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary"><UserRound className="size-4" /></span><form action={logoutAction}><Button variant="ghost" size="icon" aria-label={`Sign out ${email}`}><LogOut className="size-4" /></Button></form></div>;
}
