"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { requestPasswordResetAction, AuthActionResult } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2, ArrowRight } from "lucide-react";

const forgotPasswordValidationSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .required("Registered email address is required.")
    .email("Please enter a valid email address."),
});

const RECOVERY_COOLDOWN_PREFIX = "tripdesk_recovery_cooldown_";

function getStoredRecoveryCooldown(email: string): number {
  if (typeof window === "undefined" || !email) return 0;
  try {
    const stored = sessionStorage.getItem(`${RECOVERY_COOLDOWN_PREFIX}${email.trim().toLowerCase()}`);
    if (!stored) return 0;
    const timestamp = parseInt(stored, 10);
    if (isNaN(timestamp)) return 0;
    const elapsed = Math.floor((Date.now() - timestamp) / 1000);
    const remaining = 60 - elapsed;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

function setStoredRecoveryCooldown(email: string): void {
  if (typeof window === "undefined" || !email) return;
  try {
    sessionStorage.setItem(`${RECOVERY_COOLDOWN_PREFIX}${email.trim().toLowerCase()}`, Date.now().toString());
  } catch {
    // Non-blocking in storage-disabled contexts
  }
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [serverResult, setServerResult] = React.useState<AuthActionResult | null>(null);
  const [cooldown, setCooldown] = React.useState<number>(0);

  // 60-second cooldown interval
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: forgotPasswordValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerResult(null);
      setSubmitting(true);

      const targetEmail = values.email.trim().toLowerCase();
      const formData = new FormData();
      formData.append("email", targetEmail);

      try {
        const res = await requestPasswordResetAction({}, formData);
        setServerResult(res);
        if (res?.success || res?.rateLimited) {
          setCooldown(60);
          setStoredRecoveryCooldown(targetEmail);
        }
      } catch (err: any) {
        setServerResult({ error: err?.message || "Failed to process recovery request. Please try again." });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Check stored cooldown whenever email changes or on initial prefill
  React.useEffect(() => {
    const currentEmail = formik.values.email.trim().toLowerCase();
    if (currentEmail) {
      const remaining = getStoredRecoveryCooldown(currentEmail);
      if (remaining > 0) {
        setCooldown(remaining);
      }
    }
  }, [formik.values.email]);

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
  };

  const handleProceedToOtp = () => {
    if (formik.values.email) {
      router.push(`/reset-password?email=${encodeURIComponent(formik.values.email.trim().toLowerCase())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Compass className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Reset Password
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Enter your registered email and we&apos;ll dispatch a 6-digit recovery code.
          </p>
        </div>

        {/* Neutral Success Notice - Discloses Zero Account Existence Details */}
        {serverResult?.success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-4 space-y-3 animate-in fade-in-0 duration-150">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Recovery Code Dispatched</p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  If an account exists for <span className="font-semibold text-slate-900 break-all">{formik.values.email}</span>, you will receive a 6-digit verification code. Please check your inbox and spam folder.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleProceedToOtp}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <span>Enter 6-Digit Code</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {serverResult?.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{serverResult.error}</span>
          </div>
        )}

        {!serverResult?.success && (
          <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Registered Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  name="email"
                  placeholder="name@agency.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`pl-9 h-9.5 text-xs font-medium ${getFieldError("email") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
              </div>
              {getFieldError("email") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                  {getFieldError("email")}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={formik.isSubmitting || cooldown > 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {formik.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Requesting Code...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Request Again in {cooldown}s</span>
              ) : (
                <span>Send 6-Digit Recovery Code</span>
              )}
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link
            href="/login"
            className="font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
          {serverResult?.success && (
            <button
              type="button"
              onClick={() => {
                setServerResult(null);
                formik.resetForm();
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Use different email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
