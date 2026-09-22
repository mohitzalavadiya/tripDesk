import "server-only";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { hotelService } from "@/lib/services/hotel-service";
import { createHotelSchema } from "@/lib/validation/hotel-schema";

export type ImportMode = "SKIP" | "UPDATE" | "REJECT";

export interface HotelPreviewRow {
  rowNumber: number;
  name: string;
  destination: string;
  destinationId?: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  status: "VALID" | "WARNING" | "ERROR" | "SKIP" | "UPDATE" | "REJECT";
  existingHotelCode?: string | null;
  errors: string[];
  warnings: string[];
}

export interface HotelPreviewResult {
  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    skipCount: number;
    updateCount: number;
    createCount: number;
  };
  rows: HotelPreviewRow[];
  canExecute: boolean;
}

export interface HotelExecuteResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    name: string;
    error: string;
  }>;
}

/**
 * Sanitizes cell values from Excel by trimming whitespace and stripping any accidental leading apostrophe used by Excel text formatting.
 */
function sanitizeCellValue(val: any): string | null {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str === "") return null;
  // If string has a leading apostrophe from Excel text prefix (e.g. '+91...), strip it so clean logical value is preserved
  if (str.startsWith("'")) {
    str = str.substring(1).trim();
    if (str === "") return null;
  }
  return str;
}

