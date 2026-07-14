"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { joinInputSchema, JoinInput } from "@/lib/validation/join";

interface JoinFormProps {
  queueId: string;
}

export default function JoinForm({ queueId }: JoinFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinInput>({
    resolver: zodResolver(joinInputSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
    },
  });

  const onSubmit = async (data: JoinInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/queues/${queueId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to join queue");
      }

      const entry = await res.json();
      router.push(`/track/${entry.trackingToken}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg text-left">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="customerName">
          Your Name
        </label>
        <input
          id="customerName"
          type="text"
          placeholder="Jane Doe"
          {...register("customerName")}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-hidden focus:border-indigo-500 transition-colors"
        />
        {errors.customerName && (
          <p className="text-red-400 text-xs mt-1 text-left">{errors.customerName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="customerPhone">
          Phone Number (for SMS waitlist alerts)
        </label>
        <input
          id="customerPhone"
          type="tel"
          placeholder="+15555555555"
          {...register("customerPhone")}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-hidden focus:border-indigo-500 transition-colors"
        />
        {errors.customerPhone && (
          <p className="text-red-400 text-xs mt-1 text-left">{errors.customerPhone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="customerEmail">
          Email Address (Optional)
        </label>
        <input
          id="customerEmail"
          type="email"
          placeholder="jane@example.com"
          {...register("customerEmail")}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-hidden focus:border-indigo-500 transition-colors"
        />
        {errors.customerEmail && (
          <p className="text-red-400 text-xs mt-1 text-left">{errors.customerEmail.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 text-white font-bold py-2.5 rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-slate-100" />
            Joining Line...
          </>
        ) : (
          "Join Virtual Line"
        )}
      </button>
    </form>
  );
}
