"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useActionState } from "react";
import { verifyEmailOtpAction, resendVerificationEmailAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Send, ShieldAlert, KeyRound } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const errorParam = searchParams.get("error");
  const [email, setEmail] = React.useState(emailParam);
  const [otpToken, setOtpToken] = React.useState("");

  // OTP Verification Action State
  const [otpState, otpFormAction, isOtpPending] = useActionState(verifyEmailOtpAction, {});

  // Resend Action State
  const [resendState, resendFormAction, isResendPending] = useActionState(resendVerificationEmailAction, {});
  const [cooldown, setCooldown] = React.useState(0);

  // Sync state if query param changes
  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Navigate to login with verified flag upon successful OTP verification
  React.useEffect(() => {
    if (otpState?.success) {
      router.push("/login?verified=true");
    }
  }, [otpState?.success, router]);

  // Start 60-second cooldown on successful resend
  React.useEffect(() => {
    if (resendState?.success) {
      setCooldown(60);
    }
  }, [resendState?.success]);

  // Handle countdown interval
  React.useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const getUrlErrorMessage = (err: string | null) => {
    if (!err) return null;
    switch (err) {
      case "link_expired":
      case "otp_expired":
        return "Your verification code or link has expired. Please request a new verification code below.";
      case "unverified_account":
        return "Your email address is not yet verified. Please enter the verification code sent to your email.";
      case "onboarding_failed":
        return "Workspace activation encountered an issue. Please try entering the code again or request a new code.";
      default:
        return "Verification could not be completed. Please enter your verification code or request a new code below.";
    }
  };

  const urlError = getUrlErrorMessage(errorParam);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize to only numeric digits, max 8 digits
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 8);
    setOtpToken(cleaned);
  };

  return (
    <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Verify Your Email
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Enter the verification code sent to your registered email.
        </p>
      </div>

      {/* Target Email Display */}
      {email ? (
        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 text-center space-y-1">
          <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
            Verification Sent To
          </p>
          <p className="text-xs font-bold text-slate-900 break-all">
            {email}
          </p>
        </div>
      ) : null}

      {/* URL Error Feedback */}
      {urlError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{urlError}</span>
        </div>
      )}

      {/* OTP Verification Form */}
      <form action={otpFormAction} className="space-y-4">
        {email ? (
          <input type="hidden" name="email" value={email} />
        ) : (
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700">Registered Email Address</label>
            <Input
              type="email"
              name="email"
              placeholder="name@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 text-xs font-medium"
            />
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700">Verification Code</label>
            <span className="text-[11px] text-slate-400">Numeric Code</span>
          </div>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            name="token"
            placeholder="••••••••"
            value={otpToken}
            onChange={handleOtpChange}
            maxLength={8}
            required
            className="h-12 text-center text-xl font-mono font-bold tracking-[0.35em] text-slate-900 bg-slate-50/80 border-slate-200 focus:bg-white transition-all rounded-xl"
          />
        </div>

        {otpState?.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{otpState.error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isOtpPending || otpToken.length < 6 || !email}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-11 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOtpPending ? (
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Code &amp; Activating Workspace...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Verify &amp; Activate Agency
            </span>
          )}
        </Button>
      </form>

      {/* Resend Action Section */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        {resendState?.success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Verification code resent!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Please check your inbox and spam folder for your code.
              </p>
            </div>
          </div>
        )}

        {resendState?.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{resendState.error}</span>
          </div>
        )}

        <form action={resendFormAction}>
          {email ? <input type="hidden" name="email" value={email} /> : null}
          <Button
            type="submit"
            variant="outline"
            disabled={isResendPending || cooldown > 0 || !email}
            className="w-full text-slate-700 font-semibold text-xs h-9.5 rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResendPending ? (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending...
              </span>
            ) : cooldown > 0 ? (
              <span>Resend code available in {cooldown}s</span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-purple-600" /> Resend Verification Code
              </span>
            )}
          </Button>
        </form>
      </div>

      {/* Navigation Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <Link
          href="/login"
          className="font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Login
        </Link>
        <Link
          href="/signup"
          className="font-medium text-slate-500 hover:text-slate-700"
        >
          Use different email
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-6 text-slate-900">
      <React.Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-3xl p-9 shadow-2xl text-center text-xs text-slate-500">
            Loading verification details...
          </div>
        }
      >
        <VerifyEmailContent />
      </React.Suspense>
    </div>
  );
}
