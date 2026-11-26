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
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/context/subscription-context";
import { useAuth } from "@/context/auth-context";
import {
  Check,
  Clock,
  Copy,
  Info,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  RotateCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { StaffPermissionsModal } from "./staff-permissions-modal";
import * as React from "react";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string | Date;
}

export interface TeamInvitation {
  id: string;
  agencyId: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string | Date;
  acceptedAt?: string | Date | null;
  revokedAt?: string | Date | null;
  invitedById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export function TeamManagementPanel() {
  const { isReadOnly } = useSubscription();
  const { isAgencyOwner, hasStaffPermission } = useAuth();
  const canInvite = isAgencyOwner || hasStaffPermission("TEAM", "create");
  const canUpdate = isAgencyOwner || hasStaffPermission("TEAM", "update");
  const canDelete = isAgencyOwner || hasStaffPermission("TEAM", "delete");

  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [invitations, setInvitations] = React.useState<TeamInvitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [createdInviteToken, setCreatedInviteToken] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Revoke Dialog State
  const [revokeTarget, setRevokeTarget] = React.useState<TeamInvitation | null>(null);
  const [revoking, setRevoking] = React.useState(false);

  // Resend State
  const [resendingId, setResendingId] = React.useState<string | null>(null);

  // Permissions Modal State
  const [permissionsTarget, setPermissionsTarget] = React.useState<TeamMember | null>(null);

  const fetchTeamData = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/team");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load agency team data.");
      }

      setMembers(json.data.members || []);
      setInvitations(json.data.invitations || []);
    } catch (err: any) {
      setError(err.message || "Failed to load team data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Handle Invite Submission
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setInviting(true);
    setCreatedInviteToken(null);
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: "AGENCY_STAFF" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create staff invitation.");
      }

      toast.success(`Invitation created for ${inviteEmail.trim()}`);
      if (json.data?.rawToken) {
        setCreatedInviteToken(json.data.rawToken);
      } else {
        setInviteModalOpen(false);
        setInviteEmail("");
      }
      await fetchTeamData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to invite staff member.");
    } finally {
      setInviting(false);
    }
  };

  // Handle Revoke
  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;

    setRevoking(true);
    try {
      const res = await fetch(`/api/team/invitations/${revokeTarget.id}/revoke`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to revoke invitation.");
      }

      toast.success(`Invitation for ${revokeTarget.email} has been revoked.`);
      setRevokeTarget(null);
      await fetchTeamData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invitation.");
    } finally {
      setRevoking(false);
    }
  };

  // Handle Resend
  const handleResend = async (inv: TeamInvitation) => {
    setResendingId(inv.id);
    try {
      const res = await fetch(`/api/team/invitations/${inv.id}/resend`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to resend invitation.");
      }

      toast.success(`Fresh invitation link generated for ${inv.email}`);
      await fetchTeamData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/accept-invitation?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");
  const pastInvitations = invitations.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      {/* Header and Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Agency Team & Staff Roles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your travel agency consultants, least-privilege staff roles, and single-use invitations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchTeamData(true)}
            disabled={loading || refreshing}
            className="h-9 px-3 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </Button>

          {canInvite && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setInviteEmail("");
                setCreatedInviteToken(null);
                setInviteModalOpen(true);
              }}
              disabled={isReadOnly}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Team Members</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{members.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">
            {members.filter((m) => m.role === "AGENCY_OWNER").length} Owner(s) •{" "}
            {members.filter((m) => m.role === "AGENCY_STAFF").length} Staff
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Invitations</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{pendingInvitations.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">Single-use links awaiting registration</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Role Security Tier</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">Least-Privilege Staff</div>
          <p className="mt-1 text-[11px] text-slate-500">Financial margins & settings protected</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 text-xs text-rose-800 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Section 1: Active Team Members Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Current Team Members ({members.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Authenticated workspace users</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            Loading team members...
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No team members found for this agency.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/60">
                <tr>
                  <th className="py-2.5 px-4">Member Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Joined On</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const isOwner = member.role === "AGENCY_OWNER";
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                            {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span>{member.name || "Unnamed Consultant"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{member.email}</td>
                      <td className="py-3 px-4">
                        {isOwner ? (
                          <Badge
                            variant="secondary"
                            className="bg-purple-50 text-purple-700 border-purple-200/60 font-semibold gap-1 text-[11px]"
                          >
                            <Shield className="h-3 w-3" />
                            Agency Owner
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-sky-50 text-sky-700 border-sky-200/60 font-medium gap-1 text-[11px]"
                          >
                            <Users className="h-3 w-3" />
                            Agency Staff
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-medium text-[11px]"
                        >
                          Active
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isOwner && isAgencyOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermissionsTarget(member)}
                            className="text-xs h-7 px-2.5 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 gap-1 cursor-pointer"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Permissions
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Pending & Past Invitations Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Staff Invitations ({invitations.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Cryptographic single-use invitation tokens</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending or past invitations found. Click &quot;Invite Staff Member&quot; to send a single-use onboarding link.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/60">
                <tr>
                  <th className="py-2.5 px-4">Invited Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Expires On</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => {
                  const isPending = inv.status === "PENDING";
                  const isAccepted = inv.status === "ACCEPTED";
                  const isExpired = inv.status === "EXPIRED";
                  const isRevoked = inv.status === "REVOKED";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className="bg-sky-50 text-sky-700 border-sky-200/60 text-[11px]"
                        >
                          Agency Staff
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {isPending && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 border-amber-200/60 gap-1 text-[11px]"
                          >
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {isAccepted && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200/60 gap-1 text-[11px]"
                          >
                            <Check className="h-3 w-3" />
                            Accepted
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 border-slate-200 text-[11px]"
                          >
                            Expired
                          </Badge>
                        )}
                        {isRevoked && (
                          <Badge
                            variant="secondary"
                            className="bg-rose-50 text-rose-700 border-rose-200/60 gap-1 text-[11px]"
                          >
                            <XCircle className="h-3 w-3" />
                            Revoked
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPending && (
                          <div className="flex items-center justify-end gap-1.5">
                            {canUpdate && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(inv)}
                                disabled={resendingId === inv.id || isReadOnly}
                                className="h-7 px-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                              >
                                <RefreshCw
                                  className={`h-3 w-3 mr-1 ${resendingId === inv.id ? "animate-spin" : ""}`}
                                />
                                Resend
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevokeTarget(inv)}
                                disabled={isReadOnly}
                                className="h-7 px-2 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Staff Dialog */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-600" />
              Invite Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a secure, single-use onboarding invitation for a travel consultant or operations staff member.
            </DialogDescription>
          </DialogHeader>

          {!createdInviteToken ? (
            <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Invitee Email Address</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    placeholder="consultant@youragency.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-9 text-xs h-9.5 rounded-xl border-slate-200 bg-slate-50/70"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Assigned Team Role</label>
                <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/50 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-sky-900">
                    <span className="font-semibold">Agency Staff (Least-Privilege)</span>
                    <p className="text-[11px] text-sky-800/80 mt-0.5">
                      Can create and manage CRM enquiries, customer profiles, follow-ups, and client itineraries. Internal costs, net supplier rates, profit margins, and billing settings remain strictly hidden.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteModalOpen(false)}
                  disabled={inviting}
                  className="h-9 px-4 rounded-xl border-slate-200 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Generating Link...
                    </>
                  ) : (
                    "Create Invitation"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Invitation Created Successfully!
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-1">
                  Share this single-use onboarding link with the staff member. The token expires in 7 days and will be invalidated once accepted.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Single-Use Registration Link</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/accept-invitation?token=${createdInviteToken}`}
                    className="text-[11px] h-9.5 rounded-xl border-slate-200 bg-slate-100 font-mono text-slate-600 select-all"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyLink(createdInviteToken)}
                    className="h-9.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs font-semibold"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedLink ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  For security, the raw token is shown only once and will never be displayed again. Only the SHA-256 hash is retained on the server.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setCreatedInviteToken(null);
                    setInviteEmail("");
                  }}
                  className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold w-full sm:w-auto"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke Staff Invitation"
        description={
          <span>
            Are you sure you want to revoke the staff invitation for{" "}
            <strong>{revokeTarget?.email}</strong>? The single-use link will be immediately invalidated and cannot be used to join your agency.
          </span>
        }
        confirmText="Revoke Invitation"
        variant="destructive"
        loading={revoking}
        onConfirm={handleConfirmRevoke}
      />

      {/* Staff Permissions Modal */}
      <StaffPermissionsModal
        isOpen={Boolean(permissionsTarget)}
        onClose={() => setPermissionsTarget(null)}
        staffMember={permissionsTarget}
      />
    </div>
  );
}
