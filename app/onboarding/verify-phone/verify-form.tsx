"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface VerifyPhoneFormProps {
  businessPhone: string;
}

export default function VerifyPhoneForm({ businessPhone }: VerifyPhoneFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [code, setCode] = useState<string[]>(new Array(6).fill(""));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Format the phone number to be partially masked (e.g. +91 ******3144)
  const formatMaskedPhone = (phone: string) => {
    if (phone.length >= 10) {
      const suffix = phone.slice(-4);
      const prefix = phone.slice(0, phone.length - 4).replace(/\d/g, "*");
      return `${prefix}${suffix}`;
    }
    return phone;
  };

  const sendOtp = useCallback(async () => {
    if (sending || countdown > 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/verify-phone/request", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send verification code. Please check your network.");
      } else {
        setCountdown(60); // 60s throttle limit
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while sending code.");
    } finally {
      setSending(false);
    }
  }, [sending, countdown]);

  // Automatically send OTP code on component mount
  useEffect(() => {
    let active = true;
    const requestInitial = async () => {
      try {
        const res = await fetch("/api/onboarding/verify-phone/request", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          if (active) setError(data.error || "Failed to send verification code. Please check your network.");
        } else {
          if (active) setCountdown(60);
        }
      } catch (err) {
        console.error(err);
        if (active) setError("An unexpected error occurred while sending code.");
      }
    };
    requestInitial();
    return () => {
      active = false;
    };
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInputChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return; // only allow numbers

    const newCode = [...code];
    // Take only the last character if multiple are inputted
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input box if filled
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all inputs are filled
    if (newCode.every((digit) => digit !== "") && value) {
      submitCode(newCode.join(""));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        // Box is empty, focus previous box and clear it
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return; // must be exactly 6 digits

    const digits = pastedData.split("");
    setCode(digits);
    inputRefs.current[5]?.focus();
    submitCode(pastedData);
  };

  const submitCode = async (otpCode: string) => {
    if (verifying || success) return;
    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/verify-phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
        // Clear code fields on fail
        setCode(new Array(6).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        setSuccess(true);
        // Refresh token session
        try {
          await update();
        } catch (updateErr) {
          console.warn("Session update warning:", updateErr);
        }
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during verification.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 text-center select-none">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-extrabold tracking-tight text-foreground">
          {success ? "Phone Verified!" : "Verify Phone"}
        </h2>
        <p className="text-muted-foreground text-xs font-medium max-w-sm mx-auto">
          {success
            ? "Your phone number has been successfully verified. Opening your dashboard..."
            : `Enter the 6-digit verification code sent to ${formatMaskedPhone(businessPhone)}.`}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-3 rounded-lg flex items-center gap-2 justify-center transition-all duration-300">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="py-6 flex justify-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center animate-bounce shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {!success && (
        <div className="space-y-6">
          {/* OTP Box Inputs */}
          <div className="flex gap-2 justify-center">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={sending || verifying}
                className="w-12 h-14 bg-muted/20 border border-border rounded-xl text-xl font-bold text-center text-foreground placeholder-transparent focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
              />
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => submitCode(code.join(""))}
              disabled={verifying || code.some((digit) => digit === "")}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying Code...
                </>
              ) : (
                "Verify Code"
              )}
            </button>

            <div className="text-xs">
              {sending ? (
                <span className="text-muted-foreground">Sending new code...</span>
              ) : countdown > 0 ? (
                <span className="text-muted-foreground">
                  Resend code in <strong className="font-semibold">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Resend verification code
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
