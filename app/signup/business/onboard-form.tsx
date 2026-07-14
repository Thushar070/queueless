"use client";

import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

interface OnboardBusinessFormProps {
  email: string;
}

export default function OnboardBusinessForm({ email }: OnboardBusinessFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto sugerir clean slug
    const clean = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSlug(clean);
  };

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, ""); // Allow only alphanumeric and dashes manually
    setSlug(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Please fill out all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/signup/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create business");
      }

      // Force NextAuth session refresh by triggering a hard reload or simple router refresh
      router.refresh();
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400">Owner Email</label>
        <input
          type="email"
          disabled
          value={email}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-500 select-none focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-300">Business Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. Acme Coffee Co."
          className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-300">Business URL Slug</label>
        <div className="flex items-center gap-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-zinc-500 transition-colors">
          <span className="text-sm text-zinc-600 select-none">queueless.com/q/</span>
          <input
            type="text"
            required
            value={slug}
            onChange={handleSlugChange}
            placeholder="acme-coffee"
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-700 focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">This forms the public QR code join link</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-black" />
            Creating...
          </>
        ) : (
          "Register Business"
        )}
      </button>
    </form>
  );
}
