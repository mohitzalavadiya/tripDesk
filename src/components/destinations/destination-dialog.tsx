"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Destination, DestinationStatus } from "@prisma/client";
import { destinationClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface DestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: Destination | null;
  onSuccess?: () => void;
  isReadOnly?: boolean;
}

const destinationValidationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Destination name is required.")
    .max(100, "Destination name must be 100 characters or less."),
  country: Yup.string().trim().max(100, "Country cannot exceed 100 characters."),
  state: Yup.string().trim().max(100, "State cannot exceed 100 characters."),
  cityArea: Yup.string().trim().max(100, "City/Area cannot exceed 100 characters."),
  status: Yup.mixed<DestinationStatus>().oneOf(Object.values(DestinationStatus)),
});

export function DestinationDialog({
  open,
  onOpenChange,
  destination,
  onSuccess,
  isReadOnly = false,
}: DestinationDialogProps) {
  const isEdit = Boolean(destination);

  const formik = useFormik({
    initialValues: {
      name: destination?.name || "",
      country: destination?.country || "India",
      state: destination?.state || "",
      cityArea: destination?.cityArea || "",
      status: destination?.status || DestinationStatus.ACTIVE,
    },
    enableReinitialize: true,
    validationSchema: destinationValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (isReadOnly) {
        toast.error("Subscription expired. Modifications are restricted to read-only mode.");
        return;
      }

      try {
        setSubmitting(true);
        const trimmedName = values.name.trim();

        const payload = {
          name: trimmedName,
          country: values.country.trim() || "India",
          state: values.state.trim() || undefined,
          cityArea: values.cityArea.trim() || undefined,
          status: values.status,
        };

        if (isEdit && destination) {
          await destinationClient.updateDestination(destination.id, payload);
          toast.success(`Destination "${trimmedName}" updated successfully.`);
        } else {
          await destinationClient.createDestination(payload);
          toast.success(`Destination "${trimmedName}" created successfully.`);
        }

        onOpenChange(false);
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(getErrorMessage(err, isEdit ? "Failed to update destination." : "Failed to create destination."));
      } finally {
        setSubmitting(false);
      }
    },
  });

  const getFieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field] ? formik.errors[field] : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Destination" : "Add Destination"}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {isEdit
              ? "Update destination geographic details and operational status."
              : "Register a new travel destination master for hotels, activities, and itinerary planning."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 pt-2">
          {/* Destination Name */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-name" className="text-xs font-semibold text-slate-700">
              Destination Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="dest-name"
              name="name"
              placeholder="e.g. Manali, Goa, Jaipur, Srinagar"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`text-xs h-9 ${getFieldError("name") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              maxLength={100}
              autoFocus
              disabled={formik.isSubmitting || isReadOnly}
            />
            {getFieldError("name") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                {getFieldError("name")}
              </p>
            )}
          </div>

          {/* State / Region & Country */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dest-state" className="text-xs font-semibold text-slate-700">
                State / Province
              </Label>
              <Input
                id="dest-state"
                name="state"
                placeholder="e.g. Himachal Pradesh"
                value={formik.values.state}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`text-xs h-9 ${getFieldError("state") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                maxLength={100}
                disabled={formik.isSubmitting || isReadOnly}
              />
              {getFieldError("state") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                  {getFieldError("state")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dest-country" className="text-xs font-semibold text-slate-700">
                Country
              </Label>
              <Input
                id="dest-country"
                name="country"
                placeholder="e.g. India"
                value={formik.values.country}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`text-xs h-9 ${getFieldError("country") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                maxLength={100}
                disabled={formik.isSubmitting || isReadOnly}
              />
              {getFieldError("country") && (
                <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                  {getFieldError("country")}
                </p>
              )}
            </div>
          </div>

          {/* City / Area / Sub-region */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-city" className="text-xs font-semibold text-slate-700">
              City / Specific Area <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="dest-city"
              name="cityArea"
              placeholder="e.g. Old Manali, North Goa, Candolim"
              value={formik.values.cityArea}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`text-xs h-9 ${getFieldError("cityArea") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              maxLength={100}
              disabled={formik.isSubmitting || isReadOnly}
            />
            {getFieldError("cityArea") && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                {getFieldError("cityArea")}
              </p>
            )}
          </div>

          {/* Status (For Edit mode and toggleable on Create) */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-status" className="text-xs font-semibold text-slate-700">
              Operational Status
            </Label>
            <Select
              value={formik.values.status}
              onValueChange={(val) => {
                if (val) formik.setFieldValue("status", val as DestinationStatus);
              }}
              disabled={formik.isSubmitting || isReadOnly}
            >
              <SelectTrigger id="dest-status" className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DestinationStatus.ACTIVE} className="text-xs">
                  Active (Available across system)
                </SelectItem>
                <SelectItem value={DestinationStatus.INACTIVE} className="text-xs">
                  Inactive (Hidden from new selections)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3 rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={formik.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={formik.isSubmitting || isReadOnly}
            >
              {formik.isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Destination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

