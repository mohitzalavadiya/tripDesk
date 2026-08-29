"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, ArrowRight, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "../enquiries/status-badge";
import { RecentEnquiryItem } from "@/lib/services/dashboard-service";

interface RecentEnquiriesTableProps {
  enquiries?: RecentEnquiryItem[];
  loading?: boolean;
}

export function RecentEnquiriesTable({
  enquiries = [],
  loading = false,
}: RecentEnquiriesTableProps) {
  const router = useRouter();

  const formatRupees = (val?: any) => {
    if (!val) return "-";
    const num = Number(val);
    if (isNaN(num)) return "-";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "-";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs">
        <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Recent Enquiries
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of the latest client requests
          </p>
        </div>
        <button
          onClick={() => router.push("/enquiries")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Desktop view (table) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px] font-semibold text-slate-700">Customer</TableHead>
              <TableHead className="font-semibold text-slate-700">Destination</TableHead>
              <TableHead className="font-semibold text-slate-700">Travel Date</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">Budget</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                  No enquiries recorded in the database yet.
                </TableCell>
              </TableRow>
            ) : (
              enquiries.map((enq) => (
                <TableRow
                  key={enq.id}
                  onClick={() => router.push(`/enquiries/${enq.id}`)}
                  className="hover:bg-slate-50/70 cursor-pointer"
                >
                  <TableCell className="font-medium text-slate-900 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{enq.customer?.name || "Client"}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700 truncate max-w-[150px]">
                    {enq.destination}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{formatDate(enq.startDate)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatRupees(enq.budget)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={enq.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/enquiries/${enq.id}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="View Enquiry"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view (cards stack) */}
      <div className="block md:hidden space-y-3">
        {enquiries.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs">
            No enquiries recorded yet.
          </div>
        ) : (
          enquiries.map((enq) => (
            <div
              key={enq.id}
              onClick={() => router.push(`/enquiries/${enq.id}`)}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 space-y-3 hover:border-indigo-200 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">{enq.customer?.name || "Client"}</span>
                </div>
                <StatusBadge status={enq.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-100 py-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Destination</span>
                  <span className="text-slate-800 font-medium truncate block">{enq.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Budget</span>
                  <span className="text-slate-900 font-semibold">{formatRupees(enq.budget)}</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Travel Date</span>
                  <span className="text-slate-600">{formatDate(enq.startDate)}</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Source</span>
                  <span className="text-slate-600 truncate block">{enq.source}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  REF: <span className="font-semibold text-slate-600">{enq.enquiryNumber}</span>
                </span>
                <button
                  onClick={() => router.push(`/enquiries/${enq.id}`)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                >
                  Details
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
