"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface OnboardBusinessFormProps {
  email: string;
}

export default function OnboardBusinessForm({ email }: OnboardBusinessFormProps) {
  const { update } = useSession();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState("queueless.com");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handle = setTimeout(() => {
        setHost(window.location.host);
      }, 0);
      return () => clearTimeout(handle);
    }
  }, []);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
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
      .replace(/[^a-z0-9\-]+/g, "");
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

      await update();
      router.refresh();
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
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-3 rounded-lg text-left font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">Owner Email</label>
        <input
          type="email"
          disabled
          value={email}
          className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground select-none focus:outline-none cursor-not-allowed"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">Business Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. Acme Coffee Co."
          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">Business URL Slug</label>
        <div className="flex items-center gap-1 bg-muted/20 border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
          <span className="text-sm text-muted-foreground select-none">{host}/q/</span>
          <input
            type="text"
            required
            value={slug}
            onChange={handleSlugChange}
            placeholder="acme-coffee"
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-medium">This forms the public QR code join link</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
            Creating...
          </>
        ) : (
          "Register Business"
        )}
      </button>
    </form>
  );
}
