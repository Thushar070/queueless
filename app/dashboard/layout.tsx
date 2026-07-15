import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "@/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Check business status on every dashboard request to block suspended/deleted tenants immediately
  let businessName = "QueueLess Shop";
  if (session.user.businessId) {
    const biz = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { name: true, status: true, deletedAt: true },
    });

    if (!biz || biz.deletedAt || biz.status === "SUSPENDED") {
      redirect("/login?error=suspended");
    }
    businessName = biz.name;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row relative overflow-hidden">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        businessName={businessName}
        userEmail={session.user.email ?? "staff@queueless.com"}
        userRole={session.user.role ?? "STAFF"}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 pt-[72px] lg:pt-0 min-h-screen w-full relative z-10">
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
