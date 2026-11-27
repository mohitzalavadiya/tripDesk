import fs from "fs";

// 1. Fix src/lib/validation/enquiry-schema.ts
{
  let schema = fs.readFileSync("src/lib/validation/enquiry-schema.ts", "utf8");
  const isCrlf = schema.includes("\r\n");
  if (isCrlf) schema = schema.replace(/\r\n/g, "\n");

  const oldTarget = `    completePendingFollowUpId: z.string().trim().optional().nullable(),
    customerId: z.string().trim().optional().nullable(),
    scheduleNext: z.boolean().default(false).optional(),
    nextScheduledAt: z.coerce.date().optional().nullable(),
    nextType: z.nativeEnum(FollowUpType).default(FollowUpType.CALL).optional(),
    nextPriority: z.nativeEnum(EnquiryPriority).default(EnquiryPriority.MEDIUM).optional(),
    nextNotes: z.string().trim().max(2000).optional().nullable(),`;

  const newTarget = `    completePendingFollowUpId: z.string().trim().optional().nullable(),
    completeFollowUpId: z.string().trim().optional().nullable(),
    customerId: z.string().trim().optional().nullable(),
    scheduleNext: z.boolean().default(false).optional(),
    nextScheduledAt: z.coerce.date().optional().nullable(),
    nextFollowUpAt: z.coerce.date().optional().nullable(),
    nextType: z.nativeEnum(FollowUpType).default(FollowUpType.CALL).optional(),
    nextFollowUpType: z.nativeEnum(FollowUpType).default(FollowUpType.CALL).optional(),
    nextPriority: z.nativeEnum(EnquiryPriority).default(EnquiryPriority.MEDIUM).optional(),
    nextNotes: z.string().trim().max(2000).optional().nullable(),
    nextFollowUpNotes: z.string().trim().max(2000).optional().nullable(),`;

  if (schema.includes(oldTarget)) {
    schema = schema.replace(oldTarget, newTarget);
    if (isCrlf) schema = schema.replace(/\n/g, "\r\n");
    fs.writeFileSync("src/lib/validation/enquiry-schema.ts", schema, "utf8");
    console.log("1. Fixed enquiry-schema.ts");
  } else {
    console.log("1. Already fixed or pattern not found in enquiry-schema.ts");
  }
}

// 2. Fix src/lib/services/enquiry-service.ts (notifyAgencyOwner & evaluateRepeatCustomerStatus)
{
  let svc = fs.readFileSync("src/lib/services/enquiry-service.ts", "utf8");
  const isCrlf = svc.includes("\r\n");
  if (isCrlf) svc = svc.replace(/\r\n/g, "\n");

  // Fix notifyAgencyOwner(agencyId, { ... })
  const oldNotify = `    internalNotificationService.notifyAgencyOwner({
      agencyId,
      title: "New Travel Enquiry Received",`;
  const newNotify = `    internalNotificationService.notifyAgencyOwner(agencyId, {
      type: "ENQUIRY_CREATED" as any,
      title: "New Travel Enquiry Received",`;

  if (svc.includes(oldNotify)) {
    svc = svc.replace(oldNotify, newNotify);
    console.log("2. Fixed notifyAgencyOwner in enquiry-service.ts");
  }

  // Fix trips: completedTrip ? [{ status: "COMPLETED" }] : []
  const oldTripStatus = `trips: completedTrip ? [{ status: "COMPLETED" }] : [],`;
  const newTripStatus = `trips: completedTrip ? [{ id: completedTrip.id, status: "COMPLETED" }] : [],`;
  if (svc.includes(oldTripStatus)) {
    svc = svc.replace(oldTripStatus, newTripStatus);
    console.log("2. Fixed trips status in enquiry-service.ts");
  }

  if (isCrlf) svc = svc.replace(/\n/g, "\r\n");
  fs.writeFileSync("src/lib/services/enquiry-service.ts", svc, "utf8");
}

