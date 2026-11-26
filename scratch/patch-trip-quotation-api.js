const fs = require("fs");
let code = fs.readFileSync("src/app/api/trips/[id]/quotation/route.ts", "utf8");

// Add staffPermissionService and redactStaffFinancials imports if not present
if (!code.includes("staffPermissionService")) {
  code = code.replace(
    'import { quotationService } from "@/lib/services/quotation-service";',
    'import { quotationService } from "@/lib/services/quotation-service";\nimport { staffPermissionService } from "@/lib/services/staff-permission-service";'
  );
}
if (!code.includes("redactStaffFinancials")) {
  code = code.replace(
    '  canAccessFinancialMargins,',
    '  canAccessFinancialMargins,\n  redactStaffFinancials,'
  );
}

// Update includeCosting logic
code = code.replace(
  `    const hasMarginAccess = canAccessFinancialMargins(context.dbUser.role);
    // Staff never receive internal rate-sheet supplier costing
    const includeCosting = hasMarginAccess && searchParams.get("includeCosting") !== "false";`,
  `    const hasMarginAccess = canAccessFinancialMargins(context.dbUser.role);
    const hasCostingPermission = context.dbUser.role === "AGENCY_OWNER" || await staffPermissionService.hasStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIP_COSTING", "view");
    // Costing calculations included if caller is Owner or Staff with TRIP_COSTING: view
    const includeCosting = (hasMarginAccess || hasCostingPermission) && searchParams.get("includeCosting") !== "false";`
);

// Update apiSuccess returned costing with redaction for staff
code = code.replace(
  `    return apiSuccess({
      costing,
      quotations: quotations.data,
    });`,
  `    let returnedCosting = costing;
    if (context.dbUser.role === "AGENCY_STAFF" && !hasMarginAccess && returnedCosting) {
      returnedCosting = redactStaffFinancials(returnedCosting, context.dbUser.role);
    }
    const returnedQuotations = hasMarginAccess
      ? quotations.data
      : toStaffSafeQuotationListDTO(quotations.data);

    return apiSuccess({
      costing: returnedCosting,
      quotations: returnedQuotations,
    });`
);

fs.writeFileSync("src/app/api/trips/[id]/quotation/route.ts", code, "utf8");
console.log("api/trips/[id]/quotation/route.ts patched successfully!");

