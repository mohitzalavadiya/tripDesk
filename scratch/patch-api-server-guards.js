const fs = require('fs');

// 1. operations/analytics/page.tsx
let oap = fs.readFileSync('src/app/(dashboard)/operations/analytics/page.tsx', 'utf8');
if (!oap.includes('if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "view"))) {\n        setLoading(false);\n        return;')) {
  oap = oap.replace(
    '        if (!isSilent) setLoading(true);\n        setError(null);',
    `        if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "view"))) {
          setLoading(false);
          return;
        }
        if (!isSilent) setLoading(true);
        setError(null);`
  );
  oap = oap.replace(
    '  const handleExportCsv = () => {',
    `  const handleExportCsv = () => {
    if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "export"))) {
      toast.error("You do not have permission to export operations analytics.");
      return;
    }`
  );
  fs.writeFileSync('src/app/(dashboard)/operations/analytics/page.tsx', oap);
  console.log('Patched operations/analytics/page.tsx');
}

// 2. operations/route.ts
let opr = fs.readFileSync('src/app/api/operations/route.ts', 'utf8');
if (!opr.includes('enforceStaffPermission')) {
  opr = opr.replace(
    'import {\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,',
    `import {\nenforceStaffPermission,\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,`
  );
  opr = opr.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");`
  );
  opr = opr.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "CREATE");`
  );
  fs.writeFileSync('src/app/api/operations/route.ts', opr);
  console.log('Patched operations/route.ts');
}

// 3. operations/[id]/route.ts
let oprId = fs.readFileSync('src/app/api/operations/[id]/route.ts', 'utf8');
if (!oprId.includes('enforceStaffPermission')) {
  oprId = oprId.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  oprId = oprId.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");`
  );
  oprId = oprId.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "UPDATE");`
  );
  fs.writeFileSync('src/app/api/operations/[id]/route.ts', oprId);
  console.log('Patched operations/[id]/route.ts');
}

// 4. operations/analytics/route.ts
let opa = fs.readFileSync('src/app/api/operations/analytics/route.ts', 'utf8');
if (!opa.includes('enforceStaffPermission')) {
  opa = opa.replace(
    'import { apiSuccess,handleApiError,requireReadAccess } from "@/lib/api";',
    `import { apiSuccess, enforceStaffPermission, handleApiError, requireReadAccess } from "@/lib/api";`
  );
  opa = opa.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");`
  );
  fs.writeFileSync('src/app/api/operations/analytics/route.ts', opa);
  console.log('Patched operations/analytics/route.ts');
}

// 5. operations/analytics/export/route.ts
let opae = fs.readFileSync('src/app/api/operations/analytics/export/route.ts', 'utf8');
if (!opae.includes('enforceStaffPermission')) {
  opae = opae.replace(
    'import { handleApiError,requireReadAccess } from "@/lib/api";',
    `import { enforceStaffPermission, handleApiError, requireReadAccess } from "@/lib/api";`
  );
  opae = opae.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "EXPORT");`
  );
  fs.writeFileSync('src/app/api/operations/analytics/export/route.ts', opae);
  console.log('Patched operations/analytics/export/route.ts');
}

// 6. finance/expenses/route.ts
let fe = fs.readFileSync('src/app/api/finance/expenses/route.ts', 'utf8');
if (!fe.includes('enforceStaffPermission')) {
  fe = fe.replace(
    'import {\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  fe = fe.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FINANCE", "VIEW");`
  );
  fe = fe.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FINANCE", "CREATE");`
  );
  fs.writeFileSync('src/app/api/finance/expenses/route.ts', fe);
  console.log('Patched finance/expenses/route.ts');
}

// 7. finance/expenses/[id]/route.ts
let feId = fs.readFileSync('src/app/api/finance/expenses/[id]/route.ts', 'utf8');
if (!feId.includes('enforceStaffPermission')) {
  feId = feId.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireAgencyOwnerContext,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireAgencyOwnerContext,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  feId = feId.replace(
    '  try {\n    const context = await requireWriteAccess();\n    const { id } = await params;',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FINANCE", "UPDATE");\n    const { id } = await params;`
  );
  fs.writeFileSync('src/app/api/finance/expenses/[id]/route.ts', feId);
  console.log('Patched finance/expenses/[id]/route.ts');
}

// 8. finance/customer-payments/route.ts
let fcp = fs.readFileSync('src/app/api/finance/customer-payments/route.ts', 'utf8');
if (!fcp.includes('enforceStaffPermission')) {
  fcp = fcp.replace(
    'import {\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\nvalidateQueryParams,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\nvalidateQueryParams,\n} from "@/lib/api";`
  );
  fcp = fcp.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "PAYMENTS", "VIEW");`
  );
  fcp = fcp.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "PAYMENTS", "CREATE");`
  );
  fs.writeFileSync('src/app/api/finance/customer-payments/route.ts', fcp);
  console.log('Patched finance/customer-payments/route.ts');
}

