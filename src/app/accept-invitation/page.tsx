"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAfterInvitationAction } from "@/actions/auth-actions";
import { createClient } from "@/lib/supabase/client";
import { useFormik } from "formik";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  User,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import * as Yup from "yup";

interface VerificationData {
  valid: boolean;
  reason?: string;
  agencyName?: string;
  email?: string;
  role?: string;
  expiresAt?: string;
}

const acceptValidationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Full name is required.")
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  password: Yup.string()
    .required("Password is required.")
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password cannot exceed 100 characters."),
  confirmPassword: Yup.string()
    .required("Please confirm your password.")
    .oneOf([Yup.ref("password")], "Passwords do not match."),
});

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token") || searchParams.get("invitation") || "";

  const [verifying, setVerifying] = React.useState(true);
  const [verification, setVerification] = React.useState<VerificationData | null>(null);
  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [successState, setSuccessState] = React.useState(false);
  const [signInRecoveryState, setSignInRecoveryState] = React.useState<{
    email: string;
    error?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // 1. Initial Verification & Session Check
  React.useEffect(() => {
    let isMounted = true;

    async function checkVerificationAndSession() {
      if (!rawToken || rawToken.trim().length < 32) {
        if (isMounted) {
          setVerifying(false);
          setVerification({ valid: false, reason: "INVALID_TOKEN" });
        }
        return;
      }

      try {
        setVerifying(true);
        setServerError(null);

        // Check active session if any
        try {
          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getUser();
          if (isMounted && sessionData?.user?.email) {
            setSessionEmail(sessionData.user.email);
          }
        } catch {
          // Ignore session fetch error for public visitor
        }

        const res = await fetch("/api/team/invitations/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: rawToken.trim() }),
        });

        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setVerification(json.data);
          } else {
            setVerification({
              valid: false,
              reason: json.error?.code || "INVALID_TOKEN",
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setVerification({
            valid: false,
            reason: "NETWORK_ERROR",
          });
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    }

    checkVerificationAndSession();

    return () => {
      isMounted = false;
    };
  }, [rawToken]);

  // Handle Logout of conflicting session
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setSessionEmail(null);
      // Re-trigger verification to clear any state
      window.location.reload();
    } catch {
      setLoggingOut(false);
    }
  };

  // Formik Onboarding Submission
  const formik = useFormik({
    initialValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: acceptValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (!verification?.email) return;
      setServerError(null);
      setSubmitting(true);

      try {
        const res = await fetch("/api/team/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: rawToken.trim(),
            name: values.name.trim(),
            password: values.password,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          const errMsg =
            typeof json.error === "object"
              ? json.error.message
              : json.error || "Failed to accept staff invitation.";
          setServerError(errMsg);
          setSubmitting(false);
          return;
        }

        // Onboarding committed and database user provisioned.
        // Step 2: Establish server-side Supabase SSR session with chunked Set-Cookie headers.
        try {
          const signInRes = await signInAfterInvitationAction({
            email: verification.email,
            password: values.password,
          });

          if (signInRes.success) {
            setSuccessState(true);
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1000);
            return;
          }

          // Sign-in returned a classified error (e.g. rate limit, auth glitch).
          // Invitation is already accepted/consumed — do NOT resubmit form.
          setSubmitting(false);
          setSignInRecoveryState({
            email: verification.email,
            error: signInRes.error || "Automatic sign-in could not be completed.",
          });
        } catch (signInErr: any) {
          // Unexpected sign-in exception: safe recovery to login
          setSubmitting(false);
          setSignInRecoveryState({
            email: verification.email,
            error:
              signInErr?.message ||
              "Automatic sign-in could not be completed. Please log in with your new password.",
          });
        }
      } catch (err: any) {
        setServerError(
          err.message || "An unexpected network error occurred while accepting the invitation."
        );
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 1: Verifying Token
  // ─────────────────────────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-4 animate-in fade-in-0 duration-200">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Verifying Staff Invitation...</h2>
          <p className="text-xs text-slate-500 font-medium">
            Confirming authorization and tenant security credentials.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 2: Success State (Redirecting)
  // ─────────────────────────────────────────────────────────────────────────
  if (successState) {
    return (
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-5 animate-in fade-in-0 duration-200">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-slate-900">Invitation Accepted!</h2>
          <p className="text-xs text-slate-600 font-medium">
            Your staff account has been activated for{" "}
            <span className="font-bold text-slate-900">
              {verification?.agencyName || "your agency"}
            </span>
            .
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Setting up workspace session...</span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 3: Invalid / Expired / Revoked / Already Accepted State
  // ─────────────────────────────────────────────────────────────────────────
  if (!verification || !verification.valid) {
    const reason = verification?.reason;
    let icon = <XCircle className="h-7 w-7 text-rose-600" />;
    let iconBg = "bg-rose-50 text-rose-600";
    let title = "Invalid Invitation Link";
    let description =
      "This staff invitation link is invalid or incomplete. Please check the full link provided by your agency administrator.";
    let showLoginButton = false;

    if (reason === "EXPIRED") {
      icon = <Clock className="h-7 w-7 text-amber-600" />;
      iconBg = "bg-amber-50 text-amber-600";
      title = "Invitation Has Expired";
      description =
        "Staff invitation links expire after 7 days for security. Please ask your agency owner or administrator to resend a fresh invitation.";
    } else if (reason === "REVOKED") {
      icon = <ShieldAlert className="h-7 w-7 text-rose-600" />;
      iconBg = "bg-rose-50 text-rose-600";
      title = "Invitation Revoked";
      description =
        "This staff invitation has been revoked by the agency administrator. If you believe this is a mistake, please reach out to your agency owner.";
    } else if (reason === "ALREADY_ACCEPTED") {
      icon = <BadgeCheck className="h-7 w-7 text-emerald-600" />;
      iconBg = "bg-emerald-50 text-emerald-600";
      title = "Invitation Already Accepted";
      description =
        "This single-use invitation has already been accepted and your staff account is active. Please sign in to access your agency workspace.";
      showLoginButton = true;
    }

    return (
      <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 duration-200">
        <div className="text-center space-y-2">
          <div className={`h-14 w-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto shadow-sm`}>
            {icon}
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>

        <div className="space-y-3 pt-2">
          {showLoginButton ? (
            <Link
              href="/login"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In to Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs h-10 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Back to Sign In</span>
            </Link>
          )}

          <div className="text-center">
            <span className="text-[11px] text-slate-400">
              Need assistance? Contact your agency owner or email support.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 4: Sign-in Recovery (Invitation accepted, but auto sign-in failed)
  // ─────────────────────────────────────────────────────────────────────────
  if (signInRecoveryState) {
    const isProfileMissing =
      signInRecoveryState.error?.includes("no workspace profile was found") ||
      signInRecoveryState.error?.includes("workspace profile");

    return (
      <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 duration-200">
        <div className="text-center space-y-2">
          <div
            className={`h-14 w-14 rounded-2xl ${
              isProfileMissing ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
            } flex items-center justify-center mx-auto shadow-sm`}
          >
            {isProfileMissing ? (
              <AlertCircle className="h-8 w-8 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            )}
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            {isProfileMissing ? "Workspace Setup Notice" : "Account Activated"}
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {isProfileMissing ? (
              <>
                Your authentication credentials are valid, but your workspace profile is not yet available for{" "}
                <strong className="text-slate-800">{verification?.agencyName || "your agency"}</strong>.
                Please contact your agency administrator or try signing in below.
              </>
            ) : (
              <>
                Your staff account has been created for{" "}
                <strong className="text-slate-800">{verification?.agencyName || "your agency"}</strong>.
                Please sign in with your credentials to access your workspace.
              </>
            )}
          </p>
        </div>

        {signInRecoveryState.error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Sign-in Notice</span>
              <span>{signInRecoveryState.error}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Link
            href={`/login?registered=true&email=${encodeURIComponent(signInRecoveryState.email)}`}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600 font-medium">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 5: Valid Invitation — Staff Onboarding Form
  // ─────────────────────────────────────────────────────────────────────────
  const hasSessionEmailConflict = Boolean(
    sessionEmail &&
    verification.email &&
    sessionEmail.trim().toLowerCase() !== verification.email.trim().toLowerCase()
  );

  return (
    <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Accept Staff Invitation
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Join <span className="font-bold text-indigo-600">{verification.agencyName}</span> as a team member
        </p>
      </div>

      {/* Agency & Role Summary Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 text-xs">
        <Users className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-950">Inviting Agency:</span>
            <span className="font-semibold text-indigo-800">{verification.agencyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-950">Assigned Role:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              Agency Staff
            </span>
          </div>
        </div>
      </div>

      {/* Session Conflict Warning */}
      {hasSessionEmailConflict && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Active Session Detected</span>
              <p className="text-[11px] text-amber-800">
                You are currently signed in as <strong className="text-slate-900">{sessionEmail}</strong>.
                This invitation is for <strong className="text-slate-900">{verification.email}</strong>.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full h-8 text-xs font-semibold border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            {loggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <LogOut className="h-3.5 w-3.5 mr-1" />
            )}
            Log out to accept invitation
          </Button>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Unable to complete acceptance</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      {/* Acceptance Form */}
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 text-xs">
        {/* Email Field (Authoritative, Read-Only) */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 flex items-center justify-between">
            <span>Work Email Address</span>
            <span className="text-[10px] font-normal text-slate-400">Verified from invitation</span>
          </label>
          <div className="relative">
            <Input
              type="email"
              disabled
              value={verification.email || ""}
              className="h-9.5 text-xs bg-slate-100/80 border-slate-200 text-slate-600 font-medium pl-8 cursor-not-allowed select-none"
            />
            <Mail className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Full Name Field */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              name="name"
              placeholder="e.g. Priya Sharma"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting || hasSessionEmailConflict}
              className={`h-9.5 text-xs pl-8 ${
                getFieldError("name") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
              }`}
            />
            <User className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          {getFieldError("name") && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("name")}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">
            Create Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Minimum 8 characters"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting || hasSessionEmailConflict}
              className={`pr-9 pl-8 h-9.5 text-xs ${
                getFieldError("password") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
              }`}
            />
            <Lock className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
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
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{getFieldError("password")}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting || hasSessionEmailConflict}
              className={`pr-9 pl-8 h-9.5 text-xs ${
                getFieldError("confirmPassword")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
            />
            <Lock className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
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

        {/* Security Notice */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            By accepting, you will be linked directly to {verification.agencyName} with least-privilege staff permissions.
          </span>
        </div>

        <Button
          type="submit"
          disabled={formik.isSubmitting || hasSessionEmailConflict}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
        >
          {formik.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Activating Staff Account...</span>
            </>
          ) : (
            <span>Accept Invitation & Join Team</span>
          )}
        </Button>
      </form>

      {/* Footer Link */}
      <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
        <span>Already have an account? </span>
        <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
          Sign in to your account
        </Link>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-6 text-slate-900">
      <React.Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-3xl p-9 shadow-2xl text-center text-xs text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
            Loading invitation...
          </div>
        }
      >
        <AcceptInvitationContent />
      </React.Suspense>
    </div>
  );
}
