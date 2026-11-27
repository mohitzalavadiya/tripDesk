const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma/test-crm-correctness.ts');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const oldTarget = `  // 38.3: Destructive Deletion Owner-Only Guard
  {
    const staffGrantsWithDelete: any = {
      ...DEFAULT_STAFF_PERMISSIONS,
      ENQUIRIES: { ...DEFAULT_STAFF_PERMISSIONS.ENQUIRIES, delete: true },
      CUSTOMERS: { ...DEFAULT_STAFF_PERMISSIONS.CUSTOMERS, delete: true },
      BOOKINGS: { ...DEFAULT_STAFF_PERMISSIONS.BOOKINGS, delete: true },
    };

    const staffEnqDelete = evaluateStaffPermission("AGENCY_STAFF", staffGrantsWithDelete, "ENQUIRIES", "delete");
    const staffCustDelete = evaluateStaffPermission("AGENCY_STAFF", staffGrantsWithDelete, "CUSTOMERS", "delete");
    const staffBkDelete = evaluateStaffPermission("AGENCY_STAFF", staffGrantsWithDelete, "BOOKINGS", "delete");
    const ownerEnqDelete = evaluateStaffPermission("AGENCY_OWNER", null, "ENQUIRIES", "delete");

    assert(
      staffEnqDelete === false &&
      staffCustDelete === false &&
      staffBkDelete === false &&
      ownerEnqDelete === true,
      "[Phase F Deletion Guard] Destructive deletion is mathematically impossible for staff and strictly reserved for Agency Owner"
    );
  }`;

const newReplacement = `  // 38.3: Delegable Operational Deletion Guard & Owner-Only Boundaries
  {
    // Default staff permissions: delete is false across delegable modules
    const staffDefaultEnqDelete = evaluateStaffPermission("AGENCY_STAFF", DEFAULT_STAFF_PERMISSIONS, "ENQUIRIES", "delete");
    const staffDefaultCustDelete = evaluateStaffPermission("AGENCY_STAFF", DEFAULT_STAFF_PERMISSIONS, "CUSTOMERS", "delete");
    const staffDefaultBkDelete = evaluateStaffPermission("AGENCY_STAFF", DEFAULT_STAFF_PERMISSIONS, "BOOKINGS", "delete");

    // Delegated delete: allowed when explicitly granted
    const staffGrantsWithDelete: any = {
      ...DEFAULT_STAFF_PERMISSIONS,
      ENQUIRIES: { ...DEFAULT_STAFF_PERMISSIONS.ENQUIRIES, delete: true },
      CUSTOMERS: { ...DEFAULT_STAFF_PERMISSIONS.CUSTOMERS, delete: true },
      BOOKINGS: { ...DEFAULT_STAFF_PERMISSIONS.BOOKINGS, delete: true },
    };
    const staffEnqDelete = evaluateStaffPermission("AGENCY_STAFF", staffGrantsWithDelete, "ENQUIRIES", "delete");
    const staffCustDelete = evaluateStaffPermission("AGENCY_STAFF", staffGrantsWithDelete, "CUSTOMERS", "delete");
    const staffBkDelete = evaluateStaffPermission("AGENCY_STAFF", staffGrantsWithDelete, "BOOKINGS", "delete");

    // Non-delegable / immutable modules: strictly blocked even if granted
    const staffPayDelete = evaluateStaffPermission("AGENCY_STAFF", { PAYMENTS: { view: true, delete: true } }, "PAYMENTS", "delete");
    const staffFinDelete = evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, delete: true } }, "FINANCE", "delete");

    // Owner: permitted
    const ownerEnqDelete = evaluateStaffPermission("AGENCY_OWNER", null, "ENQUIRIES", "delete");

    assert(
      staffDefaultEnqDelete === false &&
      staffDefaultCustDelete === false &&
      staffDefaultBkDelete === false &&
      staffEnqDelete === true &&
      staffCustDelete === true &&
      staffBkDelete === true &&
      staffPayDelete === false &&
      staffFinDelete === false &&
      ownerEnqDelete === true,
      "[Phase F Deletion Guard] Delegable deletions permitted when granted, denied by default, and immutable modules permanently protected"
    );
  }`;

if (content.includes(oldTarget)) {
  content = content.replace(oldTarget, newReplacement);
  fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated Test 38.3 in prisma/test-crm-correctness.ts');
} else {
  console.error('Target not found in prisma/test-crm-correctness.ts');
}

