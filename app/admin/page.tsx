"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6 select-none text-left">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-foreground">Super Admin Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-1">Platform management and session parameters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Authenticated As</span>
            <span className="text-sm text-foreground font-bold truncate block">{session?.user?.email}</span>
          </div>

          <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Assigned Role</span>
            <span className="text-sm text-foreground font-bold block">{session?.user?.role}</span>
          </div>

          <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Platform Scope</span>
            <span className="text-sm text-foreground font-bold">Global / Multi-tenant Admin</span>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">
            Only authenticated users with the role `SUPER_ADMIN` can access this control panel. Use the links on the left navigation panel to manage businesses, inspect platform-wide analytics aggregates, and audit security log events.
          </p>
        </div>
      </div>
    </div>
  );
}
