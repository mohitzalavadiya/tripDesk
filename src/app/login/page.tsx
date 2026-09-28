"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { loginAction, AuthActionResult } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, AlertCircle, CheckCircle2, Lock, Mail, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

const loginValidationSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .required("Email address is required.")
    .email("Please enter a valid email address."),
  password: Yup.string()
    .required("Password is required.")
    .min(6, "Password must be at least 6 characters."),
});

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";
  const resetSuccess = searchParams.get("reset") === "success";
  const verifiedSuccess = searchParams.get("verified") === "true";
  const urlError = searchParams.get("error");

  const [serverResult, setServerResult] = React.useState<AuthActionResult | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerResult(null);
      setSubmitting(true);

      const formData = new FormData();
      formData.append("email", values.email.trim());
      formData.append("password", values.password);
      formData.append("redirectTo", redirectTo);

      try {
        const res = await loginAction({}, formData);
        if (res?.error || res?.unverified) {
          setServerResult(res);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setServerResult({ error: err?.message || "An unexpected error occurred during sign in." });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
  };

  return (
    <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Welcome to TripDesk
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Travel Agency SaaS Operating System — Log in to your workspace
        </p>
      </div>

      {/* Feedback Alerts */}
      {verifiedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Email verified successfully!</span>
            <span className="text-emerald-700">
              Your 7-day Starter trial is active. Please enter your credentials to access your workspace.
            </span>
          </div>
        </div>
      )}

      {resetSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Your password has been successfully updated. Please log in.</span>
        </div>
      )}

      {serverResult?.unverified ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Verification Required</span>
              <p className="text-amber-800 leading-relaxed">
                Please verify your email address before signing in to TripDesk.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
            <Link
              href={`/verify-email?email=${encodeURIComponent(serverResult.email || "")}`}
              className="text-amber-900 font-bold hover:underline inline-flex items-center gap-1"
            >
              Go to Verification Screen &rarr;
            </Link>
          </div>
        </div>
      ) : serverResult?.error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{serverResult.error}</span>
        </div>
      ) : urlError && !verifiedSuccess && !resetSuccess ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>
            {urlError === "verification_link_invalid" || urlError === "link_expired"
              ? "The verification link is invalid or has expired. Please request a new one."
              : urlError === "missing_verification_code"
              ? "Missing verification code. Please check your verification email link."
              : "Unable to complete sign in. Please try again."}
          </span>
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Email Address <span className="text-red-500">*</span></label>
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
            <p className="text-[11px] text-red-500 font-semibold mt-0.5 animate-in fade-in-0 duration-150">
              {getFieldError("email")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700">Password <span className="text-red-500">*</span></label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-semibold text-purple-600 hover:text-purple-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`pl-9 pr-9 h-9.5 text-xs font-medium ${getFieldError("password") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {getFieldError("password") && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5 animate-in fade-in-0 duration-150">
              {getFieldError("password")}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
        >
          {formik.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In to Workspace</span>
          )}
        </Button>
      </form>

      {/* Footer Link */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        <span>New agency? </span>
        <Link
          href="/signup"
          className="font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-0.5"
        >
          Start 7-Day Free Trial <ArrowRight className="h-3 w-3 inline" />
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-6 text-slate-900">
      <React.Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-3xl p-9 shadow-2xl text-center text-xs text-slate-500">
            Loading sign in...
          </div>
        }
      >
        <LoginForm />
      </React.Suspense>
    </div>
  );
}

