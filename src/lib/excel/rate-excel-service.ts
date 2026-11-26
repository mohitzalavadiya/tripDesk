import { ValidationError } from "@/lib/api";
import prisma from "@/lib/prisma";
import { isValidDecimal } from "@/lib/validation/field-validators";
import readXlsxFile from "read-excel-file/node";
import "server-only";
import writeXlsxFile, { type Cell, type Sheet } from "write-excel-file/node";
import { ImportMode } from "./hotel-excel-service";

function toSheetData(rows: (string | number | boolean | Date | null | undefined)[][]): Cell[][] {
  return rows.map((row) => row.map((v) => ({ value: v ?? undefined })));
}

export interface RatePreviewRow {
  rowNumber: number;
  hotelCode: string;
  hotelName?: string | null;
  hotelId?: string | null;
  roomType: string;
  mealPlan: string;
  seasonName: string | null;
  validFrom: string; // formatted DD-MM-YYYY
  validTo: string;   // formatted DD-MM-YYYY
  validFromDate?: Date;
  validToDate?: Date;
  costPrice: number;
  extraAdultRate: number | null;
  extraChildRate: number | null;
  notes: string | null;
  status: "VALID" | "WARNING" | "ERROR" | "SKIP" | "UPDATE" | "REJECT";
  existingRateSheetId?: string | null;
  errors: string[];
  warnings: string[];
}

export interface RatePreviewResult {
  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    skipCount: number;
    updateCount: number;
    createCount: number;
  };
  rows: RatePreviewRow[];
  canExecute: boolean;
}

export interface RateExecuteResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    hotelCode: string;
    roomType: string;
    error: string;
  }>;
}

const ALLOWED_MEAL_PLANS = ["EP", "CP", "MAP", "AP"] as const;

/**
 * Parses and normalizes diverse date representations (DD-MM-YYYY string, Date object, Excel serial number).
 */
function parseExcelDate(raw: any): { date: Date | null; error?: string; formattedStr?: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { date: null, error: "Date is required." };
  }

  // Handle JS Date object from XLSX cellDates: true
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) {
      return { date: null, error: "Invalid date object." };
    }
    const day = String(raw.getUTCDate()).padStart(2, "0");
    const month = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const year = raw.getUTCFullYear();
    // Normalize to UTC start of day
    const normalized = new Date(Date.UTC(year, raw.getUTCMonth(), raw.getUTCDate()));
    return { date: normalized, formattedStr: `${day}-${month}-${year}` };
  }

  // Handle numeric Excel date serial
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const utcDays = raw > 59 ? raw - 1 : raw;
    const normalized = new Date(Date.UTC(1899, 11, 31) + utcDays * 86400000);
    if (!isNaN(normalized.getTime())) {
      const day = String(normalized.getUTCDate()).padStart(2, "0");
      const month = String(normalized.getUTCMonth() + 1).padStart(2, "0");
      return { date: normalized, formattedStr: `${day}-${month}-${normalized.getUTCFullYear()}` };
    }
  }

  const str = String(raw).trim();

  // Match DD-MM-YYYY or DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12) {
      return { date: null, error: `Invalid month: '${month}' in date '${str}'.` };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return { date: null, error: `Invalid day: '${day}' for month '${month}' in date '${str}'.` };
    }

    const normalized = new Date(Date.UTC(year, month - 1, day));
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    return { date: normalized, formattedStr: `${dayStr}-${monthStr}-${year}` };
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (month < 1 || month > 12) {
      return { date: null, error: `Invalid month in date '${str}'.` };
    }
    const normalized = new Date(Date.UTC(year, month - 1, day));
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    return { date: normalized, formattedStr: `${dayStr}-${monthStr}-${year}` };
  }

  return { date: null, error: `Invalid date format '${str}'. Expected DD-MM-YYYY (e.g. 01-04-2026).` };
}

/**
 * Checks if two date ranges overlap: (StartA <= EndB) and (EndA >= StartB).
 */
function datesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() <= endB.getTime() && endA.getTime() >= startB.getTime();
}

/**
 * Sanitizes cell values to protect against formula injection.
 */
function sanitizeCellValue(val: any): string | null {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str === "") return null;
  if (/^[=+\-@\t\r]/.test(str) && isNaN(Number(str))) {
    str = `'${str}`;
  }
  return str;
}