// 9. finance/customer-payments/[id]/refund/route.ts
let fcpr = fs.readFileSync('src/app/api/finance/customer-payments/[id]/refund/route.ts', 'utf8');
if (!fcpr.includes('requireAgencyOwnerContext')) {
  fcpr = fcpr.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\napiSuccess,\nhandleApiError,\nrequireAgencyOwnerContext,\nvalidateJson,\n} from "@/lib/api";`
  );
  fcpr = fcpr.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireAgencyOwnerContext();`
  );
  fs.writeFileSync('src/app/api/finance/customer-payments/[id]/refund/route.ts', fcpr);
  console.log('Patched finance/customer-payments/[id]/refund/route.ts');
}

// 10. invoices/summary/route.ts
let invs = fs.readFileSync('src/app/api/invoices/summary/route.ts', 'utf8');
if (!invs.includes('enforceStaffPermission')) {
  invs = invs.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireReadAccess,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\n} from "@/lib/api";`
  );
  invs = invs.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "VIEW");`
  );
  fs.writeFileSync('src/app/api/invoices/summary/route.ts', invs);
  console.log('Patched invoices/summary/route.ts');
}

// 11. invoices/[id]/issue/route.ts
let invi = fs.readFileSync('src/app/api/invoices/[id]/issue/route.ts', 'utf8');
if (!invi.includes('enforceStaffPermission')) {
  invi = invi.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  invi = invi.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "UPDATE");`
  );
  fs.writeFileSync('src/app/api/invoices/[id]/issue/route.ts', invi);
  console.log('Patched invoices/[id]/issue/route.ts');
}

// 12. follow-ups/route.ts
let fu = fs.readFileSync('src/app/api/follow-ups/route.ts', 'utf8');
if (!fu.includes('enforceStaffPermission')) {
  fu = fu.replace(
    'import {\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\nvalidateQueryParams,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiCreated,\napiSuccess,\nhandleApiError,\nrequireReadAccess,\nrequireWriteAccess,\nvalidateJson,\nvalidateQueryParams,\n} from "@/lib/api";`
  );
  fu = fu.replace(
    '  try {\n    const context = await requireReadAccess();',
    `  try {\n    const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "VIEW");`
  );
  fu = fu.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "CREATE");`
  );
  fs.writeFileSync('src/app/api/follow-ups/route.ts', fu);
  console.log('Patched follow-ups/route.ts');
}

// 13. follow-ups/[id]/complete/route.ts
let fuc = fs.readFileSync('src/app/api/follow-ups/[id]/complete/route.ts', 'utf8');
if (!fuc.includes('enforceStaffPermission')) {
  fuc = fuc.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  fuc = fuc.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "UPDATE");`
  );
  fs.writeFileSync('src/app/api/follow-ups/[id]/complete/route.ts', fuc);
  console.log('Patched follow-ups/[id]/complete/route.ts');
}

// 14. follow-ups/[id]/reschedule/route.ts
let fur = fs.readFileSync('src/app/api/follow-ups/[id]/reschedule/route.ts', 'utf8');
if (!fur.includes('enforceStaffPermission')) {
  fur = fur.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  fur = fur.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "UPDATE");`
  );
  fs.writeFileSync('src/app/api/follow-ups/[id]/reschedule/route.ts', fur);
  console.log('Patched follow-ups/[id]/reschedule/route.ts');
}

// 15. follow-ups/[id]/cancel/route.ts
let fux = fs.readFileSync('src/app/api/follow-ups/[id]/cancel/route.ts', 'utf8');
if (!fux.includes('enforceStaffPermission')) {
  fux = fux.replace(
    'import {\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";',
    `import {\nenforceStaffPermission,\napiSuccess,\nhandleApiError,\nrequireWriteAccess,\nvalidateJson,\n} from "@/lib/api";`
  );
  fux = fux.replace(
    '  try {\n    const context = await requireWriteAccess();',
    `  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "UPDATE");`
  );
  fs.writeFileSync('src/app/api/follow-ups/[id]/cancel/route.ts', fux);
  console.log('Patched follow-ups/[id]/cancel/route.ts');
}

// 16. dashboard/export/route.ts
let de = fs.readFileSync('src/app/api/dashboard/export/route.ts', 'utf8');
if (!de.includes('enforceStaffPermission')) {
  de = de.replace(
    'import { hasPermission } from "@/lib/auth/permissions";',
    'import { enforceStaffPermission } from "@/lib/api";'
  );
  de = de.replace(
    '    if (!hasPermission(context.dbUser.role, "DASHBOARD_CRM", "EXPORT")) {\n      throw new ForbiddenError("You do not have permission to export dashboard reports.");\n    }',
    '    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DASHBOARD", "EXPORT");'
  );
  fs.writeFileSync('src/app/api/dashboard/export/route.ts', de);
  console.log('Patched dashboard/export/route.ts');
}

