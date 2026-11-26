import fs from "fs";

let content = fs.readFileSync("src/app/(dashboard)/enquiries/[id]/page.tsx", "utf8");
const isCrlf = content.includes("\r\n");
if (isCrlf) {
  content = content.replace(/\r\n/g, "\n");
}

// 1. Update fetchEnquiry definition to accept isSilent?: boolean
const oldFetchDef = `  // Fetch real enquiry details and CRM timeline
  const fetchEnquiry = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);`;

const newFetchDef = `  // Fetch real enquiry details and CRM timeline
  const fetchEnquiry = React.useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);`;

if (!content.includes(oldFetchDef)) {
  console.error("oldFetchDef not found!");
  process.exit(1);
}

content = content.replace(oldFetchDef, newFetchDef);

// 2. Update finally block
const oldFinally = `    } finally {
      setLoading(false);
    }
  }, [id]);`;

const newFinally = `    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);`;

content = content.replace(oldFinally, newFinally);

// 3. Replace post-mutation fetchEnquiry() calls with fetchEnquiry(true)
content = content.replace("await fetchEnquiry();\n  };", "await fetchEnquiry(true);\n  };"); // handleQuickLogSuccess
content = content.replace("setAssignModalOpen(false);\n      await fetchEnquiry();", "setAssignModalOpen(false);\n      await fetchEnquiry(true);"); // handleAssignSuccess
content = content.replace("toast.success(\"Internal notes updated.\");\n      await fetchEnquiry();", "toast.success(\"Internal notes updated.\");\n      await fetchEnquiry(true);"); // handleSaveInternalNotes
content = content.replace("toast.success(\"Lead stage updated successfully!\");\n      await fetchEnquiry();", "toast.success(\"Lead stage updated successfully!\");\n      await fetchEnquiry(true);"); // handleTransitionStage
content = content.replace("toast.success(\"Enquiry marked as Lost.\");\n      await fetchEnquiry();", "toast.success(\"Enquiry marked as Lost.\");\n      await fetchEnquiry(true);"); // handleMarkLost
content = content.replace("toast.success(\"Lead successfully reopened!\");\n      await fetchEnquiry();", "toast.success(\"Lead successfully reopened!\");\n      await fetchEnquiry(true);"); // handleReopenLead

// 4. Enhance timeline card rendering
const oldTimelineCard = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-slate-900">{ev.title}</span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(ev.timestamp).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{ev.description}</p>`;

const newTimelineCard = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{ev.title}</span>
                              {ev.actorName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  <Users className="h-2.5 w-2.5 text-indigo-500" />
                                  <span>by {ev.actorName} {ev.actorRole ? \`(\${ev.actorRole === "AGENCY_OWNER" ? "Owner" : "Staff"})\` : ""}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {new Date(ev.timestamp).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{ev.description}</p>
                          {ev.changes && ev.changes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Modifications:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                                {ev.changes.map((c, idx) => (
                                  <div key={idx} className="bg-white/80 p-1.5 rounded-lg border border-slate-200/70">
                                    <span className="font-semibold text-slate-700">{c.label || c.field}: </span>
                                    <span className="line-through text-slate-400 mr-1">{String(c.oldValue ?? "empty")}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-teal-700 font-semibold ml-1">{String(c.newValue ?? "empty")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}`;

if (!content.includes(oldTimelineCard)) {
  console.error("oldTimelineCard not found!");
  process.exit(1);
}

content = content.replace(oldTimelineCard, newTimelineCard);

if (isCrlf) {
  content = content.replace(/\n/g, "\r\n");
}

fs.writeFileSync("src/app/(dashboard)/enquiries/[id]/page.tsx", content, "utf8");
console.log("Updated enquiries/[id]/page.tsx successfully!");
