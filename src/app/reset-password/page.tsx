"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  verifyRecoveryOtpAction,
  resendRecoveryOtpAction,
  checkRecoveryStateAction,
  resetPasswordAction,
  AuthActionResult,
} from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Compass,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const resetPasswordValidationSchema = Yup.object().shape({
  password: Yup.string()
    .required("New password is required.")
    .min(6, "Password must be at least 6 characters."),
  confirmPassword: Yup.string()
    .required("Please confirm your new password.")
    .oneOf([Yup.ref("password")], "Passwords do not match."),
});

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
          <div className="flex flex-col items-center justify-center space-y-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <span className="text-xs font-semibold text-slate-300">Loading recovery portal...</span>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}

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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  // Stages: "VERIFY_OTP" (Stage A) | "SET_NEW_PASSWORD" (Stage B)
  const [stage, setStage] = React.useState<"VERIFY_OTP" | "SET_NEW_PASSWORD">("VERIFY_OTP");
  const [email, setEmail] = React.useState<string>(emailParam);
  const [otpToken, setOtpToken] = React.useState<string>("");
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState<boolean>(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  // Resend state
  const [cooldown, setCooldown] = React.useState<number>(0);
  const [resendStatus, setResendStatus] = React.useState<AuthActionResult | null>(null);
  const [isResending, setIsResending] = React.useState<boolean>(false);

  // Password Form State
  const [passwordServerResult, setPasswordServerResult] = React.useState<AuthActionResult | null>(null);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState<boolean>(false);

  // Sync email and cooldown from search params or stored session
  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      const remaining = getStoredRecoveryCooldown(emailParam);
      if (remaining > 0) {
        setCooldown(remaining);
      }
    }
  }, [emailParam]);

  React.useEffect(() => {
    if (email) {
      const remaining = getStoredRecoveryCooldown(email);
      if (remaining > 0) {
        setCooldown(remaining);
      }
    }
  }, [email]);

  // Check if active session already possesses verified recovery state (e.g. after refresh)
  React.useEffect(() => {
    let isMounted = true;
    async function checkState() {
      try {
        const res = await checkRecoveryStateAction();
        if (isMounted && res?.verified && res?.email) {
          setEmail(res.email);
          setStage("SET_NEW_PASSWORD");
        }
      } catch {
        // Fallback to OTP verification stage
      }
    }
    checkState();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown timer interval
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpToken(cleaned);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setOtpError("Please enter your registered email address.");
      return;
    }

    if (otpToken.length !== 6) {
      setOtpError("Verification code must be exactly 6 numeric digits.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const formData = new FormData();
      formData.append("email", targetEmail);
      formData.append("token", otpToken);

      const res = await verifyRecoveryOtpAction({}, formData);
      if (res?.error) {
        setOtpError(res.error);
      } else if (res?.success && res?.verified) {
        setStage("SET_NEW_PASSWORD");
        setOtpError(null);
      }
    } catch (err: any) {
      setOtpError(err?.message || "Failed to verify code. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || isResending) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setOtpError("Please enter your email address to receive a recovery code.");
      return;
    }

    setIsResending(true);
    setResendStatus(null);
    try {
      const formData = new FormData();
      formData.append("email", targetEmail);

      const res = await resendRecoveryOtpAction({}, formData);
      setResendStatus(res);
      if (res?.success || res?.rateLimited) {
        setCooldown(60);
        setStoredRecoveryCooldown(targetEmail);
      }
    } catch (err: any) {
      setResendStatus({ error: err?.message || "Failed to resend code. Please try again." });
    } finally {
      setIsResending(false);
    }
  };

  // Password submission Formik form
  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: resetPasswordValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setPasswordServerResult(null);
      setSubmitting(true);

      const formData = new FormData();
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);

      try {
        const res = await resetPasswordAction({}, formData);
        if (res?.error) {
          setPasswordServerResult(res);
          // If session expired, return user to OTP verification stage
          if (res.error.toLowerCase().includes("session") || res.error.toLowerCase().includes("expired")) {
            setStage("VERIFY_OTP");
            setOtpError(res.error);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setPasswordServerResult({ error: err?.message || "Failed to update password. Please try again." });
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
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
            {stage === "VERIFY_OTP" ? <KeyRound className="h-6 w-6" /> : <Compass className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {stage === "VERIFY_OTP" ? "Verify Recovery Code" : "Set New Password"}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {stage === "VERIFY_OTP"
              ? "Enter the 6-digit recovery code sent to your registered email."
              : "Enter your new password below to regain access to your workspace."}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* STAGE A: 6-DIGIT OTP VERIFICATION FORM */}
        {/* ========================================================================= */}
        {stage === "VERIFY_OTP" && (
          <div className="space-y-4">
            {email ? (
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3 text-center space-y-1">
                <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                  Target Account
                </p>
                <p className="text-xs font-bold text-slate-900 break-all">{email}</p>
              </div>
            ) : null}

            {resendStatus?.success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>If registered, a new 6-digit code has been dispatched.</span>
              </div>
            )}

            {resendStatus?.error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{resendStatus.error}</span>
              </div>
            )}

            {otpError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              {!email && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Registered Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      type="email"
                      name="email"
                      placeholder="name@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 h-9.5 text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">6-Digit Recovery Code <span className="text-red-500">*</span></label>
                  <span className="text-[11px] text-slate-400 font-mono">Numbers only</span>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  name="token"
                  placeholder="••••••"
                  value={otpToken}
                  onChange={handleOtpChange}
                  maxLength={6}
                  required
                  className="h-12 text-center text-xl font-mono font-bold tracking-[0.35em] text-slate-900 bg-slate-50/80 border-slate-200 focus:bg-white transition-all rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={isVerifyingOtp || otpToken.length !== 6 || !email.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify Code &amp; Continue</span>
                  </>
                )}
              </Button>
            </form>

            {/* Resend Code Section */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Didn&apos;t receive code?</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldown > 0 || isResending || !email.trim()}
                className="font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {isResending ? (
                  "Sending..."
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  "Resend Code"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE B: SET NEW PASSWORD FORM (UNLOCKED ONLY UPON VERIFIED RECOVERY) */}
        {/* ========================================================================= */}
        {stage === "SET_NEW_PASSWORD" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Recovery code verified for {email}. Please set your new password.</span>
            </div>

            {passwordServerResult?.error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{passwordServerResult.error}</span>
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  <span>Update Password &amp; Log In</span>
                )}
              </Button>
            </form>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link
            href="/login"
            className="font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
          <Link
            href="/forgot-password"
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Request New Code
          </Link>
        </div>
      </div>
    </div>
  );
}