/**
 * Parses numeric cell values.
 */
function parseNumericCell(val: any): { num: number | null; error?: string } {
  if (val === null || val === undefined || String(val).trim() === "") {
    return { num: null };
  }
  // Remove currency symbols, commas
  const cleaned = String(val).replace(/[₹$,\s]/g, "").trim();
  if (cleaned === "") return { num: null };

  if (!isValidDecimal(cleaned, { min: 0 })) {
    return { num: null, error: `Invalid numeric value: '${val}'. Must be a valid non-negative number.` };
  }
  const parsed = Number(cleaned);
  return { num: parsed };
}

export const rateExcelService = {
  /**
   * Generates the official sample workbook `Hotel_Rates.xlsx` with Instructions, Rates, and agency-scoped Hotels Reference.
   */
  async generateSampleWorkbook(agencyId: string): Promise<Buffer> {
    // Sheet 1: Instructions
    const instructionsData = [
      ["YOUR TRAVEL DESK — HOTEL RATES IMPORT INSTRUCTIONS"],
      [],
      ["FIELD NAME", "REQUIRED", "DESCRIPTION", "ALLOWED VALUES / FORMAT"],
      ["Hotel Code", "YES", "Exact code from your Hotels master", "HTL-0001 (See 'Hotels Reference' sheet)"],
      ["Room Type", "YES", "Room category / type", "Deluxe Room, Suite, Villa, etc."],
      ["Meal Plan", "YES", "Canonical meal plan code", "EP, CP, MAP, AP"],
      ["Season", "NO", "Optional season descriptor", "Peak Season, Summer, Monsoon, Regular"],
      ["Valid From", "YES", "Validity start date", "DD-MM-YYYY (e.g. 01-04-2026)"],
      ["Valid To", "YES", "Validity end date", "DD-MM-YYYY (e.g. 30-06-2026)"],
      ["Cost Price", "YES", "Base contract rate (net purchase price)", "Numeric non-negative (e.g. 4500)"],
      ["Extra Adult", "NO", "Cost for additional adult occupant", "Numeric non-negative (e.g. 1500)"],
      ["Extra Child", "NO", "Cost for additional child occupant", "Numeric non-negative (e.g. 800)"],
      ["Notes", "NO", "Remarks, blackout dates, inclusions", "Includes breakfast, free Wi-Fi, GST extra"],
      [],
      ["MEAL PLAN DEFINITIONS:"],
      ["EP  = European Plan (Room Only)"],
      ["CP  = Continental Plan (Room + Breakfast)"],
      ["MAP = Modified American Plan (Room + Breakfast + One Main Meal)"],
      ["AP  = American Plan (Room + Breakfast + Lunch + Dinner)"],
      [],
      ["IMPORTANT RATE OVERLAP RULES:"],
      ["1. For the same Hotel Code + Room Type + Meal Plan, overlapping validity periods are NOT allowed."],
      ["2. Adjacent periods are valid (e.g. 01-04-2026 to 30-06-2026 and 01-07-2026 to 30-09-2026)."],
      ["3. Different Meal Plans for the same Room Type may share the exact same dates."],
      ["4. One Hotel can have multiple Room Types in this sheet. No separate Room Type import is needed."],
      ["5. Hotel Code is mandatory and must exist in your agency's Hotel Master."],
      ["6. Supported file format: .xlsx (Max 5 MB, Max 1,000 rows)."],
    ];

    // Fetch agency's actual hotels for reference and realistic examples
    const agencyHotels = await prisma.hotel.findMany({
      where: { agencyId, archivedAt: null },
      orderBy: [{ name: "asc" }],
      select: { hotelCode: true, name: true, city: true, category: true },
      take: 100,
    });

    const sampleHotelCode1 = agencyHotels[0]?.hotelCode || "HTL-0001";
    const sampleHotelCode2 = agencyHotels[1]?.hotelCode || "HTL-0002";

    // Sheet 2: Rates (The actual import sheet)
    const ratesData = [
      [
        "Hotel Code",
        "Room Type",
        "Meal Plan",
        "Season",
        "Valid From",
        "Valid To",
        "Cost Price",
        "Extra Adult",
        "Extra Child",
        "Notes",
      ],
      [
        sampleHotelCode1,
        "Deluxe Room",
        "CP",
        "Summer Season",
        "01-04-2026",
        "30-06-2026",
        4500,
        1500,
        800,
        "Includes buffet breakfast & Wi-Fi",
      ],
      [
        sampleHotelCode1,
        "Deluxe Room",
        "MAP",
        "Summer Season",
        "01-04-2026",
        "30-06-2026",
        5500,
        1800,
        1000,
        "Includes breakfast & dinner",
      ],
      [
        sampleHotelCode1,
        "Deluxe Room",
        "CP",
        "Monsoon Season",
        "01-07-2026",
        "30-09-2026",
        3800,
        1200,
        600,
        "Monsoon special discounted contract rate",
      ],
      [
        sampleHotelCode1,
        "Executive Suite",
        "CP",
        "Summer Season",
        "01-04-2026",
        "30-06-2026",
        7000,
        2200,
        1200,
        "Pool facing suite with jacuzzi",
      ],
      [
        sampleHotelCode2,
        "Premium Cottage",
        "CP",
        "Regular",
        "01-04-2026",
        "31-10-2026",
        6200,
        2000,
        1000,
        "Private garden cottage rate",
      ],
    ];

    // Sheet 3: Hotels Reference (Tenant-scoped reference)
    const hotelRefData: any[][] = [
      ["HOTEL CODE", "HOTEL NAME", "CITY", "CATEGORY"],
    ];

    if (agencyHotels.length > 0) {
      for (const h of agencyHotels) {
        hotelRefData.push([
          h.hotelCode || "—",
          h.name,
          h.city || "Unspecified",
          h.category || "—",
        ]);
      }
    } else {
      hotelRefData.push([
        "HTL-0001",
        "Example Hotel (Add your hotels in Hotel Master first)",
        "City",
        "Category",
      ]);
    }

    const sheets: Sheet<never>[] = [
      {
        sheet: "Instructions",
        data: toSheetData(instructionsData),
        columns: [{ width: 18 }, { width: 12 }, { width: 45 }, { width: 40 }],
      },
      {
        sheet: "Rates",
        data: toSheetData(ratesData),
        columns: [
          { width: 14 },
          { width: 20 },
          { width: 12 },
          { width: 18 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 38 },
        ],
      },
      {
        sheet: "Hotels Reference",
        data: toSheetData(hotelRefData),
        columns: [{ width: 16 }, { width: 35 }, { width: 20 }, { width: 18 }],
      },
    ];

    return await writeXlsxFile(sheets).toBuffer();
  },

  /**
   * Parses an uploaded Hotel Rate Excel workbook, validating tenant hotel codes, date intervals, and overlap conflicts.
   * ZERO DATABASE WRITES.
   */
  async parseAndPreview(
    buffer: Buffer,
    agencyId: string,
    mode: ImportMode = "SKIP"
  ): Promise<RatePreviewResult> {
    if (!agencyId || agencyId.trim() === "") {
      throw new Error("Agency ID is required.");
    }

    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      throw new ValidationError("Invalid .xlsx file signature.");
    }

    const parsedSheets = await readXlsxFile(buffer);

    // Target sheet: "Rates" (case-insensitive) or first non-Instructions/Hotels Reference sheet
    const targetSheet =
      parsedSheets.find((s) => s.sheet.trim().toLowerCase() === "rates") ||
      parsedSheets.find(
        (s) =>
          s.sheet.trim().toLowerCase() !== "instructions" &&
          s.sheet.trim().toLowerCase() !== "hotels reference"
      ) ||
      parsedSheets[0];

    if (!targetSheet) {
      throw new ValidationError("Workbook contains no readable sheets.");
    }

    const rawRows: any[][] = targetSheet.data.map((row) => row.map((cell) => cell ?? ""));

    if (!rawRows || rawRows.length === 0) {
      throw new ValidationError("The selected sheet is completely empty.");
    }

    const headerRow = rawRows[0].map((h: any) => String(h).trim());

    const hotelCodeIdx = headerRow.findIndex((h) => /^hotel\s*code$/i.test(h));
    const roomTypeIdx = headerRow.findIndex((h) => /^room\s*type$/i.test(h));
    const mealPlanIdx = headerRow.findIndex((h) => /^meal\s*plan$/i.test(h));
    const seasonIdx = headerRow.findIndex((h) => /^season(\s*name)?$/i.test(h));
    const validFromIdx = headerRow.findIndex((h) => /^valid\s*from$/i.test(h));
    const validToIdx = headerRow.findIndex((h) => /^valid\s*to$/i.test(h));
    const costPriceIdx = headerRow.findIndex((h) => /^(cost\s*price|rate|price)$/i.test(h));
    const extraAdultIdx = headerRow.findIndex((h) => /^extra\s*adult/i.test(h));
    const extraChildIdx = headerRow.findIndex((h) => /^extra\s*child/i.test(h));
    const notesIdx = headerRow.findIndex((h) => /^notes$/i.test(h));

    if (
      hotelCodeIdx === -1 ||
      roomTypeIdx === -1 ||
      mealPlanIdx === -1 ||
      validFromIdx === -1 ||
      validToIdx === -1 ||
      costPriceIdx === -1
    ) {
      const missing: string[] = [];
      if (hotelCodeIdx === -1) missing.push("'Hotel Code'");
      if (roomTypeIdx === -1) missing.push("'Room Type'");
      if (mealPlanIdx === -1) missing.push("'Meal Plan'");
      if (validFromIdx === -1) missing.push("'Valid From'");
      if (validToIdx === -1) missing.push("'Valid To'");
      if (costPriceIdx === -1) missing.push("'Cost Price'");

      throw new ValidationError(
        `Invalid template headers. Missing required column(s): ${missing.join(", ")}. Please download and use the official sample template.`
      );
    }

    const dataRows = rawRows.slice(1);
    if (dataRows.length === 0) {
      throw new ValidationError("The Excel file contains no rate data rows to import.");
    }

    if (dataRows.length > 1000) {
      throw new ValidationError("The Excel file exceeds the maximum allowed limit of 1,000 data rows.");
    }

    // Preload agency's hotels strictly scoped to authenticated agency
    const agencyHotels = await prisma.hotel.findMany({
      where: { agencyId, archivedAt: null },
      select: { id: true, hotelCode: true, name: true },
    });

    const hotelMap = new Map<string, { id: string; name: string }>();
    for (const h of agencyHotels) {
      if (h.hotelCode) {
        hotelMap.set(h.hotelCode.trim().toUpperCase(), { id: h.id, name: h.name });
      }
    }

    // Preload existing agency hotel rates for overlap and duplicate checking
    const existingRates = await prisma.rateSheet.findMany({
      where: {
        agencyId,
        inventoryType: "HOTEL",
        archivedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        hotelId: true,
        roomType: true,
        mealPlan: true,
        validFrom: true,
        validTo: true,
        costPrice: true,
      },
    });

    const previewRows: RatePreviewRow[] = [];

    // First pass: Basic row parsing, syntax validation, date parsing
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;

      const isEntireRowEmpty = row.every((cell: any) => String(cell).trim() === "");
      if (isEntireRowEmpty) {
        continue;
      }

      const rawHotelCode = sanitizeCellValue(row[hotelCodeIdx]) || "";
      const rawRoomType = sanitizeCellValue(row[roomTypeIdx]) || "";
      const rawMealPlan = (sanitizeCellValue(row[mealPlanIdx]) || "").toUpperCase();
      const seasonName = seasonIdx !== -1 ? sanitizeCellValue(row[seasonIdx]) : null;
      const notes = notesIdx !== -1 ? sanitizeCellValue(row[notesIdx]) : null;

      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Hotel Code validation
      const hotelCode = rawHotelCode.toUpperCase();
      let hotelInfo: { id: string; name: string } | undefined;
      if (!hotelCode) {
        rowErrors.push("Hotel Code is required.");
      } else {
        hotelInfo = hotelMap.get(hotelCode);
        if (!hotelInfo) {
          rowErrors.push(`Unknown Hotel Code '${rawHotelCode}'. Must match an active Hotel in your agency.`);
        }
      }

      // Room Type validation
      if (!rawRoomType) {
        rowErrors.push("Room Type is required.");
      } else if (rawRoomType.length > 100) {
        rowErrors.push("Room Type exceeds maximum length of 100 characters.");
      }

      // Meal Plan validation
      if (!rawMealPlan) {
        rowErrors.push("Meal Plan is required.");
      } else if (!ALLOWED_MEAL_PLANS.includes(rawMealPlan as any)) {
        rowErrors.push(
          `Invalid Meal Plan '${rawMealPlan}'. Allowed controlled values: ${ALLOWED_MEAL_PLANS.join(", ")}.`
        );
      }

      // Dates validation
      const fromParsed = parseExcelDate(row[validFromIdx]);
      const toParsed = parseExcelDate(row[validToIdx]);

      if (fromParsed.error) rowErrors.push(`Valid From error: ${fromParsed.error}`);
      if (toParsed.error) rowErrors.push(`Valid To error: ${toParsed.error}`);

      if (fromParsed.date && toParsed.date) {
        if (fromParsed.date.getTime() > toParsed.date.getTime()) {
          rowErrors.push(
            `Valid From date (${fromParsed.formattedStr}) cannot be after Valid To date (${toParsed.formattedStr}).`
          );
        }
      }

      // Cost price validation
      const costParsed = parseNumericCell(row[costPriceIdx]);
      if (costParsed.error) {
        rowErrors.push(`Cost Price error: ${costParsed.error}`);
      } else if (costParsed.num === null) {
        rowErrors.push("Cost Price is required.");
      }

      // Extra Adult / Child validation
      let extraAdultRate: number | null = null;
      if (extraAdultIdx !== -1 && row[extraAdultIdx] !== undefined && String(row[extraAdultIdx]).trim() !== "") {
        const eaParsed = parseNumericCell(row[extraAdultIdx]);
        if (eaParsed.error) rowErrors.push(`Extra Adult error: ${eaParsed.error}`);
        else extraAdultRate = eaParsed.num;
      }

      let extraChildRate: number | null = null;
      if (extraChildIdx !== -1 && row[extraChildIdx] !== undefined && String(row[extraChildIdx]).trim() !== "") {
        const ecParsed = parseNumericCell(row[extraChildIdx]);
        if (ecParsed.error) rowErrors.push(`Extra Child error: ${ecParsed.error}`);
        else extraChildRate = ecParsed.num;
      }

      previewRows.push({
        rowNumber,
        hotelCode,
        hotelName: hotelInfo?.name || null,
        hotelId: hotelInfo?.id || null,
        roomType: rawRoomType,
        mealPlan: rawMealPlan,
        seasonName,
        validFrom: fromParsed.formattedStr || String(row[validFromIdx] || ""),
        validTo: toParsed.formattedStr || String(row[validToIdx] || ""),
        validFromDate: fromParsed.date || undefined,
        validToDate: toParsed.date || undefined,
        costPrice: costParsed.num ?? 0,
        extraAdultRate,
        extraChildRate,
        notes,
        status: rowErrors.length > 0 ? "ERROR" : "VALID",
        errors: rowErrors,
        warnings: rowWarnings,
      });
    }

    // Second pass: In-file duplicate & overlap conflicts
    // Deterministic: If file has conflicts, flag all conflicting rows
    for (let i = 0; i < previewRows.length; i++) {
      const rowA = previewRows[i];
      if (!rowA.hotelCode || !rowA.roomType || !rowA.mealPlan || !rowA.validFromDate || !rowA.validToDate) {
        continue;
      }

      for (let j = i + 1; j < previewRows.length; j++) {
        const rowB = previewRows[j];
        if (!rowB.hotelCode || !rowB.roomType || !rowB.mealPlan || !rowB.validFromDate || !rowB.validToDate) {
          continue;
        }

        const sameHotel = rowA.hotelCode.toUpperCase() === rowB.hotelCode.toUpperCase();
        const sameRoom = rowA.roomType.trim().toLowerCase() === rowB.roomType.trim().toLowerCase();
        const sameMeal = rowA.mealPlan.toUpperCase() === rowB.mealPlan.toUpperCase();

        if (sameHotel && sameRoom && sameMeal) {
          if (datesOverlap(rowA.validFromDate, rowA.validToDate, rowB.validFromDate, rowB.validToDate)) {
            // If exact identical dates in same file
            if (
              rowA.validFromDate.getTime() === rowB.validFromDate.getTime() &&
              rowA.validToDate.getTime() === rowB.validToDate.getTime()
            ) {
              rowA.errors.push(`Duplicate rate definition in this file (identical to Row ${rowB.rowNumber}).`);
              rowB.errors.push(`Duplicate rate definition in this file (identical to Row ${rowA.rowNumber}).`);
            } else {
              rowA.errors.push(
                `Overlapping validity period conflict within this file with Row ${rowB.rowNumber} (${rowB.validFrom} to ${rowB.validTo}).`
              );
              rowB.errors.push(
                `Overlapping validity period conflict within this file with Row ${rowA.rowNumber} (${rowA.validFrom} to ${rowA.validTo}).`
              );
            }
            rowA.status = "ERROR";
            rowB.status = "ERROR";
          }
        }
      }
    }

    // Third pass: Database duplicate & overlap check against existing active RateSheets
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    let updateCount = 0;
    let createCount = 0;

    for (const row of previewRows) {
      if (row.status === "ERROR" || row.errors.length > 0) {
        row.status = "ERROR";
        errorCount++;
        continue;
      }

      if (!row.hotelId || !row.validFromDate || !row.validToDate) {
        row.status = "ERROR";
        errorCount++;
        continue;
      }

      // Check DB rates for this hotel
      const hotelDbRates = existingRates.filter(
        (r) =>
          r.hotelId === row.hotelId &&
          (r.roomType || "").trim().toLowerCase() === row.roomType.trim().toLowerCase() &&
          (r.mealPlan || "").trim().toUpperCase() === row.mealPlan.trim().toUpperCase()
      );

      let isExactMatch = false;
      let hasOverlapConflict = false;
      let matchingRateId: string | null = null;
      let conflictingPeriodStr = "";

      for (const dbRate of hotelDbRates) {
        const dbFrom = new Date(dbRate.validFrom);
        const dbTo = new Date(dbRate.validTo);

        if (
          dbFrom.getTime() === row.validFromDate.getTime() &&
          dbTo.getTime() === row.validToDate.getTime()
        ) {
          isExactMatch = true;
          matchingRateId = dbRate.id;
          break;
        } else if (datesOverlap(row.validFromDate, row.validToDate, dbFrom, dbTo)) {
          hasOverlapConflict = true;
          const fromStr = `${String(dbFrom.getUTCDate()).padStart(2, "0")}-${String(dbFrom.getUTCMonth() + 1).padStart(2, "0")}-${dbFrom.getUTCFullYear()}`;
          const toStr = `${String(dbTo.getUTCDate()).padStart(2, "0")}-${String(dbTo.getUTCMonth() + 1).padStart(2, "0")}-${dbTo.getUTCFullYear()}`;
          conflictingPeriodStr = `${fromStr} to ${toStr}`;
          break;
        }
      }

      if (hasOverlapConflict) {
        row.status = "REJECT";
        row.errors.push(`Overlaps with existing active rate period (${conflictingPeriodStr}). Non-identical overlapping periods are not allowed.`);
        errorCount++;
      } else if (isExactMatch) {
        row.existingRateSheetId = matchingRateId;
        if (mode === "SKIP") {
          row.status = "SKIP";
          row.warnings.push("Exact matching rate already exists. Will be skipped.");
          skipCount++;
        } else if (mode === "UPDATE") {
          row.status = "UPDATE";
          row.warnings.push("Exact matching rate already exists. Will be updated.");
          updateCount++;
        } else if (mode === "REJECT") {
          row.status = "REJECT";
          row.errors.push("Exact matching rate already exists. Rejected.");
          errorCount++;
        }
      } else {
        row.status = "VALID";
        createCount++;
        validCount++;
      }

      if (row.warnings.length > 0 && row.status !== "REJECT") {
        warningCount++;
      }
    }

    const totalValid = previewRows.filter((r) => r.status !== "ERROR" && r.status !== "REJECT").length;

    return {
      summary: {
        totalRows: previewRows.length,
        validRows: totalValid,
        warningRows: warningCount,
        errorRows: errorCount,
        skipCount,
        updateCount,
        createCount,
      },
      rows: previewRows,
      canExecute: totalValid > 0,
    };
  },

  /**
   * Executes the Hotel Rate import batch inside a Prisma transaction with server-side re-validation.
   */
  async executeImport(
    buffer: Buffer,
    agencyId: string,
    mode: ImportMode = "SKIP"
  ): Promise<RateExecuteResult> {
    const preview = await this.parseAndPreview(buffer, agencyId, mode);

    const validRows = preview.rows.filter((r) => r.status !== "ERROR" && r.status !== "REJECT");
    if (validRows.length === 0) {
      throw new ValidationError("No valid rows available to import.");
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; hotelCode: string; roomType: string; error: string }> = [];

    for (const r of preview.rows) {
      if (r.status === "ERROR" || r.status === "REJECT") {
        failed++;
        errors.push({
          row: r.rowNumber,
          hotelCode: r.hotelCode || `Row ${r.rowNumber}`,
          roomType: r.roomType || "—",
          error: r.errors.join("; ") || "Validation failed",
        });
      }
    }

    await prisma.$transaction(
      async (tx) => {
        // Preload next sequential rate sheet number for the year
        const currentYear = new Date().getFullYear();
        const ratePrefix = `RAT-${currentYear}-`;
        const lastRate = await tx.rateSheet.findFirst({
          where: {
            agencyId,
            rateSheetNumber: { startsWith: ratePrefix },
          },
          orderBy: { rateSheetNumber: "desc" },
          select: { rateSheetNumber: true },
        });

        let nextRateNum = 1;
        if (lastRate?.rateSheetNumber) {
          const parts = lastRate.rateSheetNumber.split("-");
          if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
              nextRateNum = parsed + 1;
            }
          }
        }

        const ratesToCreate: any[] = [];

        for (const row of validRows) {
          try {
            if (row.existingRateSheetId) {
              if (mode === "SKIP") {
                skipped++;
                continue;
              } else if (mode === "UPDATE") {
                await tx.rateSheet.update({
                  where: { id: row.existingRateSheetId },
                  data: {
                    costPrice: row.costPrice,
                    extraAdultRate: row.extraAdultRate !== null ? row.extraAdultRate : null,
                    extraChildRate: row.extraChildRate !== null ? row.extraChildRate : null,
                    ...(row.seasonName !== null ? { seasonName: row.seasonName } : {}),
                    ...(row.notes !== null ? { notes: row.notes } : {}),
                  },
                });
                updated++;
              } else if (mode === "REJECT") {
                failed++;
                errors.push({
                  row: row.rowNumber,
                  hotelCode: row.hotelCode,
                  roomType: row.roomType,
                  error: "Duplicate rate rejected.",
                });
              }
            } else {
              // Create new RateSheet record with batch sequential number
              const rateSheetNumber = `${ratePrefix}${String(nextRateNum).padStart(5, "0")}`;
              nextRateNum++;
              const rateName = `${row.hotelName || row.hotelCode} - ${row.roomType} (${row.mealPlan})`;

              ratesToCreate.push({
                agencyId,
                rateSheetNumber,
                name: rateName,
                inventoryType: "HOTEL",
                hotelId: row.hotelId!,
                roomType: row.roomType,
                mealPlan: row.mealPlan,
                seasonName: row.seasonName || null,
                validFrom: row.validFromDate!,
                validTo: row.validToDate!,
                currency: "INR",
                costPrice: row.costPrice,
                extraAdultRate: row.extraAdultRate !== null ? row.extraAdultRate : null,
                extraChildRate: row.extraChildRate !== null ? row.extraChildRate : null,
                taxPercentage: 0,
                priority: 0,
                status: "ACTIVE",
                sourceType: "EXCEL_IMPORT",
                notes: row.notes || null,
              });
            }
          } catch (err: any) {
            failed++;
            errors.push({
              row: row.rowNumber,
              hotelCode: row.hotelCode,
              roomType: row.roomType,
              error: err?.message || "Failed to save rate sheet to database",
            });
          }
        }

        if (ratesToCreate.length > 0) {
          await tx.rateSheet.createMany({
            data: ratesToCreate,
          });
          imported += ratesToCreate.length;
        }
      },
      {
        timeout: 30000,
      }
    );

    return {
      total: preview.rows.length,
      imported,
      updated,
      skipped,
      failed,
      errors,
    };
  },
};
