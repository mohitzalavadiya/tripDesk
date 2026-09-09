"use client";

import * as React from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export type ImportType = "hotels" | "rate-sheets";
export type ImportMode = "SKIP" | "UPDATE" | "REJECT";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportType;
  title: string;
  onSuccess: () => void;
  onDownloadSample: () => Promise<void>;
  onPreview: (file: File, mode: ImportMode) => Promise<any>;
  onExecute: (file: File, mode: ImportMode) => Promise<any>;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  importType,
  title,
  onSuccess,
  onDownloadSample,
  onPreview,
  onExecute,
}: ExcelImportModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState<ImportMode>("SKIP");
  const [loading, setLoading] = React.useState(false);
  const [downloadingSample, setDownloadingSample] = React.useState(false);

  // Preview data
  const [previewResult, setPreviewResult] = React.useState<any | null>(null);

  // Execution result
  const [executeResult, setExecuteResult] = React.useState<any | null>(null);

  // Reset state on open/close
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedFile(null);
      setMode("SKIP");
      setPreviewResult(null);
      setExecuteResult(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        toast.error("Please select a valid .xlsx Excel file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size cannot exceed 5 MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadSample = async () => {
    try {
      setDownloadingSample(true);
      await onDownloadSample();
      toast.success("Sample template downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download sample file.");
    } finally {
      setDownloadingSample(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error("Please select an Excel file to upload.");
      return;
    }

    try {
      setLoading(true);
      const res = await onPreview(selectedFile, mode);
      if (res.success && res.data) {
        setPreviewResult(res.data);
        setStep(2);
      } else {
        toast.error(res.error?.message || "Failed to parse Excel file.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process preview.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const res = await onExecute(selectedFile, mode);
      if (res.success && res.data) {
        setExecuteResult(res.data);
        setStep(3);
        toast.success(`Import completed: ${res.data.imported} new, ${res.data.updated} updated.`);
        onSuccess();
      } else {
        toast.error(res.error?.message || "Failed to execute import.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute import batch.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!executeResult?.errors || executeResult.errors.length === 0) return;

    const wb = XLSX.utils.book_new();
    const rows = [
      ["Row Number", "Item Identifier", "Error Description"],
      ...executeResult.errors.map((e: any) => [
        e.row,
        e.name || e.hotelCode || "—",
        e.error,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Import Errors");
    XLSX.writeFile(wb, `${importType}_import_errors.xlsx`);
  };

  const summary = previewResult?.summary;
  const rows = previewResult?.rows || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">{title}</h2>
              <p className="text-xs text-slate-500">
                Step {step} of 3:{" "}
                {step === 1 ? "Upload & Options" : step === 2 ? "Preview & Validation" : "Import Results"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Upload & Mode Selection */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Sample Download Banner */}
              <div className="p-4.5 rounded-xl bg-indigo-50/60 border border-indigo-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                    Need the formatted Excel template?
                  </div>
                  <p className="text-xs text-indigo-700/90">
                    Download the pre-structured sample file with instructions and required column formats.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  disabled={downloadingSample}
                  className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
                >
                  {downloadingSample ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Download Sample
                </Button>
              </div>

              {/* Drag & Drop File Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Excel File (.xlsx)
                </label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 shadow-2xs transition-colors">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          Click to browse or drag & drop your Excel file
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Microsoft Excel (.xlsx) up to 5 MB (Max 1,000 rows)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Mode */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Duplicate Matching Action
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "SKIP",
                      title: "Skip Existing",
                      desc: "Keep current records unchanged and skip matching rows.",
                    },
                    {
                      id: "UPDATE",
                      title: "Update Existing",
                      desc: "Update matching records with values from the Excel sheet.",
                    },
                    {
                      id: "REJECT",
                      title: "Reject on Duplicate",
                      desc: "Reject any rows that match an existing record as errors.",
                    },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setMode(opt.id as ImportMode)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        mode === opt.id
                          ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="importMode"
                          checked={mode === opt.id}
                          onChange={() => setMode(opt.id as ImportMode)}
                          className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-5.5 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation Table */}
          {step === 2 && summary && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Rows</span>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">{summary.totalRows}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">New (Create)</span>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{summary.createCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                    {mode === "SKIP" ? "Skipped" : mode === "UPDATE" ? "Updated" : "Duplicates"}
                  </span>
                  <p className="text-lg font-extrabold text-amber-700 mt-0.5">
                    {mode === "SKIP" ? summary.skipCount : mode === "UPDATE" ? summary.updateCount : summary.errorRows}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Valid Total</span>
                  <p className="text-lg font-extrabold text-blue-700 mt-0.5">{summary.validRows}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Errors</span>
                  <p className="text-lg font-extrabold text-rose-700 mt-0.5">{summary.errorRows}</p>
                </div>
              </div>

              {/* Alert if errors exist */}
              {summary.errorRows > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <span className="font-bold">{summary.errorRows} row(s) have errors</span> and will be excluded. You can still proceed to import the remaining <span className="font-bold">{summary.validRows} valid row(s)</span>.
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[340px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 sticky top-0 z-10 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                      <tr>
                        <th className="py-2.5 px-3 w-12 border-b border-slate-200">#</th>
                        {importType === "hotels" ? (
                          <>
                            <th className="py-2.5 px-3 border-b border-slate-200">Hotel Name</th>
                            <th className="py-2.5 px-3 border-b border-slate-200">City</th>
                            <th className="py-2.5 px-3 border-b border-slate-200">Category</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-3 border-b border-slate-200">Hotel Code</th>
                            <th className="py-2.5 px-3 border-b border-slate-200">Room Type</th>
                            <th className="py-2.5 px-3 border-b border-slate-200">Plan</th>
                            <th className="py-2.5 px-3 border-b border-slate-200">Validity</th>
                            <th className="py-2.5 px-3 border-b border-slate-200">Rate</th>
                          </>
                        )}
                        <th className="py-2.5 px-3 border-b border-slate-200 w-24">Status</th>
                        <th className="py-2.5 px-3 border-b border-slate-200">Details / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r: any) => {
                        const isErr = r.status === "ERROR" || r.status === "REJECT";
                        const isSkip = r.status === "SKIP";
                        const isUpdate = r.status === "UPDATE";
                        const isVal = r.status === "VALID";

                        return (
                          <tr
                            key={r.rowNumber}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isErr ? "bg-rose-50/40" : isSkip ? "bg-slate-50/40" : isUpdate ? "bg-amber-50/30" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">{r.rowNumber}</td>
                            {importType === "hotels" ? (
                              <>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{r.name || "—"}</td>
                                <td className="py-2.5 px-3 text-slate-600">{r.city || "—"}</td>
                                <td className="py-2.5 px-3 text-slate-500">{r.category || "—"}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{r.hotelCode || "—"}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-900">{r.roomType || "—"}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-700">{r.mealPlan || "—"}</td>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  {r.validFrom} → {r.validTo}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">₹{r.costPrice}</td>
                              </>
                            )}
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                                  isVal
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isUpdate
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : isSkip
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {r.errors?.length > 0 ? (
                                <span className="text-rose-600 font-semibold">{r.errors.join("; ")}</span>
                              ) : r.warnings?.length > 0 ? (
                                <span className="text-amber-700">{r.warnings.join("; ")}</span>
                              ) : (
                                <span className="text-emerald-700 font-medium">Ready to create</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Execution Breakdown & Results */}
          {step === 3 && executeResult && (
            <div className="space-y-6 text-center py-4">
              <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">Import Batch Completed</h3>
                <p className="text-xs text-slate-500">
                  Your Excel file was processed and written to the database.
                </p>
              </div>

              {/* Execution Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-xs font-bold text-emerald-800">Created</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{executeResult.imported}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
                  <span className="text-xs font-bold text-blue-800">Updated</span>
                  <p className="text-2xl font-black text-blue-700 mt-1">{executeResult.updated}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">Skipped</span>
                  <p className="text-2xl font-black text-slate-700 mt-1">{executeResult.skipped}</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80">
                  <span className="text-xs font-bold text-rose-800">Failed</span>
                  <p className="text-2xl font-black text-rose-700 mt-1">{executeResult.failed}</p>
                </div>
              </div>

              {/* Error Report Download if any failures */}
              {executeResult.failed > 0 && (
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 max-w-2xl mx-auto flex items-center justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-rose-900">
                      {executeResult.failed} row(s) encountered validation or database errors.
                    </p>
                    <p className="text-[11px] text-rose-700">
                      Download the error report to review the issues.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadErrorReport}
                    className="border-rose-200 text-rose-700 hover:bg-rose-100/60 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Error Report
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          {step === 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedFile || loading}
                onClick={handlePreview}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 cursor-pointer shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Preview & Validate
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 2 && summary && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setStep(1)}
                className="text-xs text-slate-700 cursor-pointer font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to File
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!summary.validRows || loading}
                  onClick={handleExecute}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Execute Import ({summary.validRows} rows)
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 cursor-pointer shadow-xs"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
