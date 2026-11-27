import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../TRIPDESK_MASTER_CONTEXT_FINAL_V3.md');
let content = fs.readFileSync(file, 'utf-8');

const target = `---

# END OF MASTER HANDOVER V3

**Final filename:** \`TRIPDESK_MASTER_CONTEXT_FINAL_V3.md\``;

const section27642 = `### 276.42 Phase F Staff Permissions Database Migration, End-to-End Verification & Production Quality Gate Clearance (October 28, 2026)

#### 1. Prerequisite & Safety Protocol
1. **Database Environment Identification (Zero Credential Leakage):**
   - Direct inspection of environment configurations confirmed target host: \`aws-0-ap-northeast-1.pooler.supabase.com\` (Supabase PostgreSQL pooler port 6543, direct migration port 5432, database: \`postgres\`).
   - Zero credentials, passwords, or connection strings exposed or printed to logs.
2. **Physical Database Pre-Migration Backup:**
   - Prior to applying any schema mutations, full metadata and row data backup across all 60 public schema tables was generated and verified at \`scratch/backup_pre_phase_f.sql\` (1,236,492 bytes verified).

#### 2. Migration Execution & Schema Verification
1. **Migration Deployment:**
   - Executed \`npx prisma migrate deploy\` applying \`prisma/migrations/20261027150000_phase_f_staff_permissions/migration.sql\`.
   - Migration completed successfully with exit code 0.
   - Catalog verification in \`_prisma_migrations\`:
     - ID: \`89a22c00-f9b6-4c2a-ad9a-11bae1dbfd15\`
     - Migration Name: \`20261027150000_phase_f_staff_permissions\`
     - Started: \`2026-10-28T12:21:20.364Z\`, Finished: \`2026-10-28T12:21:21.230Z\`, Rolled back: \`null\`
2. **PostgreSQL Catalog Schema Confirmation:**
   - Table \`staff_permission_profiles\` verified: 6 columns (\`id\`, \`agencyId\`, \`userId\`, \`permissions\` [jsonb], \`createdAt\`, \`updatedAt\`), foreign keys to \`agencies\` and \`users\` with \`ON DELETE CASCADE\`.
   - Table \`agency_audit_logs\` verified: 13 columns (\`id\`, \`agencyId\`, \`actorUserId\`, \`targetUserId\`, \`action\`, \`entityType\`, \`entityId\`, \`previousState\`, \`newState\`, \`metadata\` [jsonb], \`ipAddress\`, \`userAgent\`, \`createdAt\`), foreign key to \`agencies\` with \`ON DELETE CASCADE\`.
   - Table \`payments\` verified: Added columns \`verifiedById\` (text) and \`verifiedAt\` (timestamp).
   - Table \`agency_invitations\` verified: Added column \`initialPermissions\` (jsonb).

#### 3. Code Hardening & Schema Alignment
1. **Payment Receipt Audit Log Schema Alignment:**
   - In \`src/lib/services/payment-service.ts\`, updated \`verifyPaymentReceipt\` and \`voidPaymentReceipt\` to route audit logging through \`agencyAuditService.logEvent(..., tx)\`.
   - Eliminated invalid direct property \`details\` in favor of schema-compliant \`metadata\`, preventing runtime validation errors when \`agency_audit_logs\` is present.
2. **Frontend Toast Error Message Unpacking:**
   - In \`src/components/team/staff-permissions-modal.tsx\`, updated error handlers in \`handleSave\`, \`handleReset\`, and permission loading to unwrap \`json.error?.message\`, eliminating \`[object Object]\` from toast notifications.
3. **Staff Permission Service Runtime Query Safety:**
   - Bound \`db.$queryRaw\` properly in \`staff-permission-service.ts\` and \`agency-audit-service.ts\` to ensure transaction clients and fallback prisma instances retain context without \`_createPrismaPromise\` undefined errors.

#### 4. End-to-End Live Workflow Verification
- **Target Staff Member:** \`8a664fc2-3245-44f7-8b14-1c062a716b9e\` ("Virus", role: \`AGENCY_STAFF\`)
- **Target Agency Owner:** \`1a5b8334-aef6-4754-83bc-8eb8b0c54151\` ("TripDesk Offical Test Agnecy", role: \`AGENCY_OWNER\`)
- **Agency ID:** \`cmu2g9rgq0000swtqbr5aie7x\`
- **Step 1 (GET initial):** Succeeded, loaded permissions.
- **Step 2 (PUT update custom permissions):** Succeeded. Persisted custom profile (\`PAYMENTS.export: true\`) to \`staff_permission_profiles\`. Recorded immutable audit log in \`agency_audit_logs\` with action \`STAFF_PERMISSIONS_UPDATED\`.
- **Step 3 (Direct DB validation):** Queried physical database table \`staff_permission_profiles\` and confirmed persistent storage.
- **Step 4 (GET reload):** Succeeded, confirmed active custom permissions.
- **Step 5 (POST reset):** Succeeded, reset permissions to \`DEFAULT_STAFF_PERMISSIONS\`, updated profile row in DB, recorded audit log entry.
- **Step 6 (Security guards):** Self-modification guard verified (400), cross-tenant isolation verified (404), non-existent staff verified (404).
- **Step 7 (Bookings & Payments verification):** \`bookingService.getBookings\` (6 bookings) and \`paymentService.getPayments\` (5 payments) executed cleanly with all relations intact.

#### 5. Comprehensive Quality Gate Clearance
- **Phase 1 Focused Suite (\`npm run test:staff:failures\`):** **25 / 25 Passed (100%)**
- **CRM Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)**
- **TypeScript Gate (\`npx tsc --noEmit\`):** **0 errors**
- **Git Formatting Gate (\`git diff --check\`):** **0 errors**
- **Production Build Gate (\`npm run build\`):** **Exit code 0; all 87 dynamic routes and 42 static pages compiled and optimized successfully**

---

# END OF MASTER HANDOVER V3

**Final filename:** \`TRIPDESK_MASTER_CONTEXT_FINAL_V3.md\``;

const normalized = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (!normalized.includes(normalizedTarget)) {
  console.error('Target handover ending not found!');
  process.exit(1);
}

const updated = normalized.replace(normalizedTarget, section27642.replace(/\r\n/g, '\n'));
const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated TRIPDESK_MASTER_CONTEXT_FINAL_V3.md with Section 276.42!');

