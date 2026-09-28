"use client";

import * as React from "react";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { requestPasswordResetAction, AuthActionResult } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

const forgotPasswordValidationSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .required("Registered email address is required.")
    .email("Please enter a valid email address."),
});

export default function ForgotPasswordPage() {
  const [serverResult, setServerResult] = React.useState<AuthActionResult | null>(null);

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: forgotPasswordValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerResult(null);
      setSubmitting(true);

      const formData = new FormData();
      formData.append("email", values.email.trim());

      try {
        const res = await requestPasswordResetAction({}, formData);
        setServerResult(res);
      } catch (err: any) {
        setServerResult({ error: err?.message || "Failed to send reset link. Please try again." });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
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
            Enter your registered email and we'll send you a password recovery link.
          </p>
        </div>

        {serverResult?.success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Reset link sent!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Check your inbox for instructions to reset your password.
              </p>
            </div>
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
              disabled={formik.isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {formik.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center text-xs">
          <Link
            href="/login"
            className="font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

