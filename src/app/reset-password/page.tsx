"use client";

import * as React from "react";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { resetPasswordAction, AuthActionResult } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Lock, AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

const resetPasswordValidationSchema = Yup.object().shape({
  password: Yup.string()
    .required("New password is required.")
    .min(6, "Password must be at least 6 characters."),
  confirmPassword: Yup.string()
    .required("Please confirm your new password.")
    .oneOf([Yup.ref("password")], "Passwords do not match."),
});

export default function ResetPasswordPage() {
  const [serverResult, setServerResult] = React.useState<AuthActionResult | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: resetPasswordValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerResult(null);
      setSubmitting(true);

      const formData = new FormData();
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);

      try {
        const res = await resetPasswordAction({}, formData);
        if (res?.error) {
          setServerResult(res);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setServerResult({ error: err?.message || "Failed to reset password. Please try again." });
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
            Set New Password
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Enter your new secure password below to regain access to your workspace.
          </p>
        </div>

        {serverResult?.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{serverResult.error}</span>
          </div>
        )}

        <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Minimum 6 characters"
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
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                {getFieldError("password")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Confirm New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter new password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`pl-9 pr-9 h-9.5 text-xs font-medium ${getFieldError("confirmPassword") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {getFieldError("confirmPassword") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                {getFieldError("confirmPassword")}
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
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password & Log In</span>
            )}
          </Button>
        </form>

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

