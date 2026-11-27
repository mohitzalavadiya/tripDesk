const fs = require('fs');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of transforms) {
    if (!content.match(pattern)) {
      console.warn(`Warning: Pattern not found in ${filePath}:`, pattern);
    }
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Patched: ${filePath}`);
}

// 1. src/app/api/rate-sheets/route.ts
patchFile('src/app/api/rate-sheets/route.ts', [
  [
    /requireAgencyOwnerContext,/g,
    'enforceStaffPermission,\n  requireAgencyOwnerContext,'
  ],
  [
    /const context = await requireReadAccess\(\);\r?\n\s+const queryParams/,
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "VIEW");\n    const queryParams'
  ],
  [
    /const context = await requireAgencyOwnerContext\(\);/,
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "CREATE");'
  ]
]);

// 2. src/app/api/rate-sheets/[id]/route.ts
patchFile('src/app/api/rate-sheets/[id]/route.ts', [
  [
    /requireAgencyOwnerContext,/g,
    'enforceStaffPermission,\n  requireAgencyOwnerContext,'
  ],
  [
    /const context = await requireReadAccess\(\);\r?\n\s+const \{ id \}/,
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "VIEW");\n    const { id }'
  ],
  [
    /export async function PATCH[^{]+\{\r?\n\s+try \{\r?\n\s+const context = await requireAgencyOwnerContext\(\);/,
    'export async function PATCH(request: NextRequest, props: RouteProps) {\n  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "UPDATE");'
  ],
  [
    /export async function DELETE[^{]+\{\r?\n\s+try \{\r?\n\s+const context = await requireAgencyOwnerContext\(\);/,
    'export async function DELETE(request: NextRequest, props: RouteProps) {\n  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "DELETE");'
  ]
]);

// 3. src/app/api/suppliers/route.ts
patchFile('src/app/api/suppliers/route.ts', [
  [
    /requireAgencyOwnerContext,/g,
    'enforceStaffPermission,\n  requireAgencyOwnerContext,'
  ],
  [
    /const context = await requireReadAccess\(\);\r?\n\s+const queryParams/,
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "VIEW");\n    const queryParams'
  ],
  [
    /const context = await requireAgencyOwnerContext\(\);/,
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "CREATE");'
  ]
]);

// 4. src/app/api/suppliers/[id]/route.ts
patchFile('src/app/api/suppliers/[id]/route.ts', [
  [
    /requireAgencyOwnerContext,/g,
    'enforceStaffPermission,\n  requireAgencyOwnerContext,'
  ],
  [
    /const context = await requireReadAccess\(\);\r?\n\s+const \{ id \}/,
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "VIEW");\n    const { id }'
  ],
  [
    /export async function PATCH[^{]+\{\r?\n\s+try \{\r?\n\s+const context = await requireWriteAccess\(\);/,
    'export async function PATCH(request: NextRequest, props: RouteProps) {\n  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "UPDATE");'
  ],
  [
    /export async function DELETE[^{]+\{\r?\n\s+try \{\r?\n\s+const context = await requireAgencyOwnerContext\(\);/,
    'export async function DELETE(request: NextRequest, props: RouteProps) {\n  try {\n    const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "DELETE");'
  ]
]);

// 5. src/app/api/invoices/route.ts
patchFile('src/app/api/invoices/route.ts', [
  [
    /requireWriteAccess,/g,
    'requireWriteAccess,\n  enforceStaffPermission,'
  ],
  [
    /const context = await requireReadAccess\(\);\r?\n\s+const queryParams/,
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "VIEW");\n    const queryParams'
  ],
  [
    /const context = await requireWriteAccess\(\);\r?\n\s+const body/,
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "CREATE");\n    const body'
  ]
]);

// 6. src/app/api/invoices/[id]/route.ts
patchFile('src/app/api/invoices/[id]/route.ts', [
  [
    /requireWriteAccess,/g,
    'requireWriteAccess,\n  enforceStaffPermission,'
  ],
  [
    /const context = await requireReadAccess\(\);\r?\n\s+const \{ id \}/,
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "VIEW");\n    const { id }'
  ],
  [
    /const context = await requireWriteAccess\(\);\r?\n\s+const \{ id \} = await params;\r?\n\s+const body/,
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "UPDATE");\n    const { id } = await params;\n    const body'
  ],
  [
    /const context = await requireAgencyOwnerContext\(\);/,
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "DELETE");'
  ]
]);

// 7. src/app/api/reports/route.ts
patchFile('src/app/api/reports/route.ts', [
  [
    /import \{ requireAgencyOwnerContext \} from "@\/lib\/api\/context";/,
    'import { requireMemberReadAccess } from "@/lib/api/context";\nimport { enforceStaffPermission } from "@/lib/api";\nimport { redactStaffFinancials } from "@/lib/auth/permissions";'
  ],
  [
    /const context = await requireAgencyOwnerContext\(\);\r?\n\s+const agencyId = context\.agencyId;/,
    'const context = await requireMemberReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "REPORTS", "VIEW");\n    const agencyId = context.agencyId;'
  ],
  [
    /const report = await reportingService\.getAgencyBIReport\(agencyId, parsedFilter\);\r?\n\s+return NextResponse\.json\(\{\r?\n\s+success: true,\r?\n\s+data: report,/,
    'const rawReport = await reportingService.getAgencyBIReport(agencyId, parsedFilter);\n    const report = context.isAgencyStaff ? redactStaffFinancials(rawReport, context.dbUser.role) : rawReport;\n\n    return NextResponse.json({\n      success: true,\n      data: report,'
  ]
]);

// 8. src/app/api/reports/export/route.ts
patchFile('src/app/api/reports/export/route.ts', [
  [
    /import \{ requireAgencyOwnerContext \} from "@\/lib\/api\/context";/,
    'import { requireMemberReadAccess } from "@/lib/api/context";\nimport { enforceStaffPermission } from "@/lib/api";'
  ],
  [
    /const context = await requireAgencyOwnerContext\(\);\r?\n\s+const agencyId = context\.agencyId;/,
    'const context = await requireMemberReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "REPORTS", "EXPORT");\n    const agencyId = context.agencyId;'
  ]
]);

// 9. src/app/api/reports/pdf/route.ts
patchFile('src/app/api/reports/pdf/route.ts', [
  [
    /import \{ requireAgencyOwnerContext \} from "@\/lib\/api\/context";/,
    'import { requireMemberReadAccess } from "@/lib/api/context";\nimport { enforceStaffPermission } from "@/lib/api";'
  ],
  [
    /const context = await requireAgencyOwnerContext\(\);\r?\n\s+const agencyId = context\.agencyId;/,
    'const context = await requireMemberReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "REPORTS", "EXPORT");\n    const agencyId = context.agencyId;'
  ]
]);

console.log("All API routes patched successfully.");

