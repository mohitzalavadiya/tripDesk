"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Activity,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  Code,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionFilter, setActionFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedLog, setSelectedLog] = React.useState<any | null>(null);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.listAuditLogs({
        action: actionFilter !== "ALL" ? actionFilter : undefined,
        limit: 100,
      });
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = React.useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        (l.agencyId && l.agencyId.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Platform Governance & Audit Logs"
          description="SaaS administrative audit trail tracking privileged mutations, plan revisions, suspensions, and trial extensions."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Audit Logs" }]}
          primaryAction={{
            label: "Refresh Audit Stream",
            onClick: fetchLogs,
            icon: RefreshCw,
          }}
        />

        {/* ─── FILTERS ────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Action, Entity, Agency ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                if (val) setActionFilter(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[190px]">
                <SelectValue placeholder="Filter Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="AGENCY_SUSPENDED">Agency Suspended</SelectItem>
                <SelectItem value="AGENCY_REACTIVATED">Agency Reactivated</SelectItem>
                <SelectItem value="TRIAL_EXTENDED">Trial Extended</SelectItem>
                <SelectItem value="PLAN_CREATED">Plan Created</SelectItem>
                <SelectItem value="PLAN_UPDATED">Plan Updated</SelectItem>
                <SelectItem value="ANNOUNCEMENT_CREATED">Announcement Created</SelectItem>
                <SelectItem value="PLATFORM_SETTINGS_UPDATED">Settings Updated</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-slate-500 font-medium">({filteredLogs.length} Events)</span>
          </div>
        </div>

        {/* ─── AUDIT LOGS TABLE ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Timestamp</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Action Type</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Entity</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Target Context</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600 text-right pr-6">Inspect Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">
                    Loading audit stream...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="py-3 text-xs text-slate-500 font-medium">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-bold text-slate-900">{log.action}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-[11px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-bold">
                        {log.entityType}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 font-mono">
                      {log.agencyId ? `Agency: ${log.agencyId.slice(0, 10)}...` : "Platform-wide"}
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Code className="h-3.5 w-3.5 mr-1" /> View JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── JSON PAYLOAD INSPECTOR MODAL ────────────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Audit Event Metadata</h3>
              <span className="text-xs font-bold text-purple-700">{selectedLog.action}</span>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[300px]">
              <pre>{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
