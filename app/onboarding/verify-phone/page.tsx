import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VerifyPhoneForm from "./verify-form";

export default async function VerifyPhonePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.businessId) {
    redirect("/signup/business");
  }

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
  });

  if (!business) {
    redirect("/signup/business");
  }

  // Already verified, redirect to dashboard
  if (business.phoneVerifiedAt) {
    redirect("/dashboard");
  }

  // If phone is not even configured (should not happen due to middleware, but as fallback), redirect to profile onboarding
  if (!business.phone) {
    redirect("/onboarding/profile");
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl relative z-10 space-y-6">
        <VerifyPhoneForm businessPhone={business.phone} />
      </div>
    </main>
  );
}
