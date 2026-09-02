"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
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
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Create / Edit Modal State
  const [modalMode, setModalMode] = React.useState<"CREATE" | "EDIT" | null>(null);
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [type, setType] = React.useState<string>("INFO");
  const [status, setStatus] = React.useState<string>("ACTIVE");
  const [saving, setSaving] = React.useState(false);

  const fetchAnnouncements = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.listAnnouncements();
      if (res.success && res.data) {
        setAnnouncements(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenCreate = () => {
    setModalMode("CREATE");
    setTargetId(null);
    setTitle("");
    setMessage("");
    setType("INFO");
    setStatus("ACTIVE");
  };

  const handleOpenEdit = (a: any) => {
    setModalMode("EDIT");
    setTargetId(a.id);
    setTitle(a.title);
    setMessage(a.message);
    setType(a.type);
    setStatus(a.status);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "CREATE") {
        await adminClient.createAnnouncement({
          title,
          message,
          type: type as any,
          status: status as any,
        });
        toast.success("Broadcast announcement created");
      } else if (modalMode === "EDIT" && targetId) {
        await adminClient.updateAnnouncement(targetId, {
          title,
          message,
          type: type as any,
          status: status as any,
        });
        toast.success("Broadcast announcement updated");
      }
      setModalMode(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast notice?")) return;
    try {
      await adminClient.deleteAnnouncement(id);
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete announcement");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Platform Announcements & Broadcasts"
          description="Publish system-wide notices, maintenance alerts, and feature updates visible across subscribed agency workspaces."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Announcements" }]}
          primaryAction={{
            label: "+ New Announcement",
            onClick: handleOpenCreate,
            icon: Plus,
          }}
        />

        {/* ─── ANNOUNCEMENTS LIST ─────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <Bell className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No announcements currently published.</p>
            <Button size="sm" onClick={handleOpenCreate} className="bg-purple-600 text-white text-xs">
              + Create First Broadcast
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((a) => {
              const isWarning = a.type === "WARNING" || a.type === "MAINTENANCE";
              return (
                <div
                  key={a.id}
                  className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3 flex flex-col justify-between ${
                    isWarning ? "border-amber-200" : "border-slate-200/90"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            a.type === "WARNING"
                              ? "bg-amber-100 text-amber-800"
                              : a.type === "MAINTENANCE"
                              ? "bg-rose-100 text-rose-800"
                              : a.type === "FEATURE"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {a.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            a.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">{a.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{a.message}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(a)}
                      className="h-7 text-xs font-semibold"
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(a.id)}
                      className="h-7 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT MODAL ────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              {modalMode === "CREATE" ? "New Platform Announcement" : "Edit Announcement"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled System Maintenance"
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Type</label>
                  <Select
                    value={type}
                    onValueChange={(val) => {
                      if (val) setType(val);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="FEATURE">Feature Release</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <Select
                    value={status}
                    onValueChange={(val) => {
                      if (val) setStatus(val);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message Content</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the platform notice in detail..."
                  rows={4}
                  className="text-xs resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalMode(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  {saving ? "Publishing..." : "Publish Broadcast"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
