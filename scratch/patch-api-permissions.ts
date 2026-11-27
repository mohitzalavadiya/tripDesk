import * as fs from 'fs';
import * as path from 'path';

function patchFile(relPath: string, updater: (content: string) => string) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${relPath}`);
    return;
  }
  const original = fs.readFileSync(fullPath, 'utf-8');
  const isCrlf = original.includes('\r\n');
  const normalized = original.replace(/\r\n/g, '\n');
  const updated = updater(normalized);
  if (updated === normalized) {
    console.log(`No changes made to ${relPath}`);
    return;
  }
  const finalContent = isCrlf ? updated.replace(/\n/g, '\r\n') : updated;
  fs.writeFileSync(fullPath, finalContent, 'utf-8');
  console.log(`Updated: ${relPath}`);
}

// 1. destinations/route.ts
patchFile('src/app/api/destinations/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const queryParams',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "VIEW");\n    const queryParams'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const body',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "CREATE");\n    const body'
  );
  return res;
});

// 2. destinations/[id]/route.ts
patchFile('src/app/api/destinations/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { id } = await params;',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "VIEW");\n    const { id } = await params;'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id } = await params;',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "UPDATE");\n    const { id } = await params;'
  );
  return res;
});

// 3. hotels/route.ts
patchFile('src/app/api/hotels/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const queryParams',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "VIEW");\n    const queryParams'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const body',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "CREATE");\n    const body'
  );
  return res;
});

// 4. hotels/[id]/route.ts
patchFile('src/app/api/hotels/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { id } = await params;',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "VIEW");\n    const { id } = await params;'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id } = await params;',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "UPDATE");\n    const { id } = await params;'
  );
  return res;
});

// 5. vehicles/route.ts
patchFile('src/app/api/vehicles/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const queryParams',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "VEHICLES", "VIEW");\n    const queryParams'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const body',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "VEHICLES", "CREATE");\n    const body'
  );
  return res;
});

// 6. vehicles/[id]/route.ts
patchFile('src/app/api/vehicles/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { id } = await params;',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "VEHICLES", "VIEW");\n    const { id } = await params;'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id } = await params;',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "VEHICLES", "UPDATE");\n    const { id } = await params;'
  );
  return res;
});

// 7. activities/route.ts
patchFile('src/app/api/activities/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const queryParams',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ACTIVITIES", "VIEW");\n    const queryParams'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const body',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ACTIVITIES", "CREATE");\n    const body'
  );
  return res;
});

// 8. activities/[id]/route.ts
patchFile('src/app/api/activities/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { id } = await params;',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ACTIVITIES", "VIEW");\n    const { id } = await params;'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id } = await params;',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ACTIVITIES", "UPDATE");\n    const { id } = await params;'
  );
  return res;
});

// 9. documents/route.ts
patchFile('src/app/api/documents/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireReadAccess,', 'requireReadAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const queryParams',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DOCUMENTS", "VIEW");\n    const queryParams'
  );
  return res;
});

// 10. documents/[id]/route.ts
patchFile('src/app/api/documents/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireReadAccess,', 'requireReadAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { id } = await params;',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DOCUMENTS", "VIEW");\n    const { id } = await params;'
  );
  return res;
});

// 11. documents/[id]/issue/route.ts
patchFile('src/app/api/documents/[id]/issue/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id } = await params;',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DOCUMENTS", "CREATE");\n    const { id } = await params;'
  );
  return res;
});

// 12. documents/[id]/revoke/route.ts
patchFile('src/app/api/documents/[id]/revoke/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id } = await params;',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DOCUMENTS", "UPDATE");\n    const { id } = await params;'
  );
  return res;
});

// 13. itinerary-templates/route.ts
patchFile('src/app/api/itinerary-templates/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const query = validateQueryParams(',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "VIEW");\n    const query = validateQueryParams('
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const body = await validateJson(',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");\n    const body = await validateJson('
  );
  return res;
});

// 14. operations/issues/route.ts
patchFile('src/app/api/operations/issues/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireReadAccess,', 'requireReadAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { searchParams }',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");\n    const { searchParams }'
  );
  return res;
});

// 15. feedback/route.ts
patchFile('src/app/api/feedback/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireReadAccess } from "@/lib/api/context";', 'requireReadAccess,\n  enforceStaffPermission,\n} from "@/lib/api";');
  }
  res = res.replace(
    'const authContext = await requireReadAccess();\n    const { searchParams }',
    'const authContext = await requireReadAccess();\n    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "FEEDBACK", "VIEW");\n    const { searchParams }'
  );
  return res;
});

// 16. feedback/[id]/route.ts
patchFile('src/app/api/feedback/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireReadAccess } from "@/lib/api/context";', 'requireReadAccess,\n  enforceStaffPermission,\n} from "@/lib/api";');
  }
  res = res.replace(
    'const authContext = await requireReadAccess();\n    const { id } = await context.params;',
    'const authContext = await requireReadAccess();\n    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "FEEDBACK", "VIEW");\n    const { id } = await context.params;'
  );
  return res;
});

// 17. customer-insights/route.ts
patchFile('src/app/api/customer-insights/route.ts', (c) => {
  let res = c;
  res = res.replace('requireAgencyOwnerContext } from "@/lib/api/context";', 'requireMemberReadAccess, enforceStaffPermission } from "@/lib/api";');
  res = res.replace('const authContext = await requireAgencyOwnerContext();', 'const authContext = await requireMemberReadAccess();\n    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "CUSTOMER_INSIGHTS", "VIEW");');
  return res;
});

// 18. chat/conversation/route.ts
patchFile('src/app/api/chat/conversation/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireAgencyOwnerChatAccess } from "@/lib/api/context";', 'requireAgencyOwnerChatAccess,\n  enforceStaffPermission,\n} from "@/lib/api";');
  }
  res = res.replace(
    'const context = await requireAgencyOwnerChatAccess();\n    const conversation',
    'const context = await requireAgencyOwnerChatAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPORT_CHAT", "VIEW");\n    const conversation'
  );
  return res;
});

// 19. follow-ups/summary/route.ts
patchFile('src/app/api/follow-ups/summary/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireReadAccess,', 'requireReadAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const queryParams',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "VIEW");\n    const queryParams'
  );
  return res;
});

// 20. enquiries/[id]/follow-ups/route.ts
patchFile('src/app/api/enquiries/[id]/follow-ups/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,');
  }
  res = res.replace(
    'const context = await requireReadAccess();\n    const { id: enquiryId }',
    'const context = await requireReadAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "VIEW");\n    const { id: enquiryId }'
  );
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { id: enquiryId }',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "CREATE");\n    const { id: enquiryId }'
  );
  return res;
});

// 21. enquiries/[id]/follow-ups/[followUpId]/route.ts
patchFile('src/app/api/enquiries/[id]/follow-ups/[followUpId]/route.ts', (c) => {
  let res = c;
  if (!res.includes('enforceStaffPermission')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  enforceStaffPermission,\n  requireAgencyOwnerContext,');
  }
  res = res.replace(
    'const context = await requireWriteAccess();\n    const { followUpId } = await params;\n    const body = await validateJson(updateFollowUpSchema, request);',
    'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "UPDATE");\n    const { followUpId } = await params;\n    const body = await validateJson(updateFollowUpSchema, request);'
  );
  // Delete must remain Agency Owner only!
  res = res.replace(
    'export async function DELETE(request: NextRequest, { params }: RouteParams) {\n  try {\n    const context = await requireWriteAccess();',
    'export async function DELETE(request: NextRequest, { params }: RouteParams) {\n  try {\n    const context = await requireAgencyOwnerContext();'
  );
  return res;
});

// 22. rate-sheets/route.ts
patchFile('src/app/api/rate-sheets/route.ts', (c) => {
  let res = c;
  if (!res.includes('requireAgencyOwnerContext')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  requireAgencyOwnerContext,');
  }
  if (!res.includes('redactStaffFinancials')) {
    res = res.replace('import { rateSheetService }', 'import { redactStaffFinancials } from "@/lib/auth/permissions";\nimport { rateSheetService }');
  }
  // Redact staff financials in GET
  res = res.replace(
    'return apiSuccess(result.items, 200, {',
    'const items = context.isAgencyStaff ? redactStaffFinancials(result.items, context.dbUser.role) : result.items;\n    return apiSuccess(items, 200, {'
  );
  // POST must be Agency Owner only
  res = res.replace(
    'export async function POST(request: NextRequest) {\n  try {\n    const context = await requireWriteAccess();',
    'export async function POST(request: NextRequest) {\n  try {\n    const context = await requireAgencyOwnerContext();'
  );
  return res;
});

// 23. rate-sheets/[id]/route.ts
patchFile('src/app/api/rate-sheets/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('redactStaffFinancials')) {
    res = res.replace('import { rateSheetService }', 'import { redactStaffFinancials } from "@/lib/auth/permissions";\nimport { rateSheetService }');
  }
  // Redact staff financials in GET
  res = res.replace(
    'return apiSuccess(rateSheet);',
    'const data = context.isAgencyStaff ? redactStaffFinancials(rateSheet, context.dbUser.role) : rateSheet;\n    return apiSuccess(data);'
  );
  // PATCH must be Agency Owner only
  res = res.replace(
    'export async function PATCH(request: NextRequest, props: RouteProps) {\n  try {\n    const context = await requireWriteAccess();',
    'export async function PATCH(request: NextRequest, props: RouteProps) {\n  try {\n    const context = await requireAgencyOwnerContext();'
  );
  return res;
});

// 24. suppliers/route.ts
patchFile('src/app/api/suppliers/route.ts', (c) => {
  let res = c;
  if (!res.includes('requireAgencyOwnerContext')) {
    res = res.replace('requireWriteAccess,', 'requireWriteAccess,\n  requireAgencyOwnerContext,');
  }
  if (!res.includes('redactStaffFinancials')) {
    res = res.replace('import { supplierService }', 'import { redactStaffFinancials } from "@/lib/auth/permissions";\nimport { supplierService }');
  }
  // Redact staff financials in GET
  res = res.replace(
    'return apiSuccess(result.items, 200, {',
    'const items = context.isAgencyStaff ? redactStaffFinancials(result.items, context.dbUser.role) : result.items;\n    return apiSuccess(items, 200, {'
  );
  // POST must be Agency Owner only
  res = res.replace(
    'export async function POST(request: NextRequest) {\n  try {\n    const context = await requireWriteAccess();',
    'export async function POST(request: NextRequest) {\n  try {\n    const context = await requireAgencyOwnerContext();'
  );
  return res;
});

// 25. suppliers/[id]/route.ts
patchFile('src/app/api/suppliers/[id]/route.ts', (c) => {
  let res = c;
  if (!res.includes('redactStaffFinancials')) {
    res = res.replace('import { supplierService }', 'import { redactStaffFinancials } from "@/lib/auth/permissions";\nimport { supplierService }');
  }
  // Redact staff financials in GET
  res = res.replace(
    'return apiSuccess(supplier);',
    'const data = context.isAgencyStaff ? redactStaffFinancials(supplier, context.dbUser.role) : supplier;\n    return apiSuccess(data);'
  );
  // PATCH must be Agency Owner only
  res = res.replace(
    'export async function PATCH(request: NextRequest, { params }: RouteParams) {\n  try {\n    const context = await requireWriteAccess();',
    'export async function PATCH(request: NextRequest, { params }: RouteParams) {\n  try {\n    const context = await requireAgencyOwnerContext();'
  );
  return res;
});

// 26. suppliers/page.tsx
patchFile('src/app/(dashboard)/suppliers/page.tsx', (c) => {
  let res = c;
  if (!res.includes('OwnerRestrictedCard')) {
    res = res.replace(
      'import { StatusBadge } from "@/components/shared/status-badge";',
      'import { StatusBadge } from "@/components/shared/status-badge";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\nimport { useAuth } from "@/context/auth-context";'
    );
  }
  if (!res.includes('const { isAgencyOwner } = useAuth();')) {
    res = res.replace(
      'export default function SuppliersPage() {\n  const router = useRouter();',
      `export default function SuppliersPage() {
  const router = useRouter();
  const { isAgencyOwner } = useAuth();

  if (!isAgencyOwner) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Supplier Management"
          description="Supplier directory, payables, contracts, and commercial accounts are restricted to the Agency Owner."
        />
      </div>
    );
  }`
    );
  }
  return res;
});

console.log('Finished patching API routes and page guards!');

