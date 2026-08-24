"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileUp,
  Building2,
  Calendar,
  Clock,
  Archive,
  RefreshCw,
  FileCheck,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInventory } from "@/context/inventory-context"
import { HotelRate, MealPlan, RateStatus, Hotel, HotelRoom } from "@/types"
import { toast } from "sonner"

interface ParsedRow {
  rowIndex: number
  hotelName: string
  roomName: string
  mealPlan: string
  baseRate: number
  extraAdultRate?: number
  childRate?: number
  validFrom: string
  validTo: string
  // Validation status
  status: "valid" | "warning" | "error"
  messages: string[]
  matchedHotel?: Hotel
  matchedRoom?: HotelRoom
}

export default function RateSheetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rateSheetId = params.id as string

  const {
    rateSheets,
    suppliers,
    hotels,
    hotelRooms,
    hotelRates,
    updateRateSheet,
    importHotelRates,
    addHotelRoom,
  } = useInventory()

  const rateSheet = rateSheets.find((rs) => rs.id === rateSheetId)
  const supplier = rateSheet ? suppliers.find((s) => s.id === rateSheet.supplierId) : null
  const linkedRates = hotelRates.filter((hr) => hr.rateSheetId === rateSheetId)

  // ─── Import Dialog States ─────────────────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [importStep, setImportStep] = React.useState<"upload" | "preview">("upload")
  const [uploadedFileName, setUploadedFileName] = React.useState("")
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = React.useState(false)

  if (!rateSheet) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
        <PageHeader
          title="Rate Sheet Not Found"
          breadcrumbs={[{ label: "Rate Sheets", href: "/rate-sheets" }, { label: "Not Found" }]}
        />
        <div className="px-4 py-8 md:px-8 max-w-lg">
          <EmptyState
            icon={FileSpreadsheet}
            title="Rate Sheet Not Found"
            description="The requested rate sheet contract does not exist."
            actionText="Back to Rate Sheets"
            onAction={() => router.push("/rate-sheets")}
          />
        </div>
      </div>
    )
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  // ─── Generate & Download Sample Excel Template ────────────────────────
  const handleDownloadSample = () => {
    const sampleData = [
      {
        "Hotel Name": "Parakkat Nature Resort",
        "Room Category": "Premium Valley View Room",
        "Meal Plan": "CPAI",
        "Base Rate (INR)": 5500,
        "Extra Adult Rate": 1500,
        "Child Rate": 800,
        "Valid From (YYYY-MM-DD)": "2026-10-01",
        "Valid To (YYYY-MM-DD)": "2027-03-31",
      },
      {
        "Hotel Name": "Parakkat Nature Resort",
        "Room Category": "Executive Suite",
        "Meal Plan": "MAPAI",
        "Base Rate (INR)": 9500,
        "Extra Adult Rate": 2000,
        "Child Rate": 1000,
        "Valid From (YYYY-MM-DD)": "2026-10-01",
        "Valid To (YYYY-MM-DD)": "2027-03-31",
      },
      {
        "Hotel Name": "Munnar Valley Retreat",
        "Room Category": "Premium Room",
        "Meal Plan": "CPAI",
        "Base Rate (INR)": 5500,
        "Extra Adult Rate": 1400,
        "Child Rate": 700,
        "Valid From (YYYY-MM-DD)": "2026-10-01",
        "Valid To (YYYY-MM-DD)": "2027-03-31",
      },
      {
        "Hotel Name": "Kerala Backwater Lake Resort",
        "Room Category": "Lake View Cottage",
        "Meal Plan": "CPAI",
        "Base Rate (INR)": 8500,
        "Extra Adult Rate": 2500,
        "Child Rate": 1200,
        "Valid From (YYYY-MM-DD)": "2026-09-01",
        "Valid To (YYYY-MM-DD)": "2027-04-30",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Hotel_Rates")
    XLSX.writeFile(wb, `TripDesk_Rate_Sheet_Template.xlsx`)
    toast.success("Sample template downloaded.")
  }

  // ─── File Upload & Parse ──────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

        if (rawData.length === 0) {
          toast.error("The uploaded file is empty.")
          return
        }

        // Validate and map rows
        const processed: ParsedRow[] = rawData.map((row, index) => {
          const hotelName = String(row["Hotel Name"] || row["hotel_name"] || row["Hotel"] || "").trim()
          const roomName = String(row["Room Category"] || row["room_category"] || row["Room"] || "").trim()
          const mealPlanRaw = String(row["Meal Plan"] || row["meal_plan"] || row["Plan"] || "CPAI").trim().toUpperCase()
          const baseRate = Number(row["Base Rate (INR)"] || row["Base Rate"] || row["base_rate"] || row["Rate"] || 0)
          const extraAdultRate = Number(row["Extra Adult Rate"] || row["extra_adult"] || 0)
          const childRate = Number(row["Child Rate"] || row["child_rate"] || 0)
          const validFrom = String(row["Valid From (YYYY-MM-DD)"] || row["valid_from"] || rateSheet.validFrom).trim()
          const validTo = String(row["Valid To (YYYY-MM-DD)"] || row["valid_to"] || rateSheet.validTo).trim()

          const messages: string[] = []
          let status: "valid" | "warning" | "error" = "valid"

          // 1. Hotel Matching
          const matchedHotel = hotels.find(
            (h) => h.name.toLowerCase() === hotelName.toLowerCase()
          )

          if (!matchedHotel) {
            status = "error"
            messages.push(`Hotel "${hotelName}" not found in inventory. Create hotel first.`)
          }

          // 2. Room Matching
          let matchedRoom: HotelRoom | undefined
          if (matchedHotel) {
            matchedRoom = hotelRooms.find(
              (r) => r.hotelId === matchedHotel.id && r.name.toLowerCase() === roomName.toLowerCase()
            )
            if (!matchedRoom) {
              status = status === "error" ? "error" : "warning"
              messages.push(`Room "${roomName}" does not exist. Will be auto-created.`)
            }
          }

          // 3. Meal Plan Validation
          const validPlans = ["RO", "CPAI", "MAPAI", "APAI"]
          if (!validPlans.includes(mealPlanRaw)) {
            status = "error"
            messages.push(`Invalid Meal Plan "${mealPlanRaw}". Must be RO, CPAI, MAPAI or APAI.`)
          }

          // 4. Base Rate Validation
          if (isNaN(baseRate) || baseRate <= 0) {
            status = "error"
            messages.push("Base rate must be a positive number.")
          }

          // 5. Duplicate Check
          if (matchedHotel && matchedRoom) {
            const isDuplicate = hotelRates.some(
              (hr) =>
                hr.hotelId === matchedHotel.id &&
                hr.roomId === matchedRoom?.id &&
                hr.mealPlan === mealPlanRaw &&
                hr.validFrom === validFrom &&
                hr.status === "Active"
            )
            if (isDuplicate) {
              status = status === "error" ? "error" : "warning"
              messages.push("Matching rate already exists. This will update/supplement it.")
            }
          }

          return {
            rowIndex: index + 1,
            hotelName: hotelName || "Unnamed Hotel",
            roomName: roomName || "Standard Room",
            mealPlan: mealPlanRaw as MealPlan,
            baseRate,
            extraAdultRate,
            childRate,
            validFrom,
            validTo,
            status,
            messages,
            matchedHotel,
            matchedRoom,
          }
        })

        setParsedRows(processed)
        setImportStep("preview")
      } catch (err) {
        console.error(err)
        toast.error("Failed to parse file. Ensure it is a valid .xlsx or .csv.")
      }
    }
    reader.readAsBinaryString(file)
  }

  // ─── Execute Import ───────────────────────────────────────────────────
  const handleExecuteImport = () => {
    setIsImporting(true)
    const validRowsToImport = parsedRows.filter((r) => r.status !== "error")

    if (validRowsToImport.length === 0) {
      toast.error("No valid rows to import. Please resolve the errors.")
      setIsImporting(false)
      return
    }

    // Auto-create missing rooms if needed
    const newRatesPayload: Omit<HotelRate, "id" | "createdAt" | "updatedAt">[] = []

    validRowsToImport.forEach((row) => {
      if (!row.matchedHotel) return

      let roomId = row.matchedRoom?.id
      if (!roomId) {
        // Auto-create room
        const createdRoom = addHotelRoom({
          hotelId: row.matchedHotel.id,
          name: row.roomName,
          maxAdults: 2,
          maxChildren: 1,
          bedType: "King Bed",
          status: "Active",
        })
        roomId = createdRoom.id
      }

      newRatesPayload.push({
        hotelId: row.matchedHotel.id,
        roomId,
        rateSheetId: rateSheet.id,
        mealPlan: row.mealPlan as MealPlan,
        currency: "INR",
        baseRate: row.baseRate,
        occupancyAdults: 2,
        occupancyChildren: 0,
        extraAdultRate: row.extraAdultRate || 0,
        childRate: row.childRate || 0,
        validFrom: row.validFrom,
        validTo: row.validTo,
        status: "Active",
        sourceType: "Excel",
        notes: `Imported from ${uploadedFileName}`,
      })
    })

    const count = importHotelRates(newRatesPayload)

    // Update rate sheet fileName
    updateRateSheet(rateSheet.id, {
      fileName: uploadedFileName,
      status: "Active",
    })

    setIsImporting(false)
    setIsImportModalOpen(false)
    setImportStep("upload")
    setParsedRows([])
    toast.success(`Successfully imported ${count} B2B contract rates from ${uploadedFileName}!`)
  }

  const validCount = parsedRows.filter((r) => r.status === "valid").length
  const warningCount = parsedRows.filter((r) => r.status === "warning").length
  const errorCount = parsedRows.filter((r) => r.status === "error").length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Hero Command Header */}
        <div className="flex flex-col gap-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Top Title & Telemetry Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Link
                  href="/rate-sheets"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <FileSpreadsheet className="h-3 w-3 text-indigo-500" />
                  Tariff Contract
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {rateSheet.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    rateSheet.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${rateSheet.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {rateSheet.status}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {rateSheet.name}
                </h1>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {rateSheet.sourceType} Format
                </span>
              </div>

              {/* Micro-Telemetry Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {supplier && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                    <span>Partner:</span>
                    <Link href={`/suppliers/${supplier.id}`} className="font-bold text-indigo-600 hover:underline">
                      {supplier.name}
                    </Link>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  <span className="font-bold text-blue-950">Validity:</span>
                  <span>{formatDate(rateSheet.validFrom)} → {formatDate(rateSheet.validTo)}</span>
                </div>
                {rateSheet.fileName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-mono text-[11px]">
                    <span>📄 {rateSheet.fileName}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span className="font-bold text-emerald-950">{linkedRates.length}</span> Rates Loaded
                </div>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2.5 z-10 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                Template
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setImportStep("upload")
                  setParsedRows([])
                  setIsImportModalOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer shadow-xs"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import Excel / CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Rates Content Container */}
        <div className="space-y-6">
        {/* Linked Rates Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Rates Linked to this Contract ({linkedRates.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                All B2B room rates active and mapped under this supplier contract.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImportStep("upload")
                setIsImportModalOpen(true)
              }}
              className="text-xs font-semibold bg-white border-slate-200"
            >
              <FileUp className="h-3.5 w-3.5 mr-1" />
              Upload Tariff
            </Button>
          </div>

          {linkedRates.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No rates in this sheet yet"
              description="Click 'Import Excel / CSV' to upload your supplier's contracted rate sheet in seconds."
              actionText="Import Rates Now"
              onAction={() => {
                setImportStep("upload")
                setIsImportModalOpen(true)
              }}
            />
          ) : (
            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Hotel / Property</th>
                      <th className="py-3.5 px-4 font-bold">Room Category</th>
                      <th className="py-3.5 px-4 font-bold">Meal Plan</th>
                      <th className="py-3.5 px-4 font-bold">Base Rate (Net)</th>
                      <th className="py-3.5 px-4 font-bold">Extra Person Rates</th>
                      <th className="py-3.5 px-4 font-bold">Validity Range</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {linkedRates.map((rate) => {
                      const hotel = hotels.find((h) => h.id === rate.hotelId)
                      const room = hotelRooms.find((r) => r.id === rate.roomId)

                      return (
                        <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Hotel */}
                          <td className="py-3.5 px-4">
                            <Link href={`/hotels/${rate.hotelId}`} className="font-bold text-slate-900 hover:text-indigo-600">
                              {hotel?.name || rate.hotelId}
                            </Link>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {hotel?.destination}
                            </div>
                          </td>

                          {/* Room */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {room?.name || rate.roomId}
                          </td>

                          {/* Meal Plan */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {rate.mealPlan}
                            </span>
                          </td>

                          {/* Base Rate */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                            ₹{rate.baseRate.toLocaleString("en-IN")}
                            <span className="text-[10px] text-slate-400 font-normal block">/ night</span>
                          </td>

                          {/* Extra Person */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>Adult: {rate.extraAdultRate ? `₹${rate.extraAdultRate}` : "—"}</div>
                            <div className="text-[11px] text-slate-400">Child: {rate.childRate ? `₹${rate.childRate}` : "—"}</div>
                          </td>

                          {/* Validity */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                            {formatDate(rate.validFrom)} → {formatDate(rate.validTo)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {rate.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Interactive Rate Import Dialog ─────────────────────────────────── */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              <span>Import Contract Rates from Excel / CSV</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Upload your supplier's rate sheet. TripDesk parses the columns, verifies against existing inventory, and validates data integrity.
            </DialogDescription>
          </DialogHeader>

          {importStep === "upload" && (
            <div className="space-y-5 py-4">
              {/* Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Upload className="h-6 w-6 stroke-[1.8]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Select or Drag & Drop Rate Sheet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) spreadsheets formatted with standard column headers.
                </p>

                <div className="mt-4">
                  <label className="cursor-pointer">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4"
                      onClick={() => document.getElementById("file-upload-input")?.click()}
                    >
                      Browse Files
                    </Button>
                    <input
                      id="file-upload-input"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Template Helper Card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">Need the standard import format?</div>
                    <div className="text-slate-500 text-[11px]">Download our pre-configured template with sample rows.</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  className="bg-white border-slate-200 text-xs font-semibold h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Sample
                </Button>
              </div>
            </div>
          )}

          {importStep === "preview" && (
            <div className="space-y-4 py-2">
              {/* Validation Summary Bar */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">File: {uploadedFileName}</span>
                  <span className="text-slate-400 font-mono">({parsedRows.length} rows parsed)</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    <CheckCircle2 className="h-3 w-3" />
                    {validCount} Valid
                  </span>
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                      <AlertTriangle className="h-3 w-3" />
                      {warningCount} Warnings
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px]">
                      <XCircle className="h-3 w-3" />
                      {errorCount} Errors
                    </span>
                  )}
                </div>
              </div>

              {/* Rows Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 uppercase font-bold text-[10px] tracking-wider z-10 select-none">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Hotel</th>
                      <th className="py-2.5 px-3">Room Category</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Rate (INR)</th>
                      <th className="py-2.5 px-3">Validity</th>
                      <th className="py-2.5 px-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.status === "error"
                            ? "bg-red-50/40"
                            : row.status === "warning"
                            ? "bg-amber-50/40"
                            : "hover:bg-slate-50"
                        }
                      >
                        <td className="py-2 px-3 font-mono text-slate-400">{row.rowIndex}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{row.hotelName}</td>
                        <td className="py-2 px-3 text-slate-700">{row.roomName}</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-[10px] px-1.5 py-0.2 bg-slate-100 rounded">
                            {row.mealPlan}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          ₹{row.baseRate.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                          {row.validFrom} → {row.validTo}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === "valid" ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </span>
                          ) : row.status === "warning" ? (
                            <div className="text-amber-700 font-semibold text-[10px]">
                              {row.messages.join(", ")}
                            </div>
                          ) : (
                            <div className="text-red-600 font-bold text-[10px] flex items-center gap-1">
                              <XCircle className="h-3 w-3 shrink-0" />
                              <span>{row.messages.join(", ")}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex justify-between sm:justify-between items-center gap-2">
            {importStep === "preview" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportStep("upload")}
                  className="bg-white border-slate-200 text-xs"
                >
                  Choose Different File
                </Button>
                <div className="flex gap-2">
                  <DialogClose
                    render={
                      <Button type="button" variant="ghost" size="sm" className="text-xs">
                        Cancel
                      </Button>
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={validCount + warningCount === 0 || isImporting}
                    onClick={handleExecuteImport}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 shadow-xs"
                  >
                    {isImporting ? "Importing..." : `Import ${validCount + warningCount} Valid Rates`}
                  </Button>
                </div>
              </>
            ) : (
              <DialogClose
                render={
                  <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs">
                    Close
                  </Button>
                }
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
