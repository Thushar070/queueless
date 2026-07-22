"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";

const profileSchema = z.object({
  phone: z.string().refine((val) => {
    const cleaned = val.replace(/\s+/g, "").replace(/[-\(\)]/g, "");
    return /^[6-9]\d{9}$/.test(cleaned) || /^\+91[6-9]\d{9}$/.test(cleaned) || /^91[6-9]\d{9}$/.test(cleaned);
  }, {
    message: "Invalid Indian mobile number (e.g. 9876543210 or +919876543210).",
  }),
  address: z.string().min(5, "Address must be at least 5 characters").max(200),
  category: z.string().min(2, "Category must be at least 2 characters").max(50),
});

type ProfileInput = z.infer<typeof profileSchema>;

export default function OnboardProfileForm() {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "",
      address: "",
      category: "",
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to update profile. Please try again.");
        return;
      }

      // Force NextAuth session update to refresh the JWT profileCompleted token field
      try {
        await update();
      } catch (updateErr) {
        console.warn("NextAuth session update skipped or blocked:", updateErr);
      }

      window.location.assign("/dashboard");
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-foreground" htmlFor="phone">
          Business Phone Number
        </label>
        <input
          id="phone"
          type="text"
          placeholder="+919876543210"
          {...register("phone")}
          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
        />
        {errors.phone && (
          <p className="text-destructive text-[10px] mt-0.5">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-foreground" htmlFor="address">
          Business Address / Location
        </label>
        <input
          id="address"
          type="text"
          placeholder="123 Main St, Suite 400"
          {...register("address")}
          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
        />
        {errors.address && (
          <p className="text-destructive text-[10px] mt-0.5">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-foreground" htmlFor="category">
          Business Category / Primary Service
        </label>
        <input
          id="category"
          type="text"
          placeholder="Healthcare, Retail, Finance"
          {...register("category")}
          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
        />
        {errors.category && (
          <p className="text-destructive text-[10px] mt-0.5">{errors.category.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer shadow-sm mt-2"
      >
        {loading ? "Saving Profile..." : "Complete Profile & Open Dashboard"}
      </button>
    </form>
  );
}
