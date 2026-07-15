import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
  if (session.user.businessId) {
    const biz = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { status: true, deletedAt: true },
    });

    if (!biz || biz.deletedAt || biz.status === "SUSPENDED") {
      redirect("/login?error=suspended");
    }
  }

  return <>{children}</>;
}