// 3. Fix src/components/enquiries/enquiry-pipeline.tsx (updatingIds & onArchive)
{
  let pipe = fs.readFileSync("src/components/enquiries/enquiry-pipeline.tsx", "utf8");
  const isCrlf = pipe.includes("\r\n");
  if (isCrlf) pipe = pipe.replace(/\r\n/g, "\n");

  // Ensure interface has updatingIds and onArchive
  const oldPipeProps = `interface EnquiryPipelineProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;`;
  const newPipeProps = `interface EnquiryPipelineProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;
  updatingIds?: Record<string, boolean>;
  onArchive?: (id: string, enquiryNumber: string) => void;`;

  if (pipe.includes(oldPipeProps) && !pipe.includes("updatingIds?: Record<string, boolean>")) {
    pipe = pipe.replace(oldPipeProps, newPipeProps);
  }

  // Ensure function destructures updatingIds and onArchive
  const oldFuncSig = `export function EnquiryPipeline({
  enquiries,
  isReadOnly = false,
  onStatusChange,
  onConvertTrip,
  onRefresh,
  onAssign,
}: EnquiryPipelineProps)`;

  const newFuncSig = `export function EnquiryPipeline({
  enquiries,
  isReadOnly = false,
  updatingIds,
  onStatusChange,
  onConvertTrip,
  onArchive,
  onRefresh,
  onAssign,
}: EnquiryPipelineProps)`;

  if (pipe.includes(oldFuncSig)) {
    pipe = pipe.replace(oldFuncSig, newFuncSig);
    console.log("3. Fixed EnquiryPipeline signature");
  }

  if (isCrlf) pipe = pipe.replace(/\n/g, "\r\n");
  fs.writeFileSync("src/components/enquiries/enquiry-pipeline.tsx", pipe, "utf8");
}

// 4. Fix src/components/enquiries/enquiry-table.tsx (updatingIds)
{
  let table = fs.readFileSync("src/components/enquiries/enquiry-table.tsx", "utf8");
  const isCrlf = table.includes("\r\n");
  if (isCrlf) table = table.replace(/\r\n/g, "\n");

  const oldTableProps = `interface EnquiryTableProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;`;
  const newTableProps = `interface EnquiryTableProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;
  updatingIds?: Record<string, boolean>;`;

  if (table.includes(oldTableProps) && !table.includes("updatingIds?: Record<string, boolean>")) {
    table = table.replace(oldTableProps, newTableProps);
  }

  const oldTableSig = `export function EnquiryTable({
  enquiries,
  isReadOnly = false,
  onStatusChange,
  onConvertTrip,
  onArchive,
  onQuickLog,
  onAssign,
}: EnquiryTableProps)`;

  const newTableSig = `export function EnquiryTable({
  enquiries,
  isReadOnly = false,
  updatingIds,
  onStatusChange,
  onConvertTrip,
  onArchive,
  onQuickLog,
  onAssign,
}: EnquiryTableProps)`;

  if (table.includes(oldTableSig)) {
    table = table.replace(oldTableSig, newTableSig);
    console.log("4. Fixed EnquiryTable signature");
  }

  if (isCrlf) table = table.replace(/\n/g, "\r\n");
  fs.writeFileSync("src/components/enquiries/enquiry-table.tsx", table, "utf8");
}

// 5. Fix src/app/(dashboard)/enquiries/page.tsx (PopoverTrigger without asChild)
{
  let page = fs.readFileSync("src/app/(dashboard)/enquiries/page.tsx", "utf8");
  const isCrlf = page.includes("\r\n");
  if (isCrlf) page = page.replace(/\r\n/g, "\n");

  const oldTrigger = `<PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={\`h-9 text-xs rounded-xl gap-1.5 border-slate-200 hover:bg-slate-50 cursor-pointer font-semibold \${
                        secondaryFiltersCount > 0 ? "border-teal-400 bg-teal-50/40 text-teal-900" : "text-slate-700"
                      }\`}
                    >
                      <Filter className="h-3.5 w-3.5 text-slate-500" />
                      <span>Filters</span>
                      {secondaryFiltersCount > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center">
                          {secondaryFiltersCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>`;

  const newTrigger = `<PopoverTrigger
                    className={\`inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all \${
                      secondaryFiltersCount > 0 ? "border-teal-400 bg-teal-50/40 text-teal-900" : "text-slate-700 bg-white"
                    }\`}
                  >
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span>Filters</span>
                    {secondaryFiltersCount > 0 && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center">
                        {secondaryFiltersCount}
                      </span>
                    )}
                  </PopoverTrigger>`;

  if (page.includes(oldTrigger)) {
    page = page.replace(oldTrigger, newTrigger);
    console.log("5. Fixed PopoverTrigger in enquiries/page.tsx");
  }

  if (isCrlf) page = page.replace(/\n/g, "\r\n");
  fs.writeFileSync("src/app/(dashboard)/enquiries/page.tsx", page, "utf8");
}

console.log("All fixes processed!");
