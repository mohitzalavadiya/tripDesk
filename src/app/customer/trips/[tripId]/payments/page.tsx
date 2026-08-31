"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { customerPortalClient } from "@/lib/api-client";
import { CustomerPaymentSummaryView } from "@/lib/services/customer-portal-service";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  Receipt,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";

export default function CustomerPaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = (params?.tripId as string) || "";

  const [paymentSummary, setPaymentSummary] = React.useState<CustomerPaymentSummaryView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadPayments() {
      if (!tripId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await customerPortalClient.getTripPayments(tripId);
        setPaymentSummary(data);
      } catch (err: any) {
        if (err?.message?.includes("CUSTOMER_UNAUTHORIZED")) {
          router.push("/customer/login");
        } else {
          setError(err?.message || "Failed to load payment ledger.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, [tripId, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-semibold">Loading payment ledger...</p>
      </div>
    );
  }

  if (error || !paymentSummary) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-sm my-12">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Payments Unavailable</h2>
        <p className="text-xs text-slate-500">{error || "Payment summary not found."}</p>
        <Link href={`/customer/trips/${tripId}`}>
          <Button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold">
            Return to Trip Details
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/customer/trips/${tripId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trip Details</span>
        </Link>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Package Cost
          </span>
          <div className="text-2xl font-black text-slate-900">
            ₹{Number(paymentSummary.totalAmount).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Booking #{paymentSummary.bookingNumber}
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
            Total Paid So Far
          </span>
          <div className="text-2xl font-black text-emerald-600">
            ₹{Number(paymentSummary.paidAmount).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified & Reconciled</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
            Remaining Balance
          </span>
          <div className="text-2xl font-black text-slate-900">
            ₹{Number(paymentSummary.balanceAmount).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Status: <strong className={paymentSummary.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"}>{paymentSummary.paymentStatus}</strong>
          </span>
        </div>
      </div>

      {/* Payment Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Receipt className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Transaction History ({paymentSummary.payments.length})
          </h2>
        </div>

        {paymentSummary.payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-semibold">
            No payments have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider">
                  <th className="pb-3">Receipt / Payment Ref</th>
                  <th className="pb-3">Payment Date</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {paymentSummary.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5">
                      <span className="font-bold text-slate-900 block">{p.paymentNumber}</span>
                      {p.receiptNumber && (
                        <span className="text-[10px] text-slate-400 font-medium">Rec: {p.receiptNumber}</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
