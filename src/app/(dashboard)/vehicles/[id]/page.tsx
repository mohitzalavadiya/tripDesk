"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Car,
  Users,
  ArrowLeft,
  Phone,
  UserCheck,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Archive,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { vehicleClient } from "@/lib/api-client";
import { Vehicle } from "@prisma/client";
import { toast } from "sonner";

const editVehicleSchema = Yup.object().shape({
  name: Yup.string().trim().required("Vehicle name is required").max(100),
  type: Yup.string().trim().required("Vehicle type is required").max(50),
  capacity: Yup.number().required("Capacity is required").integer().min(1).max(100),
  registrationNumber: Yup.string().trim().max(50),
  driverName: Yup.string().trim().max(100),
  driverPhone: Yup.string().trim().max(30),
  pricingType: Yup.string().oneOf(["PER_KM", "PER_DAY", "FIXED", "INCLUDED"]),
  baseRate: Yup.number().min(0).nullable(),
  ratePerKm: Yup.number().min(0).nullable(),
  notes: Yup.string().trim().max(2000),
});

export default function VehicleProfilePage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Fetch real vehicle
  const fetchVehicle = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await vehicleClient.getVehicle(vehicleId);
      if (res.success && res.data) {
        setVehicle(res.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Vehicle not found.");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  React.useEffect(() => {
    if (vehicleId) fetchVehicle();
  }, [vehicleId, fetchVehicle]);

  // Edit Formik
  const editVehicleFormik = useFormik({
    initialValues: {
      name: vehicle?.name || "",
      type: vehicle?.type || "Sedan",
      capacity: vehicle?.capacity || 4,
      registrationNumber: vehicle?.registrationNumber || "",
      driverName: vehicle?.driverName || "",
      driverPhone: vehicle?.driverPhone || "",
      pricingType: vehicle?.pricingType || "PER_KM",
      baseRate: vehicle?.baseRate ?? "",
      ratePerKm: vehicle?.ratePerKm ?? "",
      notes: vehicle?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: editVehicleSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitting(true);
        await vehicleClient.updateVehicle(vehicleId, {
          name: values.name.trim(),
          type: values.type.trim(),
          capacity: Number(values.capacity),
          registrationNumber: values.registrationNumber.trim() || undefined,
          driverName: values.driverName.trim() || undefined,
          driverPhone: values.driverPhone.trim() || undefined,
          pricingType: values.pricingType as any,
          baseRate: values.baseRate !== "" ? Number(values.baseRate) : undefined,
          ratePerKm: values.ratePerKm !== "" ? Number(values.ratePerKm) : undefined,
          notes: values.notes.trim() || undefined,
        });

        toast.success("Vehicle updated successfully.");
        setIsEditVehicleOpen(false);
        await fetchVehicle();
      } catch (err: any) {
        toast.error(err?.message || "Failed to update vehicle.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Archive action
  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${vehicle?.name}"?`)) return;

    try {
      setIsArchiving(true);
      await vehicleClient.archiveVehicle(vehicleId);
      toast.success("Vehicle archived successfully.");
      router.push("/vehicles");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive vehicle.");
    } finally {
      setIsArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading vehicle profile...</h3>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Car className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Vehicle Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested vehicle does not exist or has been archived."}
        </p>
        <Link href="/vehicles" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Vehicles
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Vehicle Profile" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/vehicles"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Car className="h-3 w-3 text-emerald-500" />
                Fleet Vehicle
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {vehicle.name}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {vehicle.type} • {vehicle.capacity} Seats
              </span>
            </div>

            {/* Micro details */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              {vehicle.registrationNumber && (
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {vehicle.registrationNumber}
                </span>
              )}
              {vehicle.driverName && (
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  {vehicle.driverName}
                </span>
              )}
              {vehicle.driverPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {vehicle.driverPhone}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 z-10">
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={() => setIsEditVehicleOpen(true)}
              className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Edit className="h-3.5 w-3.5 mr-1 text-slate-400" /> Edit Vehicle
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnly || isArchiving}
              onClick={handleArchive}
              className="bg-white hover:bg-rose-50 border-slate-200 text-rose-600 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5 mr-1 text-rose-500" />
              {isArchiving ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6 max-w-4xl">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
            Vehicle Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Vehicle Model</span>
              <strong className="text-slate-900">{vehicle.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Category / Type</span>
              <span className="text-slate-800 font-semibold">{vehicle.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Seating Capacity</span>
              <span className="text-slate-800 font-medium">{vehicle.capacity} Passengers</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Registration Number</span>
              <span className="text-slate-800 font-mono font-medium">{vehicle.registrationNumber || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Driver Name</span>
              <span className="text-slate-800">{vehicle.driverName || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Driver Phone</span>
              <span className="text-slate-800">{vehicle.driverPhone || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Pricing Model</span>
              <span className="text-slate-800 font-medium">{vehicle.pricingType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Rate per KM</span>
              <span className="text-slate-800 font-medium">
                {vehicle.ratePerKm !== null && vehicle.ratePerKm !== undefined ? `₹${vehicle.ratePerKm}/km` : "-"}
              </span>
            </div>
          </div>

          {vehicle.notes && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block text-[11px] font-bold uppercase mb-1">Internal Notes</span>
              <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                {vehicle.notes}
              </p>
            </div>
          )}
        </div>

        {/* Edit Vehicle Modal */}
        <Dialog open={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={editVehicleFormik.handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Vehicle</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Modify vehicle specifications, driver assignment, and rates.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Name *</label>
                  <Input
                    {...editVehicleFormik.getFieldProps("name")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Type *</label>
                    <Select
                      value={editVehicleFormik.values.type}
                      onValueChange={(val) => editVehicleFormik.setFieldValue("type", val)}
                    >
                      <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 text-xs">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sedan">Sedan</SelectItem>
                        <SelectItem value="SUV">SUV</SelectItem>
                        <SelectItem value="MUV">MUV</SelectItem>
                        <SelectItem value="Hatchback">Hatchback</SelectItem>
                        <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                        <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                        <SelectItem value="Coach">Coach</SelectItem>
                        <SelectItem value="Luxury">Luxury</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Capacity (Seats) *</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...editVehicleFormik.getFieldProps("capacity")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Registration Number</label>
                  <Input
                    {...editVehicleFormik.getFieldProps("registrationNumber")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Driver Name</label>
                    <Input
                      {...editVehicleFormik.getFieldProps("driverName")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Driver Phone</label>
                    <Input
                      {...editVehicleFormik.getFieldProps("driverPhone")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pricing Model</label>
                    <Select
                      value={editVehicleFormik.values.pricingType}
                      onValueChange={(val) => editVehicleFormik.setFieldValue("pricingType", val)}
                    >
                      <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 text-xs">
                        <SelectValue placeholder="Pricing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PER_KM">Per KM</SelectItem>
                        <SelectItem value="PER_DAY">Per Day</SelectItem>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="INCLUDED">Included</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rate per KM (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...editVehicleFormik.getFieldProps("ratePerKm")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                  <Textarea
                    {...editVehicleFormik.getFieldProps("notes")}
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={editVehicleFormik.isSubmitting}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {editVehicleFormik.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
