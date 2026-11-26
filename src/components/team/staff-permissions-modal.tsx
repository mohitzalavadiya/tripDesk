"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_STAFF_PERMISSIONS,
  PAGE_PERMISSIONS_REGISTRY,
  PagePermissionConfig,
  StaffModulePermissions,
  StaffPermissionsProfileMap,
} from "@/lib/auth/permissions";
import {
  Eye,
  Loader2,
  Minus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface StaffPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const CATEGORIES: Array<PagePermissionConfig["category"]> = [
  "CRM & Sales",
  "Trips & Bookings",
  "Catalog & Inventory",
  "Finance & Invoicing",
  "Engagement & Analytics",
  "Settings & Admin",
];

export function StaffPermissionsModal({
  isOpen,
  onClose,
  staffMember,
}: StaffPermissionsModalProps) {
  const [permissions, setPermissions] =
    React.useState<StaffPermissionsProfileMap>(DEFAULT_STAFF_PERMISSIONS);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !staffMember) return;

    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) setLoading(true);
    });

    fetch(`/api/team/members/${staffMember.id}/permissions`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data?.permissions) {
          // Merge with defaults so every registry page has an entry in state
          setPermissions({
            ...DEFAULT_STAFF_PERMISSIONS,
            ...json.data.permissions,
          });
        } else if (isMounted && !json.success) {
          const errorMsg =
            json.error?.message ||
            (typeof json.error === "string"
              ? json.error
              : "Failed to load staff permissions");
          toast.error(errorMsg);
        }
      })
      .catch((err) => {
        toast.error("Failed to load staff permissions: " + err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, staffMember]);

  const handleToggle = (
    moduleKey: string,
    actionKey: string,
    value: boolean
  ) => {
    setPermissions((prev) => {
      const currentModule = prev[moduleKey] || {};
      const updatedModule: StaffModulePermissions = {
        ...currentModule,
        [actionKey]: value,
      };

      // Invariant: If view is toggled OFF, automatically disable all child mutations
      if (actionKey === "view" && !value) {
        for (const k of Object.keys(updatedModule)) {
          updatedModule[k] = false;
        }
      }

      return {
        ...prev,
        [moduleKey]: updatedModule,
      };
    });
  };

  // Bulk Actions
  const handleApplyDefaults = () => {
    setPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
    toast.info("Applied standard operational defaults.");
  };

  const handleEnableAllViews = () => {
    setPermissions((prev) => {
      const updated: StaffPermissionsProfileMap = { ...prev };
      PAGE_PERMISSIONS_REGISTRY.forEach((page) => {
        updated[page.moduleKey] = {
          ...(updated[page.moduleKey] || {}),
          view: true,
        };
      });
      return updated;
    });
    toast.info("Enabled View permission on all agency pages.");
  };

  const handleApplyReadOnly = () => {
    setPermissions((prev) => {
      const updated: StaffPermissionsProfileMap = { ...prev };
      PAGE_PERMISSIONS_REGISTRY.forEach((page) => {
        const cleared: StaffModulePermissions = { view: true };
        for (const k of Object.keys(updated[page.moduleKey] || {})) {
          if (k !== "view") cleared[k] = false;
        }
        cleared.create = false;
        cleared.update = false;
        cleared.delete = false;
        cleared.recordReceipt = false;
        cleared.verify = false;
        cleared.void = false;
        cleared.logInteraction = false;
        cleared.export = false;
        updated[page.moduleKey] = cleared;
      });
      return updated;
    });
    toast.info("Applied Read-Only Mode across all pages.");
  };

  const handleRevokeAll = () => {
    setPermissions((prev) => {
      const updated: StaffPermissionsProfileMap = { ...prev };
      PAGE_PERMISSIONS_REGISTRY.forEach((page) => {
        const cleared: StaffModulePermissions = {};
        for (const k of Object.keys(updated[page.moduleKey] || {})) {
          cleared[k] = false;
        }
        cleared.view = false;
        cleared.create = false;
        cleared.update = false;
        cleared.delete = false;
        cleared.recordReceipt = false;
        cleared.verify = false;
        cleared.void = false;
        cleared.logInteraction = false;
        cleared.export = false;
        updated[page.moduleKey] = cleared;
      });
      return updated;
    });
    toast.warning("Revoked all permissions for this staff member.");
  };

  const handleToggleRow = (page: PagePermissionConfig) => {
    const current = permissions[page.moduleKey] || {};
    const isCurrentlyView = Boolean(current.view);

    setPermissions((prev) => {
      if (isCurrentlyView) {
        // Disabling page row: cleanly disable ALL permissions for this row without leaving orphaned sub-actions
        const cleared: StaffModulePermissions = {};
        for (const k of Object.keys(current)) {
          cleared[k] = false;
        }
        cleared.view = false;
        cleared.create = false;
        cleared.update = false;
        cleared.delete = false;
        return {
          ...prev,
          [page.moduleKey]: cleared,
        };
      } else {
        // Enabling page row: grant standard/safe default permissions for this page
        return {
          ...prev,
          [page.moduleKey]: {
            ...page.defaultPermissions,
            view: true,
          },
        };
      }
    });
  };

  const handleSave = async () => {
    if (!staffMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/members/${staffMember.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg =
          json.error?.message ||
          (typeof json.error === "string"
            ? json.error
            : "Failed to update permissions");
        throw new Error(errorMsg);
      }
      toast.success(`Permissions updated for ${staffMember.name}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save permissions";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!staffMember) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/team/members/${staffMember.id}/permissions`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg =
          json.error?.message ||
          (typeof json.error === "string"
            ? json.error
            : "Failed to reset permissions");
        throw new Error(errorMsg);
      }
      setPermissions(json.data.permissions || DEFAULT_STAFF_PERMISSIONS);
      toast.success(
        `Permissions reset to standard defaults for ${staffMember.name}`
      );
      setConfirmResetOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset permissions";
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  if (!staffMember) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[96vw] max-w-7xl sm:max-w-6xl lg:max-w-7xl xl:max-w-350 max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl border-slate-200">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Staff Permissions Matrix</span>
                    <Badge variant="outline" className="font-medium text-xs text-indigo-700 bg-indigo-50/50 border-indigo-200">
                      {staffMember.name}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Configure granular page-by-page access for{" "}
                    <span className="font-semibold text-slate-700">
                      {staffMember.name}
                    </span>{" "}
                    ({staffMember.email}).
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/60 mt-3 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 select-none">
                <SlidersHorizontal className="h-3 w-3" />
                Presets:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyDefaults}
                disabled={loading || saving}
                className="h-7 text-xs gap-1.5 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-indigo-600" />
                <span>Operational Default</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnableAllViews}
                disabled={loading || saving}
                className="h-7 text-xs gap-1.5 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
              >
                <Eye className="h-3 w-3 text-emerald-600" />
                <span>Enable All Views</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyReadOnly}
                disabled={loading || saving}
                className="h-7 text-xs gap-1.5 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
              >
                <Minus className="h-3 w-3 text-blue-600" />
                <span>Read-Only Mode</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevokeAll}
                disabled={loading || saving}
                className="h-7 text-xs gap-1.5 bg-white hover:bg-red-50 border-slate-200 text-red-600 hover:text-red-700 hover:border-red-200 cursor-pointer ml-auto"
              >
                <XCircle className="h-3 w-3" />
                <span>Revoke All Delegated</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Matrix Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span>Loading permission matrix...</span>
              </div>
            ) : (
              <>
                {CATEGORIES.map((category) => {
                  const pages = PAGE_PERMISSIONS_REGISTRY.filter(
                    (p) => p.category === category
                  );
                  if (pages.length === 0) return null;

                  return (
                    <div
                      key={category}
                      className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden"
                    >
                      {/* Section Category Header */}
                      <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 tracking-wide">
                            {category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            ({pages.length} pages)
                          </span>
                        </div>
                      </div>

                      {/* Responsive Permission Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="py-2 px-3 sm:px-4 min-w-[200px]">
                                Page / Section
                              </th>
                              <th className="py-2 px-2 text-center w-20">View</th>
                              <th className="py-2 px-2 text-center w-24">Add / Create</th>
                              <th className="py-2 px-2 text-center w-24">Edit / Update</th>
                              <th className="py-2 px-2 text-center w-28">Delete</th>
                              <th className="py-2 px-3 text-right w-24">Page Access</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pages.map((page) => {
                              const modulePerms = permissions[page.moduleKey] || {};
                              const isViewEnabled = Boolean(modulePerms.view);
                              const isAddDelegable = page.delegableActions.includes("create") || page.moduleKey === "PAYMENTS";
                              const isEditDelegable = page.delegableActions.includes("update");
                              const isDeleteDelegable = page.delegableActions.includes("delete");

                              return (
                                <tr
                                  key={page.moduleKey}
                                  className={`transition-colors hover:bg-slate-50/80 ${
                                    isViewEnabled
                                      ? "bg-white"
                                      : "bg-slate-50/20 text-slate-400"
                                  }`}
                                >
                                  {/* Page Column */}
                                  <td className="py-2.5 px-3 sm:px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-900">
                                        {page.name}
                                      </span>
                                      <code className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200/60">
                                        {page.route}
                                      </code>
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                      {page.description}
                                    </p>
                                  </td>

                                  {/* View Column */}
                                  <td className="py-2.5 px-2 text-center">
                                    <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isViewEnabled}
                                        onChange={(e) =>
                                          handleToggle(page.moduleKey, "view", e.target.checked)
                                        }
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                      />
                                    </label>
                                  </td>

                                  {/* Add / Create Column */}
                                  <td className="py-2.5 px-2 text-center">
                                    {page.moduleKey === "PAYMENTS" ? (
                                      <label
                                        className={`inline-flex items-center gap-1 text-[11px] select-none ${
                                          isViewEnabled
                                            ? "text-slate-700 cursor-pointer"
                                            : "text-slate-300 cursor-not-allowed"
                                        }`}
                                        title="Record payment receipt"
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isViewEnabled}
                                          checked={Boolean(isViewEnabled && modulePerms.recordReceipt)}
                                          onChange={(e) =>
                                            handleToggle(page.moduleKey, "recordReceipt", e.target.checked)
                                          }
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                        />
                                        <span className="text-[10px] font-medium">Receipt</span>
                                      </label>
                                    ) : isAddDelegable ? (
                                      <label
                                        className={`inline-flex items-center justify-center p-1 select-none ${
                                          isViewEnabled
                                            ? "cursor-pointer"
                                            : "cursor-not-allowed opacity-40"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isViewEnabled}
                                          checked={Boolean(isViewEnabled && modulePerms.create)}
                                          onChange={(e) =>
                                            handleToggle(page.moduleKey, "create", e.target.checked)
                                          }
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                      </label>
                                    ) : (
                                      <span className="text-slate-300 select-none">—</span>
                                    )}
                                  </td>

                                  {/* Edit / Update Column */}
                                  <td className="py-2.5 px-2 text-center">
                                    {page.moduleKey === "PAYMENTS" ? (
                                      <div className="inline-flex items-center justify-center gap-2">
                                        <label
                                          className={`inline-flex items-center gap-1 text-[11px] select-none ${
                                            isViewEnabled
                                              ? "text-slate-700 cursor-pointer"
                                              : "text-slate-300 cursor-not-allowed opacity-40"
                                          }`}
                                          title="Verify payment receipts"
                                        >
                                          <input
                                            type="checkbox"
                                            disabled={!isViewEnabled}
                                            checked={Boolean(isViewEnabled && modulePerms.verify)}
                                            onChange={(e) =>
                                              handleToggle(page.moduleKey, "verify", e.target.checked)
                                            }
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                          />
                                          <span className="text-[10px] font-medium">Verify</span>
                                        </label>
                                        <label
                                          className={`inline-flex items-center gap-1 text-[11px] select-none ${
                                            isViewEnabled
                                              ? "text-slate-700 cursor-pointer"
                                              : "text-slate-300 cursor-not-allowed opacity-40"
                                          }`}
                                          title="Void or refund payments"
                                        >
                                          <input
                                            type="checkbox"
                                            disabled={!isViewEnabled}
                                            checked={Boolean(isViewEnabled && modulePerms.void)}
                                            onChange={(e) =>
                                              handleToggle(page.moduleKey, "void", e.target.checked)
                                            }
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                          />
                                          <span className="text-[10px] font-medium">Void</span>
                                        </label>
                                      </div>
                                    ) : page.moduleKey === "REPORTS" ? (
                                      <label
                                        className={`inline-flex items-center gap-1 text-[11px] select-none ${
                                          isViewEnabled
                                            ? "text-slate-700 cursor-pointer"
                                            : "text-slate-300 cursor-not-allowed opacity-40"
                                        }`}
                                        title="Export operational & BI reports"
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isViewEnabled}
                                          checked={Boolean(isViewEnabled && modulePerms.export)}
                                          onChange={(e) =>
                                            handleToggle(page.moduleKey, "export", e.target.checked)
                                          }
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <span className="text-[10px] font-medium">Export</span>
                                      </label>
                                    ) : isEditDelegable ? (
                                      <label
                                        className={`inline-flex items-center justify-center p-1 select-none ${
                                          isViewEnabled
                                            ? "cursor-pointer"
                                            : "cursor-not-allowed opacity-40"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isViewEnabled}
                                          checked={Boolean(isViewEnabled && modulePerms.update)}
                                          onChange={(e) =>
                                            handleToggle(page.moduleKey, "update", e.target.checked)
                                          }
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                      </label>
                                    ) : (
                                      <span className="text-slate-300 select-none">—</span>
                                    )}
                                  </td>

                                  {/* Delete Column */}
                                  <td className="py-2.5 px-2 text-center">
                                    {!isDeleteDelegable ? (
                                      <span className="text-slate-300 select-none">—</span>
                                    ) : (
                                      <label
                                        className={`inline-flex items-center justify-center p-1 select-none ${
                                          isViewEnabled
                                            ? "cursor-pointer"
                                            : "cursor-not-allowed opacity-40"
                                        }`}
                                        title={
                                          isViewEnabled
                                            ? "Allow staff to delete/archive records in this module"
                                            : "Enable View first to configure deletion"
                                        }
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isViewEnabled}
                                          checked={Boolean(isViewEnabled && modulePerms.delete)}
                                          onChange={(e) =>
                                            handleToggle(page.moduleKey, "delete", e.target.checked)
                                          }
                                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                      </label>
                                    )}
                                  </td>

                                  {/* Row Quick Toggle Column */}
                                  <td className="py-2.5 px-3 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleRow(page)}
                                      className={`h-6 px-2 text-[10px] font-medium cursor-pointer transition-colors ${
                                        isViewEnabled
                                          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                                          : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                      }`}
                                    >
                                      {isViewEnabled ? "Disable" : "Enable"}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmResetOpen(true)}
              disabled={loading || saving || resetting}
              className="text-xs text-slate-600 hover:text-red-600 hover:border-red-200 gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={saving || resetting}
                className="text-xs text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={loading || saving || resetting}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Permissions</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset Staff Permissions?"
        description={`Are you sure you want to reset ${staffMember.name}'s permissions to standard defaults? Any custom operational permissions will be restored to the baseline consultant profile.`}
        confirmText="Reset to Defaults"
        variant="destructive"
        onConfirm={handleReset}
        loading={resetting}
      />
    </>
  );
}
