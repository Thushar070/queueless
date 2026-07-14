"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    // Clear validation error when typing
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

  // Helper to generate slug preview as user types business name
  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameValue = e.target.value;
    const generatedSlug = nameValue
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-\s]/g, "") // remove special chars except spaces/dashes
      .replace(/\s+/g, "-") // replace spaces with dashes
      .replace(/-+/g, "-"); // merge multiple dashes

    setFormData((prev) => ({
      ...prev,
      businessName: nameValue,
      businessSlug: prev.businessSlug === "" || prev.businessSlug === generatedSlug.slice(0, -1)
        ? generatedSlug
        : prev.businessSlug,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black text-slate-100 p-4">
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            QueueLess
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Register your business and claim your virtual queue system
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center py-8 relative z-10 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Registration Successful!</h2>
            <p className="text-slate-400">
              Your business and owner accounts have been created. Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
                Business Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="businessName">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {fieldErrors.businessName && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.businessName[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="businessSlug">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {fieldErrors.businessSlug && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.businessSlug[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="businessEmail">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {fieldErrors.businessEmail && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.businessEmail[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="businessPhone">
                    Phone (Optional)
                  </label>
                  <input
                    id="businessPhone"
                    name="businessPhone"
                    type="tel"
                    placeholder="+15555555555"
                    value={formData.businessPhone}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {fieldErrors.businessPhone && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.businessPhone[0]}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">
                Owner Account Setup
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="ownerName">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                />
                {fieldErrors.ownerName && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.ownerName[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="ownerEmail">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {fieldErrors.ownerEmail && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.ownerEmail[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="password">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {fieldErrors.password && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.password[0]}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? "Creating Account..." : "Register Business"}
            </button>

            <div className="text-center mt-4">
              <span className="text-xs text-slate-500">Already have an account? </span>
              <Link href="/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
