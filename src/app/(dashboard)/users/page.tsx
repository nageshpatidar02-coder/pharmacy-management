import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UsersPage() {
  const currentUser = await requirePermission(PERMISSIONS.usersManage);
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, status: true, role: { select: { name: true } } }, orderBy: { name: "asc" } });
  return <AppShell user={currentUser}><div className="mx-auto max-w-5xl space-y-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Users</h1><p className="mt-2 text-muted-foreground">Review account access and status.</p></div><Card><CardHeader><CardTitle>Team accounts</CardTitle></CardHeader><CardContent>{users.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No user accounts found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b last:border-0"><td className="py-3 font-medium">{user.name}</td><td className="py-3">{user.email}</td><td className="py-3">{user.role.name.replace("_", " ")}</td><td className="py-3">{user.status}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></AppShell>;
}
