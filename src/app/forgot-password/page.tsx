"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, {});

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

        {state?.success && (
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

        {state?.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {!state?.success && (
          <form action={formAction} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="name@agency.com"
                  required
                  className="pl-9 h-9.5 text-xs font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 mt-2"
            >
              {isPending ? "Sending Reset Link..." : "Send Password Reset Link"}
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
