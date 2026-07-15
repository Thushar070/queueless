import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardProfileForm from "./onboard-form";

export default async function OnboardingProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  // If they are not a Business Owner (i.e. they are Staff), they cannot onboard
  const isOwner = session.user.role === "BUSINESS_OWNER";

  // Check if business has already completed onboarding
  if (session.user.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
    });

    if (business?.profileCompleted) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl relative z-10 space-y-6">
        <div className="text-left space-y-1">
          <span className="text-2xl font-heading font-extrabold tracking-tight text-foreground block">
            Profile Onboarding
          </span>
          <p className="text-muted-foreground text-xs font-medium">
            Complete your business profile details before accessing the dashboard
          </p>
        </div>

        {isOwner ? (
          <OnboardProfileForm />
        ) : (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground">Waiting for Onboarding</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Your business owner has not completed the onboarding profile. Please ask the business owner to log in and complete the profile setup.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
