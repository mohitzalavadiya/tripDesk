"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  vehicleClient,
  activityClient,
} from "@/lib/api-client";
import { Hotel, Vehicle, Activity, Supplier } from "@prisma/client";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Plus,
  Hotel as HotelIcon,
  Car,
  Ticket,
  Truck,
  Calendar,
  Sparkles,
  Loader2,
  DollarSign,
  Info,
} from "lucide-react";

function NewRateSheetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplier = searchParams.get("supplierId") || "";
  const preselectedHotel = searchParams.get("hotelId") || "";
  const preselectedVehicle = searchParams.get("vehicleId") || "";
  const preselectedActivity = searchParams.get("activityId") || "";

  // Master options
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loadingMasters, setLoadingMasters] = React.useState(true);

  // Form states
  const [inventoryType, setInventoryType] = React.useState<"HOTEL" | "VEHICLE" | "ACTIVITY">(
    preselectedVehicle ? "VEHICLE" : preselectedActivity ? "ACTIVITY" : "HOTEL"
  );
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

  // Vehicle states
  const [vehicleId, setVehicleId] = React.useState(preselectedVehicle);
  const [vehiclePricingType, setVehiclePricingType] = React.useState<"PER_KM" | "TOTAL">("PER_KM");
  const [ratePerKm, setRatePerKm] = React.useState("18");
  const [minimumKm, setMinimumKm] = React.useState("100");
  const [vehicleTotalRate, setVehicleTotalRate] = React.useState("4500");
  const [extraKmRate, setExtraKmRate] = React.useState("20");
  const [driverAllowance, setDriverAllowance] = React.useState("500");
  const [nightAllowance, setNightAllowance] = React.useState("600");
  const [tollIncluded, setTollIncluded] = React.useState(false);
  const [parkingIncluded, setParkingIncluded] = React.useState(false);

  // Activity states
  const [activityId, setActivityId] = React.useState(preselectedActivity);
  const [adultCost, setAdultCost] = React.useState("1200");
  const [childCost, setChildCost] = React.useState("600");
  const [infantCost, setInfantCost] = React.useState("0");

  const [submitting, setSubmitting] = React.useState(false);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Load masters on mount
  React.useEffect(() => {
    async function loadMasters() {
      try {
        setLoadingMasters(true);
        const [supRes, hotRes, vehRes, actRes] = await Promise.all([
          supplierClient.getSuppliers({ limit: 100 }).catch(() => ({ data: [] })),
          hotelClient.getHotels({ limit: 100 }).catch(() => ({ data: [] })),
          vehicleClient.getVehicles({ limit: 100 }).catch(() => ({ data: [] })),
          activityClient.getActivities({ limit: 100 }).catch(() => ({ data: [] })),
        ]);

        if (supRes.data) setSuppliers(supRes.data);
        if (hotRes.data) {
          setHotels(hotRes.data);
          if (!hotelId && hotRes.data[0]) setHotelId(hotRes.data[0].id);
        }
        if (vehRes.data) {
          setVehicles(vehRes.data);
          if (!vehicleId && vehRes.data[0]) setVehicleId(vehRes.data[0].id);
        }
        if (actRes.data) {
          setActivities(actRes.data);
          if (!activityId && actRes.data[0]) setActivityId(actRes.data[0].id);
        }
      } finally {
        setLoadingMasters(false);
      }
    }

    loadMasters();
  }, []);

  // Automatically update suggested rate sheet name
  React.useEffect(() => {
    if (inventoryType === "HOTEL") {
      const h = hotels.find((x) => x.id === hotelId);
      setName(`${h?.name || "Hotel"} - ${roomType} (${seasonName || "Tariff"})`);
    } else if (inventoryType === "VEHICLE") {
      const v = vehicles.find((x) => x.id === vehicleId);
      setName(`${v?.name || "Vehicle"} - ${seasonName || "Rate"}`);
    } else if (inventoryType === "ACTIVITY") {
      const a = activities.find((x) => x.id === activityId);
      setName(`${a?.name || "Activity"} - ${seasonName || "Tariff"}`);
    }
  }, [inventoryType, hotelId, vehicleId, activityId, roomType, seasonName, hotels, vehicles, activities]);

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

    try {
      setSubmitting(true);

      const payload: any = {
        name: name.trim(),
        inventoryType,
        supplierId: supplierId || undefined,
        seasonName: seasonName.trim() || undefined,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        currency,
        priority: Number(priority),
        taxPercentage: Number(taxPercentage),
        notes: notes.trim() || undefined,
      };

      if (inventoryType === "HOTEL") {
        if (!hotelId) {
          toast.error("Please select a hotel property.");
          return;
        }
        payload.hotelId = hotelId;
        payload.roomType = roomType.trim();
        payload.mealPlan = mealPlan.trim();
        payload.costPrice = Number(hotelCostPrice);
        payload.extraAdultRate = extraAdultRate ? Number(extraAdultRate) : undefined;
        payload.extraChildRate = extraChildRate ? Number(extraChildRate) : undefined;
      } else if (inventoryType === "VEHICLE") {
        if (!vehicleId) {
          toast.error("Please select a vehicle.");
          return;
        }
        payload.vehicleId = vehicleId;
        payload.vehiclePricingType = vehiclePricingType;
        payload.costPrice = vehiclePricingType === "TOTAL" ? Number(vehicleTotalRate) : Number(ratePerKm);
        payload.ratePerKm = ratePerKm ? Number(ratePerKm) : undefined;
        payload.minimumKm = minimumKm ? Number(minimumKm) : undefined;
        payload.totalRate = vehicleTotalRate ? Number(vehicleTotalRate) : undefined;
        payload.extraKmRate = extraKmRate ? Number(extraKmRate) : undefined;
        payload.driverAllowance = driverAllowance ? Number(driverAllowance) : undefined;
        payload.nightAllowance = nightAllowance ? Number(nightAllowance) : undefined;
        payload.tollIncluded = tollIncluded;
        payload.parkingIncluded = parkingIncluded;
      } else if (inventoryType === "ACTIVITY") {
        if (!activityId) {
          toast.error("Please select an activity.");
          return;
        }
        payload.activityId = activityId;
        payload.costPrice = Number(adultCost);
        payload.adultCost = Number(adultCost);
        payload.childCost = childCost ? Number(childCost) : undefined;
        payload.infantCost = infantCost ? Number(infantCost) : undefined;
      }

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
          title="Create Seasonal Rate Sheet"
          description="Define supplier purchase costs with date validity and deterministic priority resolution for live trip costing."
          breadcrumbs={[
            { label: "Rate Sheets", href: "/rate-sheets" },
            { label: "New Rate Sheet" },
          ]}
        />

        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Inventory Category Selection */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Select Inventory Type</span>
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "HOTEL", label: "Hotel Room Tariff", icon: HotelIcon, color: "text-blue-600 bg-blue-50" },
                  { id: "VEHICLE", label: "Fleet / Vehicle Rate", icon: Car, color: "text-emerald-600 bg-emerald-50" },
                  { id: "ACTIVITY", label: "Activity / Excursion", icon: Ticket, color: "text-amber-600 bg-amber-50" },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = inventoryType === type.id;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setInventoryType(type.id as any)}
                      className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/30 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${type.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{type.label}</h4>
                        <span className="text-[11px] text-slate-500">Commercial contract</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Specific Item & Rate Configuration */}
            {inventoryType === "HOTEL" && (
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
            )}

            {inventoryType === "VEHICLE" && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Car className="h-4 w-4 text-emerald-600" />
                  <span>Fleet Unit & Transportation Pricing</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Vehicle Model *</label>
                    <Select value={vehicleId} onValueChange={(val) => val && setVehicleId(val)}>
                      <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue placeholder="Select vehicle">
                        {(val: string | null) => {
                          if (!val) return undefined;
                          const v = vehicles.find((item) => item.id === val);
                          return v ? `${v.name} (${v.type} - ${v.capacity} seats)` : val;
                        }}
                      </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.type} - {v.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Pricing Model Basis</label>
                    <Select
                      value={vehiclePricingType}
                      onValueChange={(val) => val && setVehiclePricingType(val as any)}
                    >
                      <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="PER_KM">Per Kilometer (Rate/km + Min Km)</SelectItem>
                        <SelectItem value="TOTAL">Total Fixed Package Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {vehiclePricingType === "PER_KM" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Rate per KM (₹) *</label>
                      <Input
                        type="number"
                        value={ratePerKm}
                        onChange={(e) => setRatePerKm(e.target.value)}
                        placeholder="18"
                        className="h-9 bg-slate-50/50 border-slate-200 font-bold text-xs text-emerald-700"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Minimum KM / Day</label>
                      <Input
                        type="number"
                        value={minimumKm}
                        onChange={(e) => setMinimumKm(e.target.value)}
                        placeholder="100"
                        className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Extra KM Rate (₹)</label>
                      <Input
                        type="number"
                        value={extraKmRate}
                        onChange={(e) => setExtraKmRate(e.target.value)}
                        placeholder="20"
                        className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs pt-1">
                    <label className="font-bold text-slate-700">Total Fixed Rate (₹) *</label>
                    <Input
                      type="number"
                      value={vehicleTotalRate}
                      onChange={(e) => setVehicleTotalRate(e.target.value)}
                      placeholder="4500"
                      className="h-9 bg-slate-50/50 border-slate-200 font-bold text-xs text-emerald-700 max-w-sm"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Driver Allowance / Day (₹)</label>
                    <Input
                      type="number"
                      value={driverAllowance}
                      onChange={(e) => setDriverAllowance(e.target.value)}
                      placeholder="500"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Night Halt Charge (₹)</label>
                    <Input
                      type="number"
                      value={nightAllowance}
                      onChange={(e) => setNightAllowance(e.target.value)}
                      placeholder="600"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="tollCheck"
                      checked={tollIncluded}
                      onChange={(e) => setTollIncluded(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="tollCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Toll Included
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="parkingCheck"
                      checked={parkingIncluded}
                      onChange={(e) => setParkingIncluded(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="parkingCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Parking Included
                    </label>
                  </div>
                </div>
              </div>
            )}

            {inventoryType === "ACTIVITY" && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-amber-600" />
                  <span>Activity & Excursion Per-Pax Pricing</span>
                </h3>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700">Activity / Tour *</label>
                  <Select value={activityId} onValueChange={(val) => val && setActivityId(val)}>
                    <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                      <SelectValue placeholder="Select activity">
                      {(val: string | null) => {
                        if (!val) return undefined;
                        const a = activities.find((item) => item.id === val);
                        return a ? `${a.name} ${a.location ? `(${a.location})` : ""}` : val;
                      }}
                    </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {activities.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a.location ? `(${a.location})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Adult Purchase Cost (₹) *</label>
                    <Input
                      type="number"
                      value={adultCost}
                      onChange={(e) => setAdultCost(e.target.value)}
                      placeholder="1200"
                      className="h-9 bg-slate-50/50 border-slate-200 font-bold text-xs text-emerald-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Child Purchase Cost (₹)</label>
                    <Input
                      type="number"
                      value={childCost}
                      onChange={(e) => setChildCost(e.target.value)}
                      placeholder="600"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Infant Cost (₹)</label>
                    <Input
                      type="number"
                      value={infantCost}
                      onChange={(e) => setInfantCost(e.target.value)}
                      placeholder="0"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Season, Validity & Supplier Terms */}
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
