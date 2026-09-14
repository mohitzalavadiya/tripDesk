"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { resendVerificationEmailAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Send } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = React.useState(emailParam);

  const [state, formAction, isPending] = useActionState(resendVerificationEmailAction, {});
  const [cooldown, setCooldown] = React.useState(0);

  // Sync state if query param changes
  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Start 60-second cooldown on successful resend
  React.useEffect(() => {
    if (state?.success) {
      setCooldown(60);
    }
  }, [state?.success]);

  // Handle countdown interval
  React.useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Check Your Inbox
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          We&apos;ve sent a verification link to complete your agency setup.
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

      {/* Instructions */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
        <p className="font-semibold text-slate-900">Next Steps:</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] pl-1">
          <li>Open the email from <strong>TripDesk</strong>.</li>
          <li>Click the verification link in the message.</li>
          <li>Your agency workspace &amp; 7-day free trial will activate immediately.</li>
        </ol>
      </div>

      {/* Feedback Alerts */}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Verification email resent!</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Please check your inbox and spam folder for the new link.
            </p>
          </div>
        </div>
      )}

      {state?.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Resend Action Form */}
      <form action={formAction} className="space-y-3 pt-1">
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
              className="h-9.5 text-xs font-medium"
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || cooldown > 0 || !email}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending...
            </span>
          ) : cooldown > 0 ? (
            <span>Resend available in {cooldown}s</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" /> Resend Verification Email
            </span>
          )}
        </Button>
      </form>

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
