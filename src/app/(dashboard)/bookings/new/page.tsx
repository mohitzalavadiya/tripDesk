"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  tripClient,
  customerClient,
  quotationClient,
  bookingClient,
  TripWithRelations,
  QuotationWithRelations,
} from "@/lib/api-client";
import { Customer, BookingStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import {
  CalendarCheck,
  Compass,
  FileText,
  User,
  Calendar,
  Users,
  IndianRupee,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function NewBookingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
          <span className="text-xs text-slate-500 font-semibold">Loading booking workspace...</span>
        </div>
      }
    >
      <NewBookingForm />
    </React.Suspense>
  );
}

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuotationId = searchParams.get("quotationId");
  const initialTripId = searchParams.get("tripId");

  // Mode: "quotation" | "trip"
  const [mode, setMode] = React.useState<"quotation" | "trip">(
    initialQuotationId ? "quotation" : "quotation"
  );

  // Data sources from real PostgreSQL API
  const [quotations, setQuotations] = React.useState<QuotationWithRelations[]>([]);
  const [trips, setTrips] = React.useState<TripWithRelations[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Form State
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string>(initialQuotationId || "");
  const [selectedTripId, setSelectedTripId] = React.useState<string>(initialTripId || "");
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [bookingTotal, setBookingTotal] = React.useState<string>("0");
  const [initialAdvance, setInitialAdvance] = React.useState<string>("0");
  const [bookingNotes, setBookingNotes] = React.useState("");
  const [bookingInternalNotes, setBookingInternalNotes] = React.useState("");

  // Load real active quotations, trips, customers
  React.useEffect(() => {
    async function loadResources() {
      try {
        setLoadingData(true);
        const [quotesRes, tripsRes, custRes] = await Promise.all([
          quotationClient.getQuotations({ limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
          tripClient.getTrips({ limit: 100 }),
          customerClient.getCustomers({ limit: 100 }),
        ]);

        if (quotesRes.success && quotesRes.data) {
          setQuotations(quotesRes.data);
          if (!initialQuotationId && quotesRes.data.length > 0) {
            setSelectedQuotationId(quotesRes.data[0].id);
            setBookingTotal(String(quotesRes.data[0].finalAmount));
          } else if (initialQuotationId) {
            const found = quotesRes.data.find((q) => q.id === initialQuotationId);
            if (found) setBookingTotal(String(found.finalAmount));
          }
        }

        if (tripsRes.success && tripsRes.data) {
          setTrips(tripsRes.data);
          if (!initialTripId && tripsRes.data.length > 0) {
            setSelectedTripId(tripsRes.data[0].id);
            setSelectedCustomerId(tripsRes.data[0].customerId);
          }
        }

        if (custRes.success && custRes.data) {
          setCustomers(custRes.data);
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
      } finally {
        setLoadingData(false);
      }
    }
    loadResources();
  }, [initialQuotationId, initialTripId]);

  // When quotation changes in quotation mode
  const selectedQuotation = React.useMemo(() => {
    return quotations.find((q) => q.id === selectedQuotationId);
  }, [quotations, selectedQuotationId]);

  React.useEffect(() => {
    if (mode === "quotation" && selectedQuotation) {
      setBookingTotal(String(selectedQuotation.finalAmount));
    }
  }, [mode, selectedQuotation]);

  // When trip changes in trip mode
  const selectedTrip = React.useMemo(() => {
    return trips.find((t) => t.id === selectedTripId);
  }, [trips, selectedTripId]);

  React.useEffect(() => {
    if (mode === "trip" && selectedTrip) {
      setSelectedCustomerId(selectedTrip.customerId);
    }
  }, [mode, selectedTrip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "quotation") {
        if (!selectedQuotationId) {
          toast.error("Please select a quotation proposal.");
          return;
        }

        const res = await bookingClient.convertQuotationToBooking(selectedQuotationId, {
          notes: bookingNotes.trim() || undefined,
          internalNotes: bookingInternalNotes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Booking ${res.data.bookingNumber} created successfully!`);
          router.push(`/bookings/${res.data.id}`);
        }
      } else {
        if (!selectedTripId) {
          toast.error("Please select a trip.");
          return;
        }
        if (!selectedCustomerId) {
          toast.error("Please select a customer.");
          return;
        }

        const total = Number(bookingTotal) || 0;
        const advance = Number(initialAdvance) || 0;

        const res = await bookingClient.createBooking({
          tripId: selectedTripId,
          customerId: selectedCustomerId,
          totalAmount: total,
          paidAmount: advance,
          notes: bookingNotes.trim() || undefined,
          internalNotes: bookingInternalNotes.trim() || undefined,
        });

        if (res.success && res.data) {
          toast.success(`Booking ${res.data.bookingNumber} created successfully!`);
          router.push(`/bookings/${res.data.id}`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Bookings & Reservations" />}

        <PageHeader
          title="Create New Booking"
          description="Convert an accepted quotation proposal into a confirmed booking or initialize a direct trip reservation."
          breadcrumbs={[
            { label: "Bookings", href: "/bookings" },
            { label: "New Booking" },
          ]}
        />

        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Booking Source Type</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("quotation")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === "quotation"
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>From Quotation Proposal</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Inherits accepted pricing, itinerary, travelers, and quotation snapshots.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("trip")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === "trip"
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-emerald-600" />
                    <span>Direct Trip Workspace</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select a trip workspace and specify custom commercial contract amounts.
                  </p>
                </button>
              </div>
            </div>

            {/* Source Configuration */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                {mode === "quotation" ? "Select Client Proposal" : "Select Trip & Customer"}
              </h3>

              {loadingData ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500">Loading resources from database...</p>
                </div>
              ) : mode === "quotation" ? (
                <div className="space-y-4 text-xs">
                  {quotations.length === 0 ? (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs">
                      No quotation proposals found. Please generate a proposal from a trip first.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Quotation Proposal *</label>
                      <Select
                        value={selectedQuotationId}
                        onValueChange={(val) => val && setSelectedQuotationId(val)}
                      >
                        <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200">
                          <SelectValue placeholder="Choose a proposal..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {quotations.map((q) => (
                            <SelectItem key={q.id} value={q.id} className="text-xs">
                              {q.quotationNumber} — {q.trip?.title} ({q.customer?.name}) • {formatCurrency(Number(q.finalAmount))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedQuotation && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Customer:</span>
                        <strong className="text-slate-900">{selectedQuotation.customer?.name} ({selectedQuotation.customer?.phone})</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Proposal Final Amount:</span>
                        <strong className="text-indigo-600 font-extrabold text-sm">{formatCurrency(Number(selectedQuotation.finalAmount))}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Trip Workspace *</label>
                    <Select
                      value={selectedTripId}
                      onValueChange={(val) => val && setSelectedTripId(val)}
                    >
                      <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue placeholder="Choose a trip..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {trips.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.tripNumber} — {t.title} ({t.customer?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Total Contract Value (₹) *</label>
                      <Input
                        type="number"
                        min={0}
                        value={bookingTotal}
                        onChange={(e) => setBookingTotal(e.target.value)}
                        className="h-9.5 bg-slate-50/50 border-slate-200 text-xs font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Initial Advance Paid (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={initialAdvance}
                        onChange={(e) => setInitialAdvance(e.target.value)}
                        placeholder="0"
                        className="h-9.5 bg-slate-50/50 border-slate-200 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Booking Remarks & Internal Notes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Customer Remarks</label>
                  <Textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Notes visible on customer booking confirmation..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Agency Notes</label>
                  <Textarea
                    value={bookingInternalNotes}
                    onChange={(e) => setBookingInternalNotes(e.target.value)}
                    placeholder="Private staff instructions or operational requirements..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/bookings")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || isReadOnly || (mode === "quotation" && quotations.length === 0)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-4 w-4" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
