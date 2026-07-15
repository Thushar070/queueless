"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
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
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6 text-left">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-foreground">Welcome Back!</h2>
          <p className="text-xs text-muted-foreground mt-1">Tenant verification and session parameters</p>
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
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Business ID</span>
            <span className="text-sm text-foreground font-mono truncate block">
              {session?.user?.businessId || "N/A"}
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">
            Account linked successfully. Use the left navigation panel to configure queues, call customers, and monitor live statuses.
          </p>
        </div>
      </div>
    </div>
  );
}
