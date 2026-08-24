"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { TransportOperation } from "@/types";
import { useOperations } from "@/context/operations-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, UserCheck, Car, AlertTriangle, Phone, Calendar, Clock } from "lucide-react";

interface AssignDriverModalProps {
  tripId: string;
  transport: TransportOperation | null;
  isOpen: boolean;
  onClose: () => void;
}

const driverAssignSchema = Yup.object({
  driverId: Yup.string().required("Please select a chauffeur"),
  vehicleName: Yup.string().required("Vehicle name is required"),
  vehicleNumber: Yup.string().optional(),
});

export function AssignDriverModal({
  tripId,
  transport,
  isOpen,
  onClose,
}: AssignDriverModalProps) {
  const { drivers, assignDriverAndVehicle } = useOperations();
  const [conflictAlert, setConflictAlert] = React.useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      driverId: transport?.driverId || drivers[0]?.id || "",
      vehicleName: transport?.vehicleName || "Force Urbania 10-Seater Luxury",
      vehicleNumber: transport?.vehicleNumber || "KL 07 CC 9812",
    },
    validationSchema: driverAssignSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (!transport) return;
      const selectedDriver = drivers.find((d) => d.id === values.driverId);
      if (!selectedDriver) return;

      const result = assignDriverAndVehicle(
        tripId,
        transport.id,
        selectedDriver.id,
        selectedDriver.name,
        selectedDriver.phone,
        undefined,
        values.vehicleName,
        values.vehicleNumber
      );

      if (result.conflictWarning) {
        toast.warning(result.conflictWarning);
      } else {
        toast.success(
          `Chauffeur ${selectedDriver.name} assigned to ${transport.title}!`
        );
      }
      onClose();
    },
  });

  if (!isOpen || !transport) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Chauffeur & Vehicle</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {transport.title} ({transport.type})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Schedule Badge */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">{transport.date}</span>
            <span>•</span>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">{transport.time}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {transport.pickupLocation} → {transport.dropLocation}
          </span>
        </div>

        {/* Conflict Warning if Any */}
        {conflictAlert && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{conflictAlert}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Driver Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Select Fleet Chauffeur <span className="text-red-500">*</span>
            </label>
            <Select
              value={formik.values.driverId}
              onValueChange={(val) => {
                formik.setFieldValue("driverId", val);
                const d = drivers.find((drv) => drv.id === val);
                if (d?.status === "Assigned") {
                  setConflictAlert(
                    `Notice: ${d.name} is currently flagged as Assigned to an active trip schedule.`
                  );
                } else {
                  setConflictAlert(null);
                }
              }}
            >
              <SelectTrigger className="h-9.5 text-xs font-semibold">
                <SelectValue placeholder="Select Driver" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.phone}) • {d.status} ({d.supplierName || "Fleet"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Vehicle Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Assigned Vehicle <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Car className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. Force Urbania Luxury"
                  {...formik.getFieldProps("vehicleName")}
                  className="pl-9 h-9.5 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Vehicle Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Registration / Plate Number
              </label>
              <Input
                placeholder="e.g. KL 07 CC 9812"
                {...formik.getFieldProps("vehicleNumber")}
                className="h-9.5 text-xs font-mono font-bold uppercase"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
