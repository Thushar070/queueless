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
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Sleek dark minimalist grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800/80 p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
        <div className="text-left space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Your Business</h1>
          <p className="text-xs text-zinc-400">Complete your registration to start managing queues</p>
        </div>

        <OnboardBusinessForm email={session.user.email!} />
      </div>
    </main>
  );
}
