import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OnboardBusinessForm from "./onboard-form";

export default async function SignupBusinessPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  // If already linked to a business, redirect to dashboard
  if (session.user.businessId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl relative z-10 space-y-6">
        <div className="text-left space-y-1">
          <h1 className="text-2xl font-heading font-extrabold tracking-tight text-foreground">Create Your Business</h1>
          <p className="text-xs text-muted-foreground font-medium">Complete your registration to start managing queues</p>
        </div>

        <OnboardBusinessForm email={session.user.email!} />
      </div>
    </main>
  );
}
