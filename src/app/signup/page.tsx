"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
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
} from "lucide-react";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAgencyOwnerAction, {});

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
        {state?.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Signup Form */}
        <form action={formAction} className="space-y-6 text-xs">
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
                  required
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="agencyEmail"
                  placeholder="info@agency.com"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  name="agencyPhone"
                  placeholder="+91 98470 12345"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Office Address (Optional)</label>
                <Input
                  name="address"
                  placeholder="Suite 301, Commercial Center, MG Road"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  name="city"
                  placeholder="e.g. Kochi"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">State / Region</label>
                <Input
                  name="state"
                  placeholder="e.g. Kerala"
                  className="h-9 text-xs"
                />
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
                  required
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Login Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="amit@agency.com"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mobile Phone</label>
                <Input
                  name="phone"
                  placeholder="+91 98250 99887"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-4"
          >
            {isPending ? "Creating Workspace & Account..." : "Create Agency & Start 7-Day Trial"}
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
