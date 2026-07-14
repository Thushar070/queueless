"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: "",
    businessSlug: "",
    businessEmail: "",
    businessPhone: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && data.details.fieldErrors) {
          setFieldErrors(data.details.fieldErrors);
          setError("Please correct the validation errors below.");
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameValue = e.target.value;
    const generatedSlug = nameValue
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    setFormData((prev) => ({
      ...prev,
      businessName: nameValue,
      businessSlug: prev.businessSlug === "" || prev.businessSlug === generatedSlug.slice(0, -1)
        ? generatedSlug
        : prev.businessSlug,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 relative overflow-hidden select-none">
      {/* Dark minimalist grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            QueueLess
          </h1>
          <p className="text-zinc-400 mt-1 text-xs">
            Register your business and claim your virtual queue system
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center py-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Registration Successful!</h2>
            <p className="text-zinc-400 text-xs">
              Your business and owner accounts have been created. Redirecting to login...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Google Registration Option */}
            <button
              onClick={handleGoogleSignup}
              className="w-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-zinc-500 text-[10px] uppercase tracking-wider">Or Register with Credentials</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 border-b border-zinc-900 pb-1 text-left">
                  Business Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400" htmlFor="businessName">
                      Business Name
                    </label>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      required
                      placeholder="Acme Clinic"
                      value={formData.businessName}
                      onChange={(e) => {
                        handleChange(e);
                        handleBusinessNameChange(e);
                      }}
                      className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    {fieldErrors.businessName && (
                      <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.businessName[0]}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400" htmlFor="businessSlug">
                      URL Slug
                    </label>
                    <input
                      id="businessSlug"
                      name="businessSlug"
                      type="text"
                      required
                      placeholder="acme-clinic"
                      value={formData.businessSlug}
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    {fieldErrors.businessSlug && (
                      <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.businessSlug[0]}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400" htmlFor="businessEmail">
                      Business Email
                    </label>
                    <input
                      id="businessEmail"
                      name="businessEmail"
                      type="email"
                      required
                      placeholder="info@acme.com"
                      value={formData.businessEmail}
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    {fieldErrors.businessEmail && (
                      <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.businessEmail[0]}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400" htmlFor="businessPhone">
                      Phone (Optional)
                    </label>
                    <input
                      id="businessPhone"
                      name="businessPhone"
                      type="tel"
                      placeholder="+15555555555"
                      value={formData.businessPhone}
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    {fieldErrors.businessPhone && (
                      <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.businessPhone[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 border-b border-zinc-900 pb-1 text-left">
                  Owner Account Setup
                </h3>

                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-medium text-zinc-400" htmlFor="ownerName">
                    Owner Name
                  </label>
                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  {fieldErrors.ownerName && (
                    <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.ownerName[0]}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400" htmlFor="ownerEmail">
                      Login Email
                    </label>
                    <input
                      id="ownerEmail"
                      name="ownerEmail"
                      type="email"
                      required
                      placeholder="jane@acme.com"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    {fieldErrors.ownerEmail && (
                      <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.ownerEmail[0]}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-400" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    {fieldErrors.password && (
                      <p className="text-red-400 text-[10px] mt-0.5">{fieldErrors.password[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-850 disabled:text-zinc-600 text-black text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? "Creating Account..." : "Register Business"}
              </button>

              <div className="text-center mt-4">
                <span className="text-xs text-zinc-500">Already have an account? </span>
                <Link href="/login" className="text-xs text-zinc-300 hover:text-white font-semibold transition-colors">
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
