"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useFormik } from "formik";
import { useEnquiry } from "@/context/enquiry-context";
import { useBooking } from "@/context/booking-context";
import { useExperience } from "@/context/experience-context";
import {
  ContactMethod,
  CustomerLifecycleStatus,
  CustomerPreference,
} from "@/types";
import { customerSchema } from "@/lib/validation-schemas";
import { formatCurrency } from "@/lib/costing-engine";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Compass,
  CreditCard,
  Heart,
  Star,
  Gift,
  MessageSquare,
  FileText,
  Edit2,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Award,
  Clock,
  ShieldCheck,
  Share2,
  ChevronRight,
  Cake,
  AlertTriangle,
  Hotel,
  Car,
  Ticket,
} from "lucide-react";

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    customers,
    trips,
    customerNotes,
    updateCustomer,
    addCustomerNote,
    updateCustomerNote,
    deleteCustomerNote,
  } = useEnquiry();

  const { bookings } = useBooking();
  const {
    getCustomer360,
    updateCustomerPreferences,
    updateCustomerLifecycle,
    addCustomerEvent,
    deleteCustomerEvent,
    createReferralCode,
    trackReferral,
  } = useExperience();

  // Find customer
  const customer = customers.find((c) => c.id === id);

  // Active tab state
  const [activeTab, setActiveTab] = React.useState<
    | "overview"
    | "trips"
    | "bookings"
    | "preferences"
    | "feedback"
    | "reviews"
    | "referrals"
    | "communication"
    | "notes"
  >("overview");

  // Edit Customer Modal State
  const [isEditing, setIsEditing] = React.useState(false);

  // New Note State
  const [newNoteContent, setNewNoteContent] = React.useState("");
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = React.useState("");

  // New Event State
  const [isAddingEvent, setIsAddingEvent] = React.useState(false);
  const [eventType, setEventType] = React.useState<"Birthday" | "Anniversary" | "Milestone">("Birthday");
  const [eventDate, setEventDate] = React.useState("");
  const [eventNotes, setEventNotes] = React.useState("");

  // New Referral State
  const [isAddingReferral, setIsAddingReferral] = React.useState(false);
  const [refFriendName, setRefFriendName] = React.useState("");
  const [refFriendPhone, setRefFriendPhone] = React.useState("");
  const [refNotes, setRefNotes] = React.useState("");

  // Preferences Form State
  const [prefDestinations, setPrefDestinations] = React.useState("");
  const [prefTravelStyle, setPrefTravelStyle] = React.useState<string>("Family");
  const [prefHotelCategory, setPrefHotelCategory] = React.useState<string>("4 Star");
  const [prefVehicle, setPrefVehicle] = React.useState<string>("Force Urbania");
  const [prefActivities, setPrefActivities] = React.useState("");
  const [prefMeal, setPrefMeal] = React.useState<string>("Vegetarian");
  const [prefBudget, setPrefBudget] = React.useState("₹60,000 - ₹1,00,000");
  const [prefGroupSize, setPrefGroupSize] = React.useState("4 Adults + 1 Child");
  const [prefNotes, setPrefNotes] = React.useState("");

  // Copied referral link state
  const [copiedLink, setCopiedLink] = React.useState(false);

  // 360 Degree Data
  const c360 = React.useMemo(() => {
    if (!customer) return null;
    return getCustomer360(customer.id);
  }, [customer, getCustomer360]);

  // Sync preferences state when customer changes
  React.useEffect(() => {
    if (c360?.preferences) {
      setPrefDestinations(c360.preferences.preferredDestinations?.join(", ") || "");
      setPrefTravelStyle(c360.preferences.travelStyle || "Family");
      setPrefHotelCategory(c360.preferences.preferredHotelCategory || "4 Star");
      setPrefVehicle(c360.preferences.preferredVehicle || "Force Urbania");
      setPrefActivities(c360.preferences.preferredActivities?.join(", ") || "");
      setPrefMeal(c360.preferences.mealPreference || "Vegetarian");
      setPrefBudget(c360.preferences.budgetRange || "₹60,000 - ₹1,00,000");
      setPrefGroupSize(c360.preferences.typicalGroupSize || "4 Adults");
      setPrefNotes(c360.preferences.notes || "");
    }
  }, [c360?.preferences]);

  // Formik for Customer Edit Form
  const editFormik = useFormik({
    initialValues: {
      name: customer?.name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      city: customer?.city || "",
      preferredContact: customer?.preferredContactMethod || "WhatsApp",
    },
    validationSchema: customerSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (!customer) return;

      updateCustomer(customer.id, {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim() || undefined,
        city: values.city.trim() || undefined,
        preferredContactMethod: values.preferredContact as ContactMethod,
      });

      toast.success("Customer profile updated successfully.");
      setIsEditing(false);
    },
  });

  if (!customer || !c360) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <User className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Customer not found</h3>
        <Link href="/customers" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  // Customer Notes list
  const notesList = customerNotes.filter((n) => n.customerId === customer.id);

  // Customer Trips
  const customerTrips = trips.filter((t) => t.customerId === customer.id);

  // Customer Bookings
  const customerBookings = bookings.filter((b) => b.customerId === customer.id);

  // Referrals
  const referralCode = createReferralCode(customer.id);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const destArray = prefDestinations
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const actArray = prefActivities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    updateCustomerPreferences(customer.id, {
      preferredDestinations: destArray,
      travelStyle: prefTravelStyle as any,
      preferredHotelCategory: prefHotelCategory as any,
      preferredVehicle: prefVehicle as any,
      preferredActivities: actArray,
      mealPreference: prefMeal as any,
      budgetRange: prefBudget.trim(),
      typicalGroupSize: prefGroupSize.trim(),
      notes: prefNotes.trim(),
    });

    toast.success("Travel preferences saved successfully!");
  };

  const handleAddNote = () => {
    const trimmed = newNoteContent.trim();
    if (!trimmed) return;
    addCustomerNote(customer.id, trimmed);
    setNewNoteContent("");
    toast.success("Internal note added.");
  };

  const handleSaveEditNote = (noteId: string) => {
    const trimmed = editingNoteContent.trim();
    if (!trimmed) return;
    updateCustomerNote(noteId, trimmed);
    setEditingNoteId(null);
    setEditingNoteContent("");
    toast.success("Note updated.");
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm("Are you sure you want to delete this internal note?")) {
      deleteCustomerNote(noteId);
      toast.success("Note deleted.");
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate.trim()) return;
    addCustomerEvent(customer.id, eventType, eventDate, eventNotes);
    setIsAddingEvent(false);
    setEventDate("");
    setEventNotes("");
    toast.success("Customer event milestone added!");
  };

  const handleAddReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refFriendName.trim() || !refFriendPhone.trim()) return;
    trackReferral(customer.id, refFriendName, refFriendPhone, refNotes);
    setIsAddingReferral(false);
    setRefFriendName("");
    setRefFriendPhone("");
    setRefNotes("");
    toast.success(`Referral created for ${refFriendName}! Code: ${referralCode}`);
  };

  const handleCopyReferralLink = () => {
    const url = `${window.location.origin}/trip/referral?code=${referralCode}&ref=${customer.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Referral invitation link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBookSimilarTrip = (tripId?: string) => {
    const targetTrip = tripId ? trips.find((t) => t.id === tripId) : customerTrips[0];
    if (targetTrip) {
      router.push(`/trips/new?customerId=${customer.id}&similarTripId=${targetTrip.id}`);
    } else {
      router.push(`/trips/new?customerId=${customer.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* ─── TOP COMMAND 360 HEADER ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Link
                  href="/customers"
                  className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Customers
                </Link>
                <span>/</span>
                <span className="font-mono text-slate-700">Customer 360° Profile</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {customer.name}
                </h1>

                {/* Lifecycle Status Badge with quick dropdown */}
                <Select
                  value={c360.lifecycleStatus}
                  onValueChange={(val) =>
                    updateCustomerLifecycle(customer.id, (val || "New Customer") as CustomerLifecycleStatus)
                  }
                >
                  <SelectTrigger className="h-7.5 text-xs font-bold w-40 bg-indigo-50/70 border-indigo-200 text-indigo-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="New Customer">New Customer</SelectItem>
                    <SelectItem value="Quoted">Quoted</SelectItem>
                    <SelectItem value="Booked">Booked</SelectItem>
                    <SelectItem value="Traveling">Traveling</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Repeat Customer">Repeat Customer 🌟</SelectItem>
                    <SelectItem value="VIP">VIP Customer 👑</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Loyalty Tier Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${c360.loyalty.badgeColor}`}
                >
                  <Award className="h-3.5 w-3.5" />
                  {c360.loyalty.tier} Member ({c360.loyalty.tierDiscountPercentage}% Off)
                </span>
              </div>

              {/* Contact meta */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {customer.email}
                  </span>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {customer.city}
                  </span>
                )}
                <span className="text-slate-400">•</span>
                <span>Customer Since: <strong>2026</strong></span>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
              <Button
                size="sm"
                onClick={() => handleBookSimilarTrip()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-xs"
              >
                <Compass className="h-3.5 w-3.5 mr-1.5" />
                Book Similar Trip
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/trips/new?customerId=${customer.id}`)}
                className="text-xs font-semibold h-9 px-3.5 rounded-xl cursor-pointer bg-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Trip
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReferralLink}
                className="text-xs font-semibold h-9 px-3.5 rounded-xl cursor-pointer bg-white"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                    Referral Link
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-semibold h-9 px-3.5 rounded-xl cursor-pointer bg-white"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Edit
              </Button>
            </div>
          </div>

          {/* Quick Edit Customer Bar if toggled */}
          {isEditing && (
            <form
              onSubmit={editFormik.handleSubmit}
              className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end animate-in fade-in-0"
            >
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Full Name</label>
                <Input {...editFormik.getFieldProps("name")} className="h-8.5 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Phone</label>
                <Input {...editFormik.getFieldProps("phone")} className="h-8.5 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Email</label>
                <Input {...editFormik.getFieldProps("email")} className="h-8.5 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl cursor-pointer"
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-8.5 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ─── 5 CUSTOMER 360 METRIC SUMMARY CARDS ────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Trips */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Trips</span>
              <Compass className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{c360.totalTrips}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {c360.completedTrips} Completed • {c360.upcomingTrips} Upcoming
            </p>
          </div>

          {/* 2. Lifetime Value */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Value (LTV)</span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(c360.lifetimeValue)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Avg: {formatCurrency(c360.averageTripValue)} / trip
            </p>
          </div>

          {/* 3. Average Rating */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average Rating</span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {c360.averageRating} ⭐
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {c360.feedbacks.length} Feedback Submitted
            </p>
          </div>

          {/* 4. Referrals & Rewards */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Referrals & Rewards</span>
              <Gift className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 tracking-tight">
              {c360.referralCount} Friends
            </p>
            <p className="text-[11px] text-purple-600 font-bold">
              {formatCurrency(c360.availableRewards)} Credit Available
            </p>
          </div>

          {/* 5. Loyalty Tier Progress */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Loyalty Progress</span>
              <Award className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-black text-blue-700 tracking-tight">
              {c360.loyalty.tier}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {c360.loyalty.nextTier
                ? `${c360.loyalty.tripsToNextTier} more to ${c360.loyalty.nextTier}`
                : "Top Tier Achieved!"}
            </p>
          </div>
        </div>

        {/* ─── 9 CUSTOMER PROFILE TABS ───────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px no-scrollbar">
          {[
            { id: "overview", label: "Overview" },
            { id: "trips", label: `Trips (${c360.totalTrips})` },
            { id: "bookings", label: `Bookings (${customerBookings.length})` },
            { id: "preferences", label: "Travel Preferences" },
            { id: "feedback", label: `Feedback (${c360.feedbacks.length})` },
            { id: "reviews", label: `Reviews (${c360.reviews.length})` },
            { id: "referrals", label: `Referrals (${c360.referrals.length})` },
            { id: "communication", label: `Communication (${c360.communications.length})` },
            { id: "notes", label: `Notes (${notesList.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in-0">
            {/* Left 7 Cols: Loyalty Tier Card & Preferences Preview */}
            <div className="lg:col-span-7 space-y-6">
              {/* Loyalty Tier Progress Card */}
              <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      {c360.loyalty.tier} Loyalty Club
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {c360.loyalty.completedTrips} Completed Tours
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Tier Progress</span>
                    <span>
                      {c360.loyalty.nextTier
                        ? `${c360.loyalty.completedTrips} / ${
                            c360.loyalty.completedTrips + c360.loyalty.tripsToNextTier
                          } Trips`
                        : "Maximum Platinum Tier"}
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (c360.loyalty.completedTrips /
                            (c360.loyalty.completedTrips +
                              (c360.loyalty.tripsToNextTier || 1))) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  {c360.loyalty.nextTier && (
                    <p className="text-[11px] text-slate-300">
                      {c360.loyalty.tripsToNextTier} more completed booking(s) to unlock{" "}
                      <strong>{c360.loyalty.nextTier}</strong> (VIP upgrades & 10% discount).
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Member Discount
                    </span>
                    <span className="font-bold text-white">
                      {c360.loyalty.tierDiscountPercentage}% Off All Packages
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Available Travel Credits
                    </span>
                    <span className="font-bold text-amber-300">
                      {formatCurrency(c360.availableRewards)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preferences Quick Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Travel Preferences Snapshot
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("preferences")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Edit Preferences →
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Preferred Style
                    </span>
                    <span className="font-bold text-slate-800">
                      {c360.preferences?.travelStyle || "Family"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Hotel Category
                    </span>
                    <span className="font-bold text-slate-800">
                      {c360.preferences?.preferredHotelCategory || "4 Star"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Preferred Vehicle
                    </span>
                    <span className="font-bold text-slate-800">
                      {c360.preferences?.preferredVehicle || "Force Urbania"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Meal Plan
                    </span>
                    <span className="font-bold text-slate-800">
                      {c360.preferences?.mealPreference || "Vegetarian"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Favorite Destinations
                    </span>
                    <span className="font-bold text-indigo-600">
                      {c360.preferences?.preferredDestinations?.join(", ") ||
                        "Kerala, Goa, Kashmir"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Private Identification Document (Strictly Agency-Only) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Customer ID Document (Private — Agency Only)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 uppercase">
                    Restricted
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-16 w-24 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                    <User className="h-8 w-8 text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">
                      Government ID / Passport on File
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Stored securely for travel flight bookings, permits, and hotel verification. <strong>Never exposed</strong> in public quotation links or customer trip portals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Upcoming Events & Referral Code Card */}
            <div className="lg:col-span-5 space-y-6">
              {/* Customer Milestones / Events */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Customer Events & Anniversaries
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingEvent(!isAddingEvent)}
                    className="h-7 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Event
                  </Button>
                </div>

                {isAddingEvent && (
                  <form
                    onSubmit={handleAddEvent}
                    className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-xs animate-in fade-in-0"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={eventType}
                        onValueChange={(v) => setEventType((v || "Birthday") as any)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="Birthday">🎂 Birthday</SelectItem>
                          <SelectItem value="Anniversary">💍 Anniversary</SelectItem>
                          <SelectItem value="Milestone">🌟 Tour Milestone</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="e.g. 12 September"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <Input
                      placeholder="Notes (e.g. 10th anniversary discount voucher)"
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingEvent(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-indigo-600 text-white font-bold h-7 text-xs px-3"
                      >
                        Save Event
                      </Button>
                    </div>
                  </form>
                )}

                {c360.events.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No milestone events recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {c360.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/60 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">
                            {evt.type === "Birthday" ? "🎂" : "💍"} {evt.type} • {evt.date}
                          </span>
                          {evt.notes && <p className="text-[11px] text-slate-500">{evt.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCustomerEvent(evt.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referral Code Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Referral Code & Link
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    Give ₹500 • Get ₹500
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Customer Unique Code
                    </span>
                    <span className="font-mono font-black text-sm text-purple-900">
                      {referralCode}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyReferralLink}
                    className="h-8 text-xs font-bold bg-white text-purple-700 border-purple-200 cursor-pointer"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TRIPS HISTORY ───────────────────────────────────────── */}
        {activeTab === "trips" && (
          <div className="space-y-4 animate-in fade-in-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Customer Travel History ({customerTrips.length})
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/trips/new?customerId=${customer.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3.5 rounded-xl cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Plan New Trip
              </Button>
            </div>

            {customerTrips.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No trips recorded for this customer yet.
              </div>
            ) : (
              <div className="space-y-3">
                {customerTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{trip.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              trip.status === "Completed"
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : trip.status === "In Progress"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {trip.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {trip.startDate} → {trip.endDate} • {trip.adults} Adults
                          {trip.children > 0 ? `, ${trip.children} Children` : ""} ({trip.destination})
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900 font-mono pr-2">
                          {formatCurrency(trip.budget || 65000)}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/trips/${trip.id}`)}
                          className="h-8 text-xs font-semibold cursor-pointer bg-white"
                        >
                          View Trip
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleBookSimilarTrip(trip.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                        >
                          Book Similar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: BOOKINGS ────────────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div className="space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Confirmed Booking Records ({customerBookings.length})
            </h3>

            {customerBookings.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No confirmed bookings recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {customerBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {b.bookingNumber}
                        </span>
                        <h4 className="font-bold text-slate-900">{b.title}</h4>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {b.status}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        {b.startDate} → {b.endDate} • {b.items.length} Inclusions
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Total Amount
                        </span>
                        <span className="font-black text-sm text-slate-900">
                          {formatCurrency(b.totalAmount)}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/bookings/${b.id}`)}
                        className="h-8 text-xs font-bold cursor-pointer bg-white"
                      >
                        Open Booking
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: PREFERENCES ─────────────────────────────────────────── */}
        {activeTab === "preferences" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5 animate-in fade-in-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Detailed Travel Preferences
                </h3>
                <p className="text-xs text-slate-500">
                  Used by consultants to automatically tailor repeat itineraries and quotations.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Preferred Destinations (Comma-separated)
                  </label>
                  <Input
                    placeholder="e.g. Kerala, Goa, Kashmir, Himachal"
                    value={prefDestinations}
                    onChange={(e) => setPrefDestinations(e.target.value)}
                    className="h-9.5 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Travel Style</label>
                  <Select value={prefTravelStyle} onValueChange={(val) => setPrefTravelStyle(val || "Family")}>
                    <SelectTrigger className="h-9.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Family">Family Holiday</SelectItem>
                      <SelectItem value="Honeymoon">Romantic / Honeymoon</SelectItem>
                      <SelectItem value="Luxury">Ultra Luxury & Heritage</SelectItem>
                      <SelectItem value="Friends">Friends Group</SelectItem>
                      <SelectItem value="Solo">Solo Traveler</SelectItem>
                      <SelectItem value="Adventure">Adventure & Trekking</SelectItem>
                      <SelectItem value="Corporate">Corporate Retreat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Preferred Hotel Category
                  </label>
                  <Select value={prefHotelCategory} onValueChange={(val) => setPrefHotelCategory(val || "4 Star")}>
                    <SelectTrigger className="h-9.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="3 Star">3 Star Premium</SelectItem>
                      <SelectItem value="4 Star">4 Star Deluxe</SelectItem>
                      <SelectItem value="5 Star">5 Star Luxury Resort</SelectItem>
                      <SelectItem value="Heritage">Heritage Palace / Boutique</SelectItem>
                      <SelectItem value="Homestay">Authentic Homestay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Preferred Vehicle</label>
                  <Select value={prefVehicle} onValueChange={(val) => setPrefVehicle(val || "Force Urbania")}>
                    <SelectTrigger className="h-9.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Sedan">Sedan (Dzire / Etios)</SelectItem>
                      <SelectItem value="SUV">SUV (Innova Crysta)</SelectItem>
                      <SelectItem value="Innova Crysta">Innova Crysta Luxury</SelectItem>
                      <SelectItem value="Force Urbania">Force Urbania 10-12 Seater</SelectItem>
                      <SelectItem value="Tempo Traveller">Tempo Traveller 17-Seater</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Preferred Activities & Interests
                  </label>
                  <Input
                    placeholder="e.g. Nature, Wildlife, Beaches, Houseboat, Spa"
                    value={prefActivities}
                    onChange={(e) => setPrefActivities(e.target.value)}
                    className="h-9.5 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Meal Preference</label>
                  <Select value={prefMeal} onValueChange={(val) => setPrefMeal(val || "Vegetarian")}>
                    <SelectTrigger className="h-9.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Vegetarian">Pure Vegetarian</SelectItem>
                      <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                      <SelectItem value="Jain">Jain Food</SelectItem>
                      <SelectItem value="Vegan">Vegan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Typical Budget Range</label>
                  <Input
                    placeholder="e.g. ₹60,000 - ₹1,20,000"
                    value={prefBudget}
                    onChange={(e) => setPrefBudget(e.target.value)}
                    className="h-9.5 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Typical Group Size</label>
                  <Input
                    placeholder="e.g. 4 Adults + 1 Child"
                    value={prefGroupSize}
                    onChange={(e) => setPrefGroupSize(e.target.value)}
                    className="h-9.5 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Special Travel Notes</label>
                <Textarea
                  placeholder="e.g. Prefers beachside properties, ground floor rooms for elderly parents..."
                  value={prefNotes}
                  onChange={(e) => setPrefNotes(e.target.value)}
                  rows={3}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer"
                >
                  Save Travel Preferences
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 5: FEEDBACK ────────────────────────────────────────────── */}
        {activeTab === "feedback" && (
          <div className="space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Post-Trip Experience Feedback ({c360.feedbacks.length})
            </h3>

            {c360.feedbacks.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No feedback received from this customer yet. Feedback requests are sent automatically upon trip completion.
              </div>
            ) : (
              <div className="space-y-3">
                {c360.feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{fb.tripTitle}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {fb.bookingNumber} • {fb.createdAt.split("T")[0]}
                        </span>
                      </div>
                      <span className="font-black text-amber-600 text-sm bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                        {fb.overallRating} / 5 Stars ⭐
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Hotels</span>
                        <span className="font-bold text-slate-800">{fb.hotelRating || 5} ⭐</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Vehicle</span>
                        <span className="font-bold text-slate-800">{fb.vehicleRating || 5} ⭐</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Driver</span>
                        <span className="font-bold text-slate-800">{fb.driverRating || 5} ⭐</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Activities</span>
                        <span className="font-bold text-slate-800">{fb.activityRating || 5} ⭐</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Support</span>
                        <span className="font-bold text-slate-800">{fb.supportRating || 5} ⭐</span>
                      </div>
                    </div>

                    {fb.positiveComment && (
                      <p className="text-slate-700 italic">
                        <strong>What they enjoyed:</strong> &quot;{fb.positiveComment}&quot;
                      </p>
                    )}

                    {fb.improvementComment && (
                      <p className="text-slate-600">
                        <strong>Suggested improvements:</strong> &quot;{fb.improvementComment}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                      <span>Travel Again Intention: <strong>{fb.travelAgain || "Yes"}</strong></span>
                      {fb.serviceRecoveryStatus && fb.serviceRecoveryStatus !== "Not Needed" && (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Service Recovery: {fb.serviceRecoveryStatus}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: REVIEWS ─────────────────────────────────────────────── */}
        {activeTab === "reviews" && (
          <div className="space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Public Reviews & Testimonials ({c360.reviews.length})
            </h3>

            {c360.reviews.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No public reviews recorded yet. Send Google Review link after a 5-star tour!
              </div>
            ) : (
              <div className="space-y-3">
                {c360.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                          {rev.platform}
                        </span>
                        <span className="font-bold text-slate-900">{rev.rating} / 5 Stars ⭐</span>
                      </div>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Verified & Published
                      </span>
                    </div>

                    <p className="text-slate-700 italic leading-relaxed pt-1">
                      &quot;{rev.comment}&quot;
                    </p>

                    <span className="text-[10px] text-slate-400 block pt-1">
                      Published: {rev.createdAt.split("T")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 7: REFERRALS ───────────────────────────────────────────── */}
        {activeTab === "referrals" && (
          <div className="space-y-4 animate-in fade-in-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Referred Friends & Reward Attribution ({c360.referrals.length})
              </h3>
              <Button
                size="sm"
                onClick={() => setIsAddingReferral(!isAddingReferral)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-3.5 rounded-xl cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Track Referral
              </Button>
            </div>

            {isAddingReferral && (
              <form
                onSubmit={handleAddReferral}
                className="bg-white border border-purple-200 rounded-2xl p-5 space-y-3 text-xs animate-in fade-in-0"
              >
                <h4 className="font-bold text-purple-900">Record a Friend Referral</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Friend's Full Name"
                    value={refFriendName}
                    onChange={(e) => setRefFriendName(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                  <Input
                    placeholder="Friend's Phone Number"
                    value={refFriendPhone}
                    onChange={(e) => setRefFriendPhone(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                  <Input
                    placeholder="Tour Interest / Notes"
                    value={refNotes}
                    onChange={(e) => setRefNotes(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingReferral(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-purple-600 text-white font-bold h-8 text-xs px-4"
                  >
                    Save Referral
                  </Button>
                </div>
              </form>
            )}

            {c360.referrals.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-400">
                No referral activity recorded yet for code {referralCode}.
              </div>
            ) : (
              <div className="space-y-3">
                {c360.referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{ref.referredName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({ref.referredPhone})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            ref.status === "Completed" || ref.status === "Rewarded"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : ref.status === "Booked"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {ref.status}
                        </span>
                      </div>
                      {ref.notes && <p className="text-[11px] text-slate-500">{ref.notes}</p>}
                    </div>

                    <div className="flex items-center gap-4">
                      {ref.tripValue && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Trip Value
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(ref.tripValue)}
                          </span>
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-[10px] text-purple-600 uppercase font-bold block">
                          Reward Earned
                        </span>
                        <span className="font-bold text-purple-700">
                          {formatCurrency(ref.rewardAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 8: COMMUNICATION LOG ───────────────────────────────────── */}
        {activeTab === "communication" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Chronological Customer Communication Records ({c360.communications.length})
            </h3>

            {c360.communications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No communication history recorded.
              </p>
            ) : (
              <div className="space-y-3.5">
                {c360.communications.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3 text-xs"
                  >
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{c.type}</span>
                        <span className="text-[10px] font-mono text-slate-400">{c.date}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{c.summary}</p>
                      <p className="text-[10px] text-indigo-600 font-medium">By: {c.agentName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 9: INTERNAL NOTES ──────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 animate-in fade-in-0">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-800">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Confidential Internal Notes:</strong> These notes are only visible to consultants and are strictly hidden from customers.
              </span>
            </div>

            {/* Add note input */}
            <div className="space-y-2">
              <Textarea
                rows={3}
                placeholder="Add private customer notes (e.g. Prefers beachside resorts, traveling for father's 60th birthday)..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="text-xs min-h-[70px]"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNote}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Internal Note
                </Button>
              </div>
            </div>

            {/* Notes list */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              {notesList.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No internal notes added.</p>
              ) : (
                notesList.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs space-y-1.5"
                  >
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNoteId(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEditNote(note.id)}
                            className="bg-indigo-600 text-white font-bold h-7 text-xs px-3"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-800 leading-relaxed">{note.content}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>{note.createdAt.split("T")[0]}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
