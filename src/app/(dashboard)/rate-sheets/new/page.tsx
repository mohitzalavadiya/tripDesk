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
  rateSheetClient,
  supplierClient,
  hotelClient,
} from "@/lib/api-client";
import { Hotel, Supplier } from "@prisma/client";
import { toast } from "sonner";
import {
  Plus,
  Hotel as HotelIcon,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react";

function NewRateSheetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplier = searchParams.get("supplierId") || "";
  const preselectedHotel = searchParams.get("hotelId") || "";

  // Master options
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [loadingMasters, setLoadingMasters] = React.useState(true);

  // Form states
  const [name, setName] = React.useState("");
  const [supplierId, setSupplierId] = React.useState(preselectedSupplier);
  const [seasonName, setSeasonName] = React.useState("Peak Season 2026-27");
  const [validFrom, setValidFrom] = React.useState("2026-10-01");
  const [validTo, setValidTo] = React.useState("2027-03-31");
  const [currency, setCurrency] = React.useState("INR");
  const [priority, setPriority] = React.useState(1);
  const [taxPercentage, setTaxPercentage] = React.useState(0);
  const [notes, setNotes] = React.useState("");

  // Hotel states
  const [hotelId, setHotelId] = React.useState(preselectedHotel);
  const [roomType, setRoomType] = React.useState("Deluxe Room");
  const [mealPlan, setMealPlan] = React.useState("CP");
  const [hotelCostPrice, setHotelCostPrice] = React.useState("4500");
  const [extraAdultRate, setExtraAdultRate] = React.useState("1500");
  const [extraChildRate, setExtraChildRate] = React.useState("800");

  const [submitting, setSubmitting] = React.useState(false);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Load masters on mount
  React.useEffect(() => {
    async function loadMasters() {
      try {
        setLoadingMasters(true);
        const [supRes, hotRes] = await Promise.all([
          supplierClient.getSuppliers({ limit: 100 }).catch(() => ({ data: [] })),
          hotelClient.getHotels({ limit: 100 }).catch(() => ({ data: [] })),
        ]);

        if (supRes.data) setSuppliers(supRes.data);
        if (hotRes.data) {
          setHotels(hotRes.data);
          if (!hotelId && hotRes.data[0]) setHotelId(hotRes.data[0].id);
        }
      } finally {
        setLoadingMasters(false);
      }
    }

    loadMasters();
  }, []);

  // Automatically update suggested rate sheet name
  React.useEffect(() => {
    const h = hotels.find((x) => x.id === hotelId);
    setName(`${h?.name || "Hotel"} - ${roomType} (${seasonName || "Tariff"})`);
  }, [hotelId, roomType, seasonName, hotels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!name.trim()) {
      toast.error("Rate sheet name is required.");
      return;
    }

    if (!hotelId) {
      toast.error("Please select a hotel property.");
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        name: name.trim(),
        inventoryType: "HOTEL",
        supplierId: supplierId || undefined,
        hotelId,
        roomType: roomType.trim(),
        mealPlan: mealPlan.trim(),
        costPrice: Number(hotelCostPrice),
        extraAdultRate: extraAdultRate ? Number(extraAdultRate) : undefined,
        extraChildRate: extraChildRate ? Number(extraChildRate) : undefined,
        seasonName: seasonName.trim() || undefined,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        currency,
        priority: Number(priority),
        taxPercentage: Number(taxPercentage),
        notes: notes.trim() || undefined,
      };

      const res = await rateSheetClient.createRateSheet(payload);

      if (res.success && res.data) {
        toast.success(`Rate sheet ${res.data.rateSheetNumber || res.data.name} created successfully!`);
        router.push(`/rate-sheets/${res.data.id}`);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      toast.error(err?.message || "Failed to create rate sheet.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Rate Sheets" />}

        <PageHeader
          title="Create Hotel Rate Sheet"
          description="Define hotel supplier purchase costs with date validity and deterministic priority resolution for live trip costing."
          breadcrumbs={[
            { label: "Rate Sheets", href: "/rate-sheets" },
            { label: "New Rate Sheet" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Hotel Room & Meal Plan Pricing */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <HotelIcon className="h-4 w-4 text-blue-600" />
                <span>Hotel Room & Meal Plan Pricing</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hotel Property *</label>
                  <Select value={hotelId} onValueChange={(val) => val && setHotelId(val)}>
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select hotel">
                        {(val: string | null) => {
                          if (!val) return undefined;
                          const h = hotels.find((item) => item.id === val);
                          return h ? `${h.name} ${h.city ? `(${h.city})` : ""}` : val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {hotels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} {h.city ? `(${h.city})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Room Category / Type</label>
                  <Input
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    placeholder="Deluxe Room"
                    className="h-9.5 bg-slate-50/50 border-slate-200 font-semibold text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Meal Plan Basis</label>
                  <Select value={mealPlan} onValueChange={(val) => val && setMealPlan(val)}>
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="EP">EP (Room Only)</SelectItem>
                      <SelectItem value="CP">CP (Breakfast Included)</SelectItem>
                      <SelectItem value="MAP">MAP (Breakfast + Dinner)</SelectItem>
                      <SelectItem value="AP">AP (All Meals Included)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Room Cost Rate (₹ / night) *</label>
                  <Input
                    type="number"
                    value={hotelCostPrice}
                    onChange={(e) => setHotelCostPrice(e.target.value)}
                    placeholder="4500"
                    className="h-9 bg-slate-50/50 border-slate-200 font-bold text-xs text-emerald-700"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Extra Adult Rate (₹ / night)</label>
                  <Input
                    type="number"
                    value={extraAdultRate}
                    onChange={(e) => setExtraAdultRate(e.target.value)}
                    placeholder="1500"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Extra Child Rate (₹ / night)</label>
                  <Input
                    type="number"
                    value={extraChildRate}
                    onChange={(e) => setExtraChildRate(e.target.value)}
                    placeholder="800"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Season, Validity & Supplier Terms */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>Validity Dates, Season & Supplier Contract</span>
              </h3>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Rate Sheet Title / Identifier *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Parakkat Nature Resort - Deluxe Room (Peak Season)"
                  className="h-9.5 bg-slate-50/50 border-slate-200 font-semibold text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Supplier / Vendor Partner</label>
                  <Select value={supplierId || "DIRECT"} onValueChange={(val) => setSupplierId(val === "DIRECT" ? "" : (val || ""))}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Direct / In-house">
                        {(val: string | null) => {
                          if (!val || val === "DIRECT") return "Direct / In-house";
                          const s = suppliers.find((item) => item.id === val);
                          return s ? `${s.name} ${s.supplierCode ? `(${s.supplierCode})` : ""}` : val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="DIRECT">Direct / In-house</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.supplierCode ? `(${s.supplierCode})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Season Name</label>
                  <Input
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="Peak Season 2026-27"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Priority Weight (Higher = Preferred)</label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Valid From *</label>
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Valid To *</label>
                  <Input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Supplier Tax (%)</label>
                  <Input
                    type="number"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(Number(e.target.value))}
                    placeholder="0"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs pt-1">
                <label className="font-bold text-slate-700">Remarks & Contracting Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Non-refundable during Diwali / New Year dates; includes breakfast for 2 adults..."
                  rows={3}
                  className="bg-slate-50/50 border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/rate-sheets")}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting || isReadOnly || loadingMasters}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Rate Sheet...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save & Activate Rate Sheet
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

export default function NewRateSheetPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <NewRateSheetForm />
    </React.Suspense>
  );
}
