import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin-sidebar";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Ensure role is SUPER_ADMIN
  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f2_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f2_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-70 pointer-events-none" />
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-xl relative z-10 space-y-6">
          <svg className="w-12 h-12 text-destructive mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="space-y-2">
            <h2 className="text-xl font-heading font-extrabold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground font-medium">Only Super Admins are authorized to access the platform management portal.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-block text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Go to Business Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row relative overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar userEmail={session.user.email ?? "admin@queueless.com"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 pt-[72px] lg:pt-0 min-h-screen w-full relative z-10">
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
