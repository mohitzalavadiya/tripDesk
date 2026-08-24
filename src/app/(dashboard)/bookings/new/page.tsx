"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { PageHeader } from "@/components/shared/page-header";
import { useBooking } from "@/context/booking-context";
import { useQuotation } from "@/context/quotation-context";
import { useEnquiry } from "@/context/enquiry-context";
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
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import {
  CalendarCheck,
  Compass,
  FileText,
  User,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Hotel,
  Car,
  Ticket,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function NewBookingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="mt-2 text-xs text-slate-500 font-semibold">Loading booking form...</span>
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
  const quotationId = searchParams.get("quotationId");
  const tripId = searchParams.get("tripId");

  const { createBookingFromQuotation, createManualBooking } = useBooking();
  const { quotations } = useQuotation();
  const { customers, trips } = useEnquiry();

  // Mode: "quotation" | "manual"
  const [mode, setMode] = React.useState<"quotation" | "manual">(
    quotationId ? "quotation" : "quotation"
  );
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string>(
    quotationId || quotations[0]?.id || ""
  );

  const selectedQuotation = React.useMemo(() => {
    return quotations.find((q) => q.id === selectedQuotationId);
  }, [quotations, selectedQuotationId]);

  // Form for manual creation mode
  const formik = useFormik({
    initialValues: {
      customerId: selectedQuotation?.customerId || customers[0]?.id || "",
      tripId: selectedQuotation?.tripId || trips[0]?.id || "",
      title: selectedQuotation?.title || "Kerala Family Holiday",
      destination: selectedQuotation?.tripSnapshot?.destination || "Kerala",
      startDate: selectedQuotation?.tripSnapshot?.startDate || "2026-08-27",
      endDate: selectedQuotation?.tripSnapshot?.endDate || "2026-09-03",
      adults: selectedQuotation?.tripSnapshot?.adults || 2,
      children: selectedQuotation?.tripSnapshot?.children || 0,
      infants: 0,
      totalAmount: selectedQuotation?.sellingPrice || 75000,
      notes: "",
    },
    enableReinitialize: true,
    onSubmit: (values) => {
      if (mode === "quotation" && selectedQuotation) {
        try {
          const newBooking = createBookingFromQuotation(selectedQuotation);
          toast.success(`Booking ${newBooking.bookingNumber} created from quotation!`);
          router.push(`/bookings/${newBooking.id}`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to convert quotation");
        }
      } else {
        const customer = customers.find((c) => c.id === values.customerId);
        const trip = trips.find((t) => t.id === values.tripId);

        try {
          const newBooking = createManualBooking({
            customerId: values.customerId,
            tripId: values.tripId,
            title: values.title,
            destination: values.destination,
            startDate: values.startDate,
            endDate: values.endDate,
            adults: Number(values.adults),
            children: Number(values.children),
            infants: Number(values.infants),
            totalAmount: Number(values.totalAmount),
            customerSnapshot: {
              id: values.customerId,
              name: customer?.name || "Customer",
              phone: customer?.phone || "",
              email: customer?.email || "",
              city: customer?.city || "",
              travellersLabel: `${values.adults} Adults${values.children > 0 ? `, ${values.children} Children` : ""}`,
            },
            tripSnapshot: {
              id: values.tripId,
              title: values.title,
              destination: values.destination,
              startDate: values.startDate,
              endDate: values.endDate,
              durationLabel: "7 Nights / 8 Days",
              nights: 7,
              days: 8,
              adults: Number(values.adults),
              children: Number(values.children),
              infants: Number(values.infants),
            },
            agencySnapshot: {
              name: "TripDesk Travel Studio",
              tagline: "Tailor-Made Luxury & Experiential Journeys",
              phone: "+91 98470 12345",
              email: "holidays@tripdesk.in",
            },
            items: [
              {
                type: "Hotel",
                title: "Primary Hotel Accommodation",
                subtitle: `${values.destination} • 4★`,
                destination: values.destination,
                startDate: values.startDate,
                endDate: values.endDate,
                nights: 3,
                roomType: "Deluxe Room",
                numberOfRooms: 1,
                mealPlan: "CP (Breakfast)",
                status: "Pending",
                supplierCost: Math.round(Number(values.totalAmount) * 0.7),
                customerPrice: Number(values.totalAmount),
              },
            ],
            notes: values.notes,
          });

          toast.success(`Booking ${newBooking.bookingNumber} initialized successfully!`);
          router.push(`/bookings/${newBooking.id}`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to create booking");
        }
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Create New Booking"
          description="Convert an accepted quotation or initialize a direct confirmed travel booking."
          breadcrumbs={[
            { label: "Bookings", href: "/bookings" },
            { label: "New Booking" },
          ]}
        />

        {/* ─── CREATION MODE TOGGLE ────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode("quotation")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === "quotation"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Convert from Quotation (Recommended)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === "manual"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <CalendarCheck className="h-4 w-4" />
              <span>Direct Manual Booking</span>
            </button>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── MAIN COLUMN: DETAILS ─────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">
              {/* MODE 1: QUOTATION SELECTION */}
              {mode === "quotation" ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Select Approved Quotation
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Quotation Proposal <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedQuotationId}
                      onValueChange={(val) => setSelectedQuotationId(val || "")}
                    >
                      <SelectTrigger className="h-10 text-xs font-semibold">
                        <SelectValue placeholder="Select an existing quotation" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {quotations.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.quotationNumber} • {q.title} ({q.customerSnapshot.name}) -{" "}
                            {formatCurrency(q.sellingPrice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quotation Snapshot Preview Card */}
                  {selectedQuotation && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-900">
                          {selectedQuotation.title}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {selectedQuotation.quotationNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer</span>
                          <span className="font-bold text-slate-800">{selectedQuotation.customerSnapshot.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Dates</span>
                          <span className="font-bold text-slate-800">
                            {selectedQuotation.tripSnapshot.startDate} → {selectedQuotation.tripSnapshot.endDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Guests</span>
                          <span className="font-bold text-slate-800">
                            {selectedQuotation.tripSnapshot.adults} Adults
                          </span>
                        </div>
                      </div>

                      {/* Included services count */}
                      <div className="border-t border-slate-200/60 pt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Hotel className="h-3.5 w-3.5 text-indigo-600" />
                          {selectedQuotation.hotelSnapshot?.length || 0} Hotels
                        </span>
                        {selectedQuotation.vehicleSnapshot && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3.5 w-3.5 text-emerald-600" />
                            1 Vehicle
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5 text-amber-600" />
                          {selectedQuotation.activitySnapshot?.length || 0} Activities
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE 2: DIRECT MANUAL FORM */
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <CalendarCheck className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Trip & Customer Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Customer <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formik.values.customerId}
                        onValueChange={(val) => formik.setFieldValue("customerId", val)}
                      >
                        <SelectTrigger className="h-9.5 text-xs font-semibold">
                          <SelectValue placeholder="Select Customer" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Trip Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Trip / Booking Title <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Kerala Family Getaway"
                        {...formik.getFieldProps("title")}
                        className="h-9.5 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Destination */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Destination <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Kerala, Goa, Jaipur"
                        {...formik.getFieldProps("destination")}
                        className="h-9.5 text-xs"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Start Date</label>
                      <Input
                        type="date"
                        {...formik.getFieldProps("startDate")}
                        className="h-9.5 text-xs font-medium"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">End Date</label>
                      <Input
                        type="date"
                        {...formik.getFieldProps("endDate")}
                        className="h-9.5 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Adults */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Adults</label>
                      <Input
                        type="number"
                        min="1"
                        {...formik.getFieldProps("adults")}
                        className="h-9.5 text-xs"
                      />
                    </div>

                    {/* Children */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Children</label>
                      <Input
                        type="number"
                        min="0"
                        {...formik.getFieldProps("children")}
                        className="h-9.5 text-xs"
                      />
                    </div>

                    {/* Total Package Amount */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Total Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        {...formik.getFieldProps("totalAmount")}
                        className="h-9.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Booking Notes</label>
                    <Textarea
                      placeholder="Special requests, flight timings, meal preferences..."
                      rows={3}
                      {...formik.getFieldProps("notes")}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── SIDEBAR: SUMMARY CARD ────────────────────────────────────── */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 sticky top-24">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                  Booking Summary
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-bold text-slate-900">
                      {mode === "quotation"
                        ? selectedQuotation?.customerSnapshot.name || "None"
                        : customers.find((c) => c.id === formik.values.customerId)?.name || "None"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Trip Destination:</span>
                    <span className="font-bold text-slate-900">
                      {mode === "quotation"
                        ? selectedQuotation?.tripSnapshot.destination || "None"
                        : formik.values.destination}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Travel Dates:</span>
                    <span className="font-bold text-slate-900">
                      {mode === "quotation"
                        ? `${selectedQuotation?.tripSnapshot.startDate} → ${selectedQuotation?.tripSnapshot.endDate}`
                        : `${formik.values.startDate} → ${formik.values.endDate}`}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Travellers:</span>
                    <span className="font-bold text-slate-900">
                      {mode === "quotation"
                        ? `${selectedQuotation?.tripSnapshot.adults} Adults`
                        : `${formik.values.adults} Adults`}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">Package Value:</span>
                    <span className="text-lg font-black text-indigo-600">
                      {formatCurrency(
                        mode === "quotation"
                          ? selectedQuotation?.sellingPrice || 0
                          : Number(formik.values.totalAmount) || 0
                      )}
                    </span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                    <span className="font-bold block">Initial Status: Pending Confirmation</span>
                    <p className="text-amber-700/80 text-[10px]">
                      Services (hotels, cabs, activities) will be initialized as Pending and can be individually confirmed.
                    </p>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer"
                  >
                    Create Booking
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/bookings")}
                    className="w-full text-xs font-semibold h-9 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