export const hotelExcelService = {
  /**
   * Generates the official sample workbook `Hotels.xlsx` with Instructions and example rows.
   */
  generateSampleWorkbook(): Buffer {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Instructions
    const instructionsData = [
      ["TRIPDESK — HOTEL MASTER IMPORT INSTRUCTIONS"],
      [],
      ["FIELD NAME", "REQUIRED", "DESCRIPTION", "SAMPLE VALUE"],
      ["Hotel Name", "YES", "Property name (1-200 characters)", "Grand Palace Resort"],
      ["Destination", "YES", "Agency Destination name (must match existing active Destination)", "Kerala"],
      ["Category", "NO", "Star rating or property type", "5 Star Deluxe"],
      ["Address", "NO", "Street / Area address", "Beach Road, North Cliff"],
      ["City", "NO", "City / physical location name", "Varkala"],
      ["State", "NO", "State or province", "Kerala"],
      ["Country", "NO", "Country (defaults to India)", "India"],
      ["Phone", "NO", "Contact phone number", "+91 98765 43210"],
      ["Email", "NO", "Official contact email", "reservations@grandpalace.com"],
      ["Website", "NO", "Website URL", "https://grandpalaceresort.com"],
      ["Notes", "NO", "Internal remarks / amenities", "Beachfront property with pool and spa"],
      [],
      ["IMPORTANT RULES:"],
      ["1. Do NOT add or change column headers in the 'Hotels' sheet."],
      ["2. Hotel Code is generated automatically by TripDesk (e.g. HTL-0001) and must NOT be entered."],
      ["3. Hotel Name and Destination are required fields for every hotel row."],
      ["4. Destination must match an existing active Destination in your TripDesk account (exact match, case-insensitive)."],
      ["5. City represents the physical municipality (e.g. Benaulim) while Destination is the travel grouping (e.g. Goa)."],
      ["6. Supplier and GST/tax are not included in this Hotel Master import format."],
      ["7. Supported file format: .xlsx (Max 5 MB, Max 1,000 rows)."],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions["!cols"] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 60 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    // Sheet 2: Hotels (The actual import sheet)
    const hotelsData = [
      [
        "Hotel Name",
        "Destination",
        "Category",
        "Address",
        "City",
        "State",
        "Country",
        "Phone",
        "Email",
        "Website",
        "Notes",
      ],
      [
        "Grand Palace Resort",
        "Kerala",
        "5 Star",
        "Beach Road, North Cliff",
        "Varkala",
        "Kerala",
        "India",
        "+91 98765 43210",
        "reservations@grandpalace.com",
        "https://grandpalaceresort.com",
        "Luxury beachfront resort with infinity pool and spa",
      ],
      [
        "Mountain Mist Valley",
        "Kerala",
        "4 Star",
        "Pothamedu View Point Road",
        "Munnar",
        "Kerala",
        "India",
        "+91 98450 12345",
        "booking@mountainmist.in",
        "https://mountainmistmunnar.com",
        "Tea plantation view rooms with complimentary breakfast",
      ],
      [
        "Thekkady Heritage Villa",
        "Kerala",
        "3 Star Heritage",
        "Bypass Road, Kumily",
        "Thekkady",
        "Kerala",
        "India",
        "+91 94471 67890",
        "stay@thekkadyheritage.com",
        "https://thekkadyheritage.com",
        "Traditional architecture close to Periyar Wildlife Sanctuary",
      ],
      [
        "Royal Lake Palace",
        "Kerala",
        "5 Star Deluxe",
        "Punnamada Finishing Point",
        "Alleppey",
        "Kerala",
        "India",
        "+91 97452 34567",
        "info@royallakepalace.com",
        "https://royallakepalace.com",
        "Backwater lagoon view suites with ayurveda center",
      ],
    ];

    const wsHotels = XLSX.utils.aoa_to_sheet(hotelsData);
    wsHotels["!cols"] = [
      { wch: 26 },
      { wch: 18 },
      { wch: 16 },
      { wch: 28 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 28 },
      { wch: 28 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsHotels, "Hotels");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  },

  /**
   * Parses an uploaded Hotel Excel workbook and generates a preview with validation and duplicate detection.
   * ZERO DATABASE WRITES.
   */
  async parseAndPreview(
    buffer: Buffer,
    agencyId: string,
    mode: ImportMode = "SKIP"
  ): Promise<HotelPreviewResult> {
    if (!agencyId || agencyId.trim() === "") {
      throw new Error("Agency ID is required.");
    }

    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

    // Look for sheet named "Hotels" (case-insensitive) or fallback to first sheet
    let sheetName = wb.SheetNames.find((s) => s.trim().toLowerCase() === "hotels");
    if (!sheetName) {
      // If no "Hotels" sheet, try the first non-"Instructions" sheet, or sheet 0
      sheetName = wb.SheetNames.find((s) => s.trim().toLowerCase() !== "instructions") || wb.SheetNames[0];
    }

    if (!sheetName) {
      throw new Error("Workbook contains no readable sheets.");
    }

    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (!rawRows || rawRows.length === 0) {
      throw new Error("The selected sheet is completely empty.");
    }

    // Header row validation
    const headerRow = rawRows[0].map((h: any) => String(h).trim());

    const nameIdx = headerRow.findIndex((h) => /^hotel\s*name$/i.test(h));
    const destinationIdx = headerRow.findIndex((h) => /^destination$/i.test(h));
    const categoryIdx = headerRow.findIndex((h) => /^category$/i.test(h));
    const addressIdx = headerRow.findIndex((h) => /^address$/i.test(h));
    const cityIdx = headerRow.findIndex((h) => /^city$/i.test(h));
    const stateIdx = headerRow.findIndex((h) => /^state$/i.test(h));
    const countryIdx = headerRow.findIndex((h) => /^country$/i.test(h));
    const phoneIdx = headerRow.findIndex((h) => /^phone$/i.test(h));
    const emailIdx = headerRow.findIndex((h) => /^email$/i.test(h));
    const websiteIdx = headerRow.findIndex((h) => /^website$/i.test(h));
    const notesIdx = headerRow.findIndex((h) => /^notes$/i.test(h));

    if (nameIdx === -1 || destinationIdx === -1) {
      throw new Error(
        `Invalid template headers. Missing required column(s): ${nameIdx === -1 ? "'Hotel Name' " : ""}${destinationIdx === -1 ? "'Destination'" : ""}. Please download and use the official sample template.`
      );
    }

    const dataRows = rawRows.slice(1);
    if (dataRows.length === 0) {
      throw new Error("The Excel file contains no data rows to import.");
    }

    if (dataRows.length > 1000) {
      throw new Error("The Excel file exceeds the maximum allowed limit of 1,000 data rows.");
    }

    // Preload agency active destinations for strict in-memory matching
    const agencyDestinations = await prisma.destination.findMany({
      where: { agencyId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
      },
    });

    const destMap = new Map<string, string>(); // normalized (trim().toLowerCase()) -> id
    for (const d of agencyDestinations) {
      destMap.set(d.name.trim().toLowerCase(), d.id);
    }

    // Preload existing agency hotels for fast in-memory matching
    const existingHotels = await prisma.hotel.findMany({
      where: { agencyId, archivedAt: null },
      select: {
        id: true,
        hotelCode: true,
        name: true,
        city: true,
      },
    });

    const existingMap = new Map<string, { id: string; hotelCode: string | null }>();
    for (const h of existingHotels) {
      const key = `${h.name.trim().toLowerCase()}|||${(h.city || "").trim().toLowerCase()}`;
      existingMap.set(key, { id: h.id, hotelCode: h.hotelCode });
    }

    const seenInFile = new Map<string, number>(); // normalizedKey -> firstRowNumber
    const previewRows: HotelPreviewRow[] = [];

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    let updateCount = 0;
    let createCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // 1-based, row 1 is header

      // Check if entire row is empty
      const isEntireRowEmpty = row.every((cell: any) => String(cell).trim() === "");
      if (isEntireRowEmpty) {
        continue;
      }

      const name = sanitizeCellValue(row[nameIdx]) || "";
      const destination = destinationIdx !== -1 ? sanitizeCellValue(row[destinationIdx]) || "" : "";
      const city = cityIdx !== -1 ? sanitizeCellValue(row[cityIdx]) : null;
      const category = categoryIdx !== -1 ? sanitizeCellValue(row[categoryIdx]) : null;
      const address = addressIdx !== -1 ? sanitizeCellValue(row[addressIdx]) : null;
      const state = stateIdx !== -1 ? sanitizeCellValue(row[stateIdx]) : null;
      const country = countryIdx !== -1 ? sanitizeCellValue(row[countryIdx]) || "India" : "India";
      const phone = phoneIdx !== -1 ? sanitizeCellValue(row[phoneIdx]) : null;
      const email = emailIdx !== -1 ? sanitizeCellValue(row[emailIdx]) : null;
      const website = websiteIdx !== -1 ? sanitizeCellValue(row[websiteIdx]) : null;
      const notes = notesIdx !== -1 ? sanitizeCellValue(row[notesIdx]) : null;

      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Required Hotel Name validation
      if (!name) {
        rowErrors.push("Hotel Name is required.");
      } else if (name.length > 200) {
        rowErrors.push("Hotel Name exceeds maximum length of 200 characters.");
      }

      // Required Destination validation & strict normalized matching
      let matchedDestinationId: string | null = null;
      if (!destination) {
        rowErrors.push("Destination is required.");
      } else {
        const normDest = destination.trim().toLowerCase();
        const foundDestId = destMap.get(normDest);
        if (!foundDestId) {
          rowErrors.push(`Unknown destination: '${destination}'. Destination must match an existing active Destination in your account.`);
        } else {
          matchedDestinationId = foundDestId;
        }
      }

      if (city && city.length > 100) {
        rowErrors.push("City exceeds maximum length of 100 characters.");
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          rowErrors.push(`Invalid email address format: '${email}'`);
        }
      }

      // In-file duplicate check
      const fileKey = `${name.trim().toLowerCase()}|||${(city || "").trim().toLowerCase()}`;
      if (name) {
        if (seenInFile.has(fileKey)) {
          const firstRow = seenInFile.get(fileKey)!;
          rowErrors.push(`Duplicate row in this file (matches Row ${firstRow} with same Hotel Name and City).`);
        } else {
          seenInFile.set(fileKey, rowNumber);
        }
      }

      // Check against existing database records
      let status: HotelPreviewRow["status"] = "VALID";
      let existingHotelCode: string | null = null;

      if (rowErrors.length === 0) {
        const existing = existingMap.get(fileKey);
        if (existing) {
          existingHotelCode = existing.hotelCode;
          if (mode === "SKIP") {
            status = "SKIP";
            rowWarnings.push(`Existing hotel (${existing.hotelCode || "Matched"}). Will be skipped.`);
            skipCount++;
          } else if (mode === "UPDATE") {
            status = "UPDATE";
            rowWarnings.push(`Existing hotel (${existing.hotelCode || "Matched"}). Will be updated.`);
            updateCount++;
          } else if (mode === "REJECT") {
            status = "REJECT";
            rowErrors.push(`Existing hotel duplicate (${existing.hotelCode || "Matched"}). Rejected.`);
            errorCount++;
          }
        } else {
          status = "VALID";
          createCount++;
          validCount++;
        }
      } else {
        status = "ERROR";
        errorCount++;
      }

      if (rowWarnings.length > 0 && status !== "ERROR" && status !== "REJECT") {
        warningCount++;
      }

      previewRows.push({
        rowNumber,
        name,
        destination,
        destinationId: matchedDestinationId,
        category,
        address,
        city,
        state,
        country,
        phone,
        email,
        website,
        notes,
        status,
        existingHotelCode,
        errors: rowErrors,
        warnings: rowWarnings,
      });
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
   * Executes the Hotel import batch inside a Prisma transaction with server-side re-validation.
   */
  async executeImport(
    buffer: Buffer,
    agencyId: string,
    mode: ImportMode = "SKIP"
  ): Promise<HotelExecuteResult> {
    // Re-parse and validate server-side (never trust frontend preview)
    const preview = await this.parseAndPreview(buffer, agencyId, mode);

    const validRows = preview.rows.filter((r) => r.status !== "ERROR" && r.status !== "REJECT");
    if (validRows.length === 0) {
      throw new Error("No valid rows available to import.");
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; name: string; error: string }> = [];

    // Collect all errors from invalid rows
    for (const r of preview.rows) {
      if (r.status === "ERROR" || r.status === "REJECT") {
        failed++;
        errors.push({
          row: r.rowNumber,
          name: r.name || `Row ${r.rowNumber}`,
          error: r.errors.join("; ") || "Validation failed",
        });
      }
    }

    // Execute valid rows inside a transaction
    await prisma.$transaction(
      async (tx) => {
        // Preload active destinations
        const agencyDestinations = await tx.destination.findMany({
          where: { agencyId, status: "ACTIVE" },
          select: { id: true, name: true },
        });

        const destMap = new Map<string, string>();
        for (const d of agencyDestinations) {
          destMap.set(d.name.trim().toLowerCase(), d.id);
        }

        // Preload all agency hotels once to avoid O(N^2) roundtrips inside the transaction
        const existingHotels = await tx.hotel.findMany({
          where: { agencyId, archivedAt: null },
          select: { id: true, hotelCode: true, name: true, city: true },
        });

        const existingMap = new Map<string, { id: string; hotelCode: string | null }>();
        let maxCodeNum = 0;

        for (const h of existingHotels) {
          const key = `${h.name.trim().toLowerCase()}|||${(h.city || "").trim().toLowerCase()}`;
          existingMap.set(key, { id: h.id, hotelCode: h.hotelCode });

          if (h.hotelCode) {
            const match = h.hotelCode.match(/^HTL-(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxCodeNum) {
                maxCodeNum = num;
              }
            }
          }
        }

        const hotelsToCreate: any[] = [];

        for (const row of validRows) {
          try {
            const rowKey = `${row.name.trim().toLowerCase()}|||${(row.city || "").trim().toLowerCase()}`;
            const existing = existingMap.get(rowKey);
            const destinationId = row.destinationId || (row.destination ? destMap.get(row.destination.trim().toLowerCase()) : null) || null;

            if (existing) {
              if (mode === "SKIP") {
                skipped++;
                continue;
              } else if (mode === "UPDATE") {
                // Update only non-blank fields from Excel; leave existing values unchanged for blank cells
                await tx.hotel.update({
                  where: { id: existing.id },
                  data: {
                    ...(row.name ? { name: row.name.trim() } : {}),
                    ...(destinationId ? { destinationId } : {}),
                    ...(row.category !== null ? { category: row.category } : {}),
                    ...(row.address !== null ? { address: row.address } : {}),
                    ...(row.city !== null ? { city: row.city?.trim() || null } : {}),
                    ...(row.state !== null ? { state: row.state } : {}),
                    ...(row.country !== null ? { country: row.country } : {}),
                    ...(row.phone !== null ? { phone: row.phone } : {}),
                    ...(row.email !== null ? { email: row.email } : {}),
                    ...(row.website !== null ? { website: row.website } : {}),
                    ...(row.notes !== null ? { notes: row.notes } : {}),
                  },
                });
                updated++;
              } else if (mode === "REJECT") {
                failed++;
                errors.push({
                  row: row.rowNumber,
                  name: row.name,
                  error: `Duplicate existing hotel (${existing.hotelCode || row.name})`,
                });
              }
            } else {
              // Allocate next sequential Hotel Code in batch
              maxCodeNum++;
              const hotelCode = `HTL-${String(maxCodeNum).padStart(4, "0")}`;

              hotelsToCreate.push({
                agencyId,
                destinationId,
                hotelCode,
                name: row.name.trim(),
                category: row.category,
                address: row.address,
                city: row.city?.trim() || null,
                state: row.state,
                country: row.country || "India",
                phone: row.phone,
                email: row.email,
                website: row.website,
                notes: row.notes,
              });

              existingMap.set(rowKey, { id: "pending", hotelCode });
            }
          } catch (err: any) {
            failed++;
            errors.push({
              row: row.rowNumber,
              name: row.name,
              error: err?.message || "Failed to save hotel to database",
            });
          }
        }

        if (hotelsToCreate.length > 0) {
          await tx.hotel.createMany({
            data: hotelsToCreate,
          });
          imported += hotelsToCreate.length;
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
