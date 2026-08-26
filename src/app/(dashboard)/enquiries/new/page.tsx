"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  customerClient,
  enquiryClient,
} from "@/lib/api-client";
import { Customer, EnquirySource, EnquiryPriority, EnquiryStatus } from "@prisma/client";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Users,
  Info,
  Settings2,
  ShieldCheck,
  Calendar,
  IndianRupee,
  Clock,
  Sparkles,
  Loader2,
  Plus,
} from "lucide-react";

export default function NewEnquiryPage() {
  const router = useRouter();

  // Data states
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Form Mode ("existing" | "new")
  const [customerMode, setCustomerMode] = React.useState<"existing" | "new">("existing");

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [newCustomerName, setNewCustomerName] = React.useState("");
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("");
  const [newCustomerEmail, setNewCustomerEmail] = React.useState("");

  // Travel Details State
  const [title, setTitle] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Travellers State
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [infants, setInfants] = React.useState(0);

  // Preferences State
  const [hotelCategory, setHotelCategory] = React.useState("3 Star");
  const [mealPlan, setMealPlan] = React.useState("MAP");
  const [vehiclePreference, setVehiclePreference] = React.useState("Sedan");
  const [transportRequired, setTransportRequired] = React.useState(true);
  const [budget, setBudget] = React.useState("");
  const [budgetType, setBudgetType] = React.useState<"total" | "per_person">("total");

  // Requirements & Metadata State
  const [source, setSource] = React.useState<EnquirySource>(EnquirySource.WHATSAPP);
  const [priority, setPriority] = React.useState<EnquiryPriority>(EnquiryPriority.MEDIUM);
  const [status, setStatus] = React.useState<EnquiryStatus>(EnquiryStatus.NEW);
  const [specialRequirements, setSpecialRequirements] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [followupDate, setFollowupDate] = React.useState("");

  // Load real customers from PostgreSQL API
  React.useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        const res = await customerClient.getCustomers({ limit: 100 });
        if (res.success && res.data) {
          setCustomers(res.data);
          if (res.data.length > 0) {
            setSelectedCustomerId(res.data[0].id);
          }
        }
      } catch (err: any) {
        if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
          setIsReadOnly(true);
        }
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, []);

  // Duration Helper
  const durationString = React.useMemo(() => {
    if (!startDate || !endDate) return "";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return "End date must be after start date";
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Same Day Trip";
    return `${diffDays} Nights / ${diffDays + 1} Days`;
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!destination.trim()) {
      toast.error("Destination is required.");
      return;
    }

    try {
      setSubmitting(true);
      let customerId = selectedCustomerId;

      // 1. If new customer mode, create customer first via real API
      if (customerMode === "new") {
        if (!newCustomerName.trim()) {
          toast.error("Customer name is required.");
          return;
        }
        if (!newCustomerPhone.trim()) {
          toast.error("Customer phone number is required.");
          return;
        }

        const custRes = await customerClient.createCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim() || undefined,
        });

        if (custRes.success && custRes.data) {
          customerId = custRes.data.id;
        } else {
          throw new Error("Failed to create new customer.");
        }
      }

      if (!customerId) {
        toast.error("Please select or create a customer.");
        return;
      }

      // 2. Create Enquiry
      const res = await enquiryClient.createEnquiry({
        customerId,
        title: title.trim() || undefined,
        destination: destination.trim(),
        origin: origin.trim() || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        adults,
        children,
        infants,
        budget: budget ? Number(budget) : undefined,
        budgetType,
        hotelCategory: hotelCategory !== "Not decided" ? hotelCategory : undefined,
        mealPlan: mealPlan !== "Not decided" ? mealPlan : undefined,
        vehiclePreference: vehiclePreference !== "Not decided" ? vehiclePreference : undefined,
        transportRequired,
        source,
        priority,
        status,
        specialRequirements: specialRequirements.trim() || undefined,
        notes: notes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        nextFollowUpAt: followupDate ? new Date(followupDate) : undefined,
      });

      if (res.success && res.data) {
        toast.success(`Enquiry ${res.data.enquiryNumber} captured successfully!`);
        router.push(`/enquiries/${res.data.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Enquiries & Leads CRM" />}

        <PageHeader
          title="Create New Enquiry"
          description="Capture customer travel preferences, dates, passenger counts, budget, and follow-up schedules."
          breadcrumbs={[
            { label: "Enquiries", href: "/enquiries" },
            { label: "New Enquiry" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Customer Selection Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>Customer Information</span>
                </h3>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      customerMode === "existing"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      customerMode === "new"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    + Quick Add Customer
                  </button>
                </div>
              </div>

              {customerMode === "existing" ? (
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700">Select Customer *</label>
                  {loadingCustomers ? (
                    <div className="h-9.5 flex items-center gap-2 text-slate-400 text-xs px-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Loading customer directory...
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                      No customers found. Switch to Quick Add Customer to create one.
                    </div>
                  ) : (
                    <Select
                      value={selectedCustomerId}
                      onValueChange={(val) => val && setSelectedCustomerId(val)}
                    >
                      <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl">
                        <SelectValue placeholder="Choose existing client..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name} ({c.phone}) {c.email ? `• ${c.email}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Full Name *</label>
                    <Input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required={customerMode === "new"}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Phone Number *</label>
                    <Input
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required={customerMode === "new"}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Email Address (Optional)</label>
                    <Input
                      type="email"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      placeholder="ananya@example.com"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Destination & Dates Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>Travel Details & Dates</span>
                </h3>
                {durationString && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {durationString}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Destination *</label>
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Kerala, Bali, Kashmir..."
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Departure City / Origin</label>
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi, Ahmedabad..."
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tentative Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tentative End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Passengers & Budget Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Passenger Count & Commercial Budget</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Adults (12+ yrs) *</label>
                  <Input
                    type="number"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Children (2-11 yrs)</label>
                  <Input
                    type="number"
                    min={0}
                    value={children}
                    onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Infants (0-2 yrs)</label>
                  <Input
                    type="number"
                    min={0}
                    value={infants}
                    onChange={(e) => setInfants(parseInt(e.target.value) || 0)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Estimated Budget (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 75000"
                    className="h-9.5 bg-slate-50/50 border-slate-200 text-xs font-bold text-emerald-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Budget Structure</label>
                  <Select
                    value={budgetType}
                    onValueChange={(val) => setBudgetType(val as "total" | "per_person")}
                  >
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="total">Total Package Budget</SelectItem>
                      <SelectItem value="per_person">Per Person Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 4. Preferences & Requirements Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-amber-600" />
                <span>Package Preferences & Lead Source</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hotel Category</label>
                  <Select value={hotelCategory} onValueChange={(val) => val && setHotelCategory(val)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Budget / 2 Star">Budget / 2 Star</SelectItem>
                      <SelectItem value="3 Star">3 Star</SelectItem>
                      <SelectItem value="4 Star">4 Star</SelectItem>
                      <SelectItem value="5 Star">5 Star</SelectItem>
                      <SelectItem value="Luxury Resort">Luxury Resort</SelectItem>
                      <SelectItem value="Not decided">Not decided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Meal Plan</label>
                  <Select value={mealPlan} onValueChange={(val) => val && setMealPlan(val)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="EP (Room Only)">EP (Room Only)</SelectItem>
                      <SelectItem value="CP (Breakfast Only)">CP (Breakfast Only)</SelectItem>
                      <SelectItem value="MAP (Breakfast + Dinner)">MAP (Breakfast + Dinner)</SelectItem>
                      <SelectItem value="AP (All Meals)">AP (All Meals)</SelectItem>
                      <SelectItem value="Not decided">Not decided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Vehicle / Transport</label>
                  <Select value={vehiclePreference} onValueChange={(val) => val && setVehiclePreference(val)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Sedan (Dzire/Etios)">Sedan (Dzire/Etios)</SelectItem>
                      <SelectItem value="SUV (Innova/Crysta)">SUV (Innova/Crysta)</SelectItem>
                      <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                      <SelectItem value="Not required / Flights Only">Not required</SelectItem>
                      <SelectItem value="Not decided">Not decided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Lead Source</label>
                  <Select value={source} onValueChange={(val) => val && setSource(val as EnquirySource)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={EnquirySource.WHATSAPP}>WhatsApp</SelectItem>
                      <SelectItem value={EnquirySource.WEBSITE}>Website</SelectItem>
                      <SelectItem value={EnquirySource.INSTAGRAM}>Instagram</SelectItem>
                      <SelectItem value={EnquirySource.FACEBOOK}>Facebook</SelectItem>
                      <SelectItem value={EnquirySource.PHONE}>Phone Call</SelectItem>
                      <SelectItem value={EnquirySource.EMAIL}>Email</SelectItem>
                      <SelectItem value={EnquirySource.REFERRAL}>Referral</SelectItem>
                      <SelectItem value={EnquirySource.WALK_IN}>Walk-in</SelectItem>
                      <SelectItem value={EnquirySource.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Priority</label>
                  <Select value={priority} onValueChange={(val) => val && setPriority(val as EnquiryPriority)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={EnquiryPriority.LOW}>Low</SelectItem>
                      <SelectItem value={EnquiryPriority.MEDIUM}>Medium</SelectItem>
                      <SelectItem value={EnquiryPriority.HIGH}>High</SelectItem>
                      <SelectItem value={EnquiryPriority.URGENT}>Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">First Follow-up Date</label>
                  <Input
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. Notes & Special Remarks Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
                Special Requirements & Notes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Special Requirements</label>
                  <Textarea
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    placeholder="e.g. Honeymoon inclusions, candle light dinner, wheelchair access..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Agency Remarks</label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
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
                onClick={() => router.push("/enquiries")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Capturing Enquiry...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save & Create Enquiry
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
