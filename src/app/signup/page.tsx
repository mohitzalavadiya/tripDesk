"use client";

import * as React from "react";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { signupAgencyOwnerAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Compass,
  Building2,
  User,
  Clock,
  Lock,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

const signupValidationSchema = Yup.object().shape({
  agencyName: Yup.string()
    .trim()
    .required("Agency legal name is required.")
    .min(2, "Agency name must be at least 2 characters.")
    .max(120, "Agency name cannot exceed 120 characters."),
  agencyEmail: Yup.string()
    .trim()
    .required("Official agency email is required.")
    .email("Please enter a valid agency email address.")
    .max(120, "Email cannot exceed 120 characters."),
  agencyPhone: Yup.string()
    .trim()
    .required("Primary phone number is required.")
    .min(3, "Phone number must be at least 3 characters.")
    .max(30, "Phone number cannot exceed 30 characters."),
  address: Yup.string().trim().max(255, "Address cannot exceed 255 characters."),
  city: Yup.string()
    .trim()
    .required("City is required.")
    .min(2, "City must be at least 2 characters.")
    .max(100, "City cannot exceed 100 characters."),
  state: Yup.string().trim().max(100, "State cannot exceed 100 characters."),
  ownerName: Yup.string()
    .trim()
    .required("Owner full name is required.")
    .min(2, "Owner name must be at least 2 characters.")
    .max(120, "Owner name cannot exceed 120 characters."),
  email: Yup.string()
    .trim()
    .required("Login email address is required.")
    .email("Please enter a valid login email address.")
    .max(120, "Email cannot exceed 120 characters."),
  phone: Yup.string().trim().max(30, "Phone cannot exceed 30 characters."),
  password: Yup.string()
    .required("Password is required.")
    .min(6, "Password must be at least 6 characters."),
  confirmPassword: Yup.string()
    .required("Please confirm your password.")
    .oneOf([Yup.ref("password")], "Passwords do not match."),
});

export default function SignupPage() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      agencyName: "",
      agencyEmail: "",
      agencyPhone: "",
      address: "",
      city: "",
      state: "",
      ownerName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: signupValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      setSubmitting(true);

      const formData = new FormData();
      formData.append("agencyName", values.agencyName.trim());
      formData.append("agencyEmail", values.agencyEmail.trim());
      formData.append("agencyPhone", values.agencyPhone.trim());
      formData.append("address", values.address.trim());
      formData.append("city", values.city.trim());
      formData.append("state", values.state.trim());
      formData.append("country", "India");
      formData.append("ownerName", values.ownerName.trim());
      formData.append("email", values.email.trim().toLowerCase());
      formData.append("phone", values.phone.trim());
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);

      try {
        const res = await signupAgencyOwnerAction({}, formData);
        if (res?.error) {
          setServerError(res.error);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setServerError(err?.message || "Failed to create account. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-8 text-slate-900">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-9 shadow-2xl space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Compass className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Start Your 7-Day Free Trial
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Register your travel agency and owner account in one simple step. Full access included — no upfront payment required.
          </p>
        </div>

        {/* 7-Day Trial Badge */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-amber-900">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Instant 7-Day Free Trial</p>
            <p className="text-[11px] text-amber-800">
              Explore quotations, itineraries, hotel rates, costing calculations, and customer management instantly.
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {serverError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-6 text-xs">
          {/* Section 1: Agency Information */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                1. Agency Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">
                  Agency Legal Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="agencyName"
                  placeholder="e.g. Blue Lagoon Holiday Planners"
                  value={formik.values.agencyName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs font-semibold ${getFieldError("agencyName") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("agencyName") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("agencyName")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="agencyEmail"
                  placeholder="info@agency.com"
                  value={formik.values.agencyEmail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("agencyEmail") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("agencyEmail") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("agencyEmail")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  name="agencyPhone"
                  placeholder="+91 98470 12345"
                  value={formik.values.agencyPhone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("agencyPhone") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("agencyPhone") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("agencyPhone")}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Office Address (Optional)</label>
                <Input
                  name="address"
                  placeholder="Suite 301, Commercial Center, MG Road"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("address") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("address") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("address")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  name="city"
                  placeholder="e.g. Kochi"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("city") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("city") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("city")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">State / Region</label>
                <Input
                  name="state"
                  placeholder="e.g. Kerala"
                  value={formik.values.state}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("state") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("state") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("state")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Owner Profile & Security */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="h-4 w-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                2. Agency Owner Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">
                  Owner Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="ownerName"
                  placeholder="e.g. Amit Sharma"
                  value={formik.values.ownerName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs font-semibold ${getFieldError("ownerName") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("ownerName") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("ownerName")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Login Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="amit@agency.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("email") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("email") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("email")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mobile Phone</label>
                <Input
                  name="phone"
                  placeholder="+91 98250 99887"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`h-9 text-xs ${getFieldError("phone") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                />
                {getFieldError("phone") && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                    {getFieldError("phone")}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`pr-9 h-9 text-xs ${getFieldError("password") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
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

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`pr-9 h-9 text-xs ${getFieldError("confirmPassword") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
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
            </div>
          </div>

          <Button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {formik.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Workspace & Account...</span>
              </>
            ) : (
              <span>Create Agency & Start 7-Day Trial</span>
            )}
          </Button>
        </form>

        {/* Footer Link */}
        <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Already registered? </span>
          <Link
            href="/login"
            className="font-bold text-purple-600 hover:text-purple-700"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}

