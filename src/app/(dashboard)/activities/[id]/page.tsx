"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Ticket,
  MapPin,
  Clock,
  ArrowLeft,
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
import { activityClient } from "@/lib/api-client";
import { Activity, ActivityType } from "@prisma/client";
import { toast } from "sonner";

const editActivitySchema = Yup.object().shape({
  name: Yup.string().trim().required("Activity name is required").max(200),
  location: Yup.string().trim().max(200),
  description: Yup.string().trim().max(2000),
  duration: Yup.string().trim().max(100),
  type: Yup.string().oneOf(Object.values(ActivityType)),
  adultPrice: Yup.number().min(0).nullable(),
  childPrice: Yup.number().min(0).nullable(),
  price: Yup.number().min(0).nullable(),
  notes: Yup.string().trim().max(2000),
});

export default function ActivityProfilePage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;

  const [activity, setActivity] = React.useState<Activity | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Fetch real activity
  const fetchActivity = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await activityClient.getActivity(activityId);
      if (res.success && res.data) {
        setActivity(res.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Activity not found.");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  React.useEffect(() => {
    if (activityId) fetchActivity();
  }, [activityId, fetchActivity]);

  // Edit Formik
  const editActivityFormik = useFormik({
    initialValues: {
      name: activity?.name || "",
      location: activity?.location || "",
      description: activity?.description || "",
      duration: activity?.duration || "Half Day",
      type: activity?.type || ActivityType.INCLUDED,
      adultPrice: activity?.adultPrice !== null && activity?.adultPrice !== undefined ? String(activity.adultPrice) : "",
      childPrice: activity?.childPrice !== null && activity?.childPrice !== undefined ? String(activity.childPrice) : "",
      price: activity?.price !== null && activity?.price !== undefined ? String(activity.price) : "",
      notes: activity?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: editActivitySchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitting(true);
        await activityClient.updateActivity(activityId, {
          name: values.name.trim(),
          location: values.location.trim() || undefined,
          description: values.description.trim() || undefined,
          duration: values.duration.trim() || undefined,
          type: values.type as ActivityType,
          adultPrice: values.adultPrice !== "" ? Number(values.adultPrice) : undefined,
          childPrice: values.childPrice !== "" ? Number(values.childPrice) : undefined,
          price: values.price !== "" ? Number(values.price) : undefined,
          notes: values.notes.trim() || undefined,
        });

        toast.success("Activity updated successfully.");
        setIsEditActivityOpen(false);
        await fetchActivity();
      } catch (err: any) {
        toast.error(err?.message || "Failed to update activity.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Archive action
  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${activity?.name}"?`)) return;

    try {
      setIsArchiving(true);
      await activityClient.archiveActivity(activityId);
      toast.success("Activity archived successfully.");
      router.push("/activities");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive activity.");
    } finally {
      setIsArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading activity profile...</h3>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Ticket className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Activity Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested activity does not exist or has been archived."}
        </p>
        <Link href="/activities" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Activities
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isReadOnly && <ReadOnlyBanner moduleName="Activity Profile" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <Link
                href="/activities"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-100">
                <Ticket className="h-3 w-3 text-purple-500" />
                Excursion Profile
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {activity.name}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {activity.type} • {activity.duration || "Half Day"}
              </span>
            </div>

            {/* Micro details */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              {activity.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {activity.location}
                </span>
              )}
              {activity.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {activity.duration}
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
              onClick={() => setIsEditActivityOpen(true)}
              className="bg-white hover:bg-slate-50 border-slate-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Edit className="h-3.5 w-3.5 mr-1 text-slate-400" /> Edit Activity
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
            Activity Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Activity Name</span>
              <strong className="text-slate-900">{activity.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Category / Type</span>
              <span className="text-slate-800 font-semibold">{activity.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Location</span>
              <span className="text-slate-800 font-medium">{activity.location || "Unspecified"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Duration</span>
              <span className="text-slate-800 font-medium">{activity.duration || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Adult Price</span>
              <span className="text-slate-800 font-semibold">
                {activity.adultPrice !== null && activity.adultPrice !== undefined ? `₹${Number(activity.adultPrice)} / adult` : "-"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Child Price</span>
              <span className="text-slate-800 font-medium">
                {activity.childPrice !== null && activity.childPrice !== undefined ? `₹${Number(activity.childPrice)} / child` : "-"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Flat Group Price</span>
              <span className="text-slate-800 font-medium">
                {activity.price !== null && activity.price !== undefined ? `₹${Number(activity.price)}` : "-"}
              </span>
            </div>
          </div>

          {activity.description && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block text-[11px] font-bold uppercase mb-1">Description</span>
              <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                {activity.description}
              </p>
            </div>
          )}

          {activity.notes && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block text-[11px] font-bold uppercase mb-1">Internal Notes</span>
              <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                {activity.notes}
              </p>
            </div>
          )}
        </div>

        {/* Edit Activity Modal */}
        <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={editActivityFormik.handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">Edit Activity</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Modify experience description, duration, and tariffs.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Activity Name *</label>
                  <Input
                    {...editActivityFormik.getFieldProps("name")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Inclusion Type *</label>
                    <Select
                      value={editActivityFormik.values.type}
                      onValueChange={(val) => val && editActivityFormik.setFieldValue("type", val)}
                    >
                      <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 text-xs">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ActivityType.INCLUDED}>Included in Package</SelectItem>
                        <SelectItem value={ActivityType.OPTIONAL}>Optional / Add-on</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Duration</label>
                    <Input
                      {...editActivityFormik.getFieldProps("duration")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                  <Input
                    {...editActivityFormik.getFieldProps("location")}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                  <Textarea
                    {...editActivityFormik.getFieldProps("description")}
                    rows={2}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Adult Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...editActivityFormik.getFieldProps("adultPrice")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Child Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...editActivityFormik.getFieldProps("childPrice")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Flat Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...editActivityFormik.getFieldProps("price")}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                  <Textarea
                    {...editActivityFormik.getFieldProps("notes")}
                    rows={2}
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
                  disabled={editActivityFormik.isSubmitting}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {editActivityFormik.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
