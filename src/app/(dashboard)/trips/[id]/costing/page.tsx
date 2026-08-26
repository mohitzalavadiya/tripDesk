"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  DollarSign,
  Calendar,
  Users,
  Building2,
  Car,
  Ticket,
  Plus,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { quotationClient, TripCostingResult } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function TripCostingDedicatedPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [costing, setCosting] = React.useState<TripCostingResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Fetch real trip costing
  const fetchCosting = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationClient.getTripQuotation(tripId);
      if (res.success && res.data) {
        setCosting(res.data.costing);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load trip costing.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => {
    if (tripId) fetchCosting();
  }, [tripId, fetchCosting]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Calculating trip resource costs...</h3>
      </div>
    );
  }

  if (error || !costing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Trip Costing Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested trip record does not exist or has been archived."}
        </p>
        <Link href={`/trips/${tripId}`} className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Trip
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Trip Costing Engine" />}

        {/* Back Link */}
        <div>
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Trip Workspace ({costing.tripTitle})</span>
          </Link>
        </div>

        {/* Hero Command Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md">
                  {costing.tripNumber} · FINANCIAL COSTING ENGINE
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Supplier Cost Aggregation Sheet
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {costing.customer.name} ({costing.travelersCount} Pax)
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  {costing.hotels.length} Stays • {costing.vehicles.length} Vehicles • {costing.activities.length} Tours
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => router.push(`/trips/${tripId}/quotation`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                Go to Quotation Proposal
              </Button>
            </div>
          </div>

          {/* Top Stat Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Accommodation Cost</span>
              <strong className="text-lg text-slate-900 block">{formatCurrency(costing.hotelsTotal)}</strong>
              <span className="text-[11px] text-slate-500">{costing.hotels.length} reservations</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Transportation Cost</span>
              <strong className="text-lg text-slate-900 block">{formatCurrency(costing.vehiclesTotal)}</strong>
              <span className="text-[11px] text-slate-500">{costing.vehicles.length} vehicle assignments</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Activities & Tours</span>
              <strong className="text-lg text-slate-900 block">{formatCurrency(costing.activitiesTotal)}</strong>
              <span className="text-[11px] text-slate-500">{costing.activities.length} excursion passes</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-700">Total Supplier Outlay</span>
              <strong className="text-xl text-indigo-900 block font-black">{formatCurrency(costing.subtotal)}</strong>
              <span className="text-[11px] text-indigo-600">Base Net Payable</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Tables */}
        <div className="space-y-6">
          {/* Hotel Stays */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Hotel Stays ({costing.hotels.length})</span>
              </h3>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(costing.hotelsTotal)}</span>
            </div>

            {costing.hotels.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 italic">No hotels attached to this trip yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Property & Room</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Check-in / Check-out</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Rooms & Nights</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Nightly Rate</TableHead>
                      <TableHead className="py-2.5 px-4 text-right font-bold text-slate-600">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costing.hotels.map((h) => (
                      <TableRow key={h.id} className="border-b border-slate-100 text-xs hover:bg-slate-50/50">
                        <TableCell className="py-3 px-4 font-semibold text-slate-900">
                          {h.hotelName} <span className="font-normal text-slate-500">({h.roomType})</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {new Date(h.checkIn).toLocaleDateString("en-IN")} → {new Date(h.checkOut).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {h.rooms} Room(s) • {h.nights} Night(s)
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {formatCurrency(h.nightlyRate)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(h.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Vehicles */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Car className="h-4 w-4 text-emerald-600" />
                <span>Transportation & Fleet ({costing.vehicles.length})</span>
              </h3>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(costing.vehiclesTotal)}</span>
            </div>

            {costing.vehicles.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 italic">No vehicles attached to this trip yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Vehicle Model</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Type</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Pricing Model</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Rate / Distance</TableHead>
                      <TableHead className="py-2.5 px-4 text-right font-bold text-slate-600">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costing.vehicles.map((v) => (
                      <TableRow key={v.id} className="border-b border-slate-100 text-xs hover:bg-slate-50/50">
                        <TableCell className="py-3 px-4 font-semibold text-slate-900">
                          {v.vehicleName}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {v.vehicleType}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {v.pricingType}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {v.pricingType === "PER_KM" ? `₹${v.ratePerKm}/km (${v.estimatedKm} km)` : "Flat Tariff"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(v.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Ticket className="h-4 w-4 text-purple-600" />
                <span>Activities & Excursions ({costing.activities.length})</span>
              </h3>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(costing.activitiesTotal)}</span>
            </div>

            {costing.activities.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 italic">No activities attached to this trip yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Activity Name</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Category</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Participants</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-slate-600">Unit Price</TableHead>
                      <TableHead className="py-2.5 px-4 text-right font-bold text-slate-600">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costing.activities.map((a) => (
                      <TableRow key={a.id} className="border-b border-slate-100 text-xs hover:bg-slate-50/50">
                        <TableCell className="py-3 px-4 font-semibold text-slate-900">
                          {a.activityName}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {a.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {a.numberOfParticipants} Pax
                        </TableCell>
                        <TableCell className="py-3 px-4 text-slate-700">
                          {a.adultPrice > 0 ? formatCurrency(a.adultPrice) : "-"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(a.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
