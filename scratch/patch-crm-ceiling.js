const fs = require('fs');

const p = 'prisma/test-crm-correctness.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /const maliciousStaffGrants: any = \{\r?\n\s+\.\.\.DEFAULT_STAFF_PERMISSIONS,\r?\n\s+SETTINGS: \{ view: true, update: true \},\r?\n\s+FINANCE: \{ view: true, manage: true \},\r?\n\s+REPORTS: \{ view: true, export: true \},\r?\n\s+TEAM: \{ view: true, invite: true \},\r?\n\s+\};\r?\n\s+const canSettings = evaluateStaffPermission\("AGENCY_STAFF", maliciousStaffGrants, "SETTINGS", "view"\);\r?\n\s+const canFinance = evaluateStaffPermission\("AGENCY_STAFF", maliciousStaffGrants, "FINANCE", "view"\);\r?\n\s+const canReports = evaluateStaffPermission\("AGENCY_STAFF", maliciousStaffGrants, "REPORTS", "view"\);\r?\n\s+const canTeam = evaluateStaffPermission\("AGENCY_STAFF", maliciousStaffGrants, "TEAM", "view"\);\r?\n\s+assert\(\r?\n\s+canSettings === false &&\r?\n\s+canFinance === false &&\r?\n\s+canReports === false &&\r?\n\s+canTeam === false,\r?\n\s+"\[Phase F Role Ceiling\] Hard ceiling prevents staff from accessing SETTINGS, FINANCE, REPORTS, or TEAM regardless of profile grants"\r?\n\s+\);/,
  `const maliciousStaffGrants: any = {
      ...DEFAULT_STAFF_PERMISSIONS,
      SETTINGS: { view: true, update: true },
      FINANCE: { view: true, manage: true },
      SUBSCRIPTION: { view: true, manage: true },
      TEAM: { view: true, invite: true },
    };

    const canSettings = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "SETTINGS", "view");
    const canFinance = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "FINANCE", "view");
    const canSubscription = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "SUBSCRIPTION", "view");
    const canTeam = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "TEAM", "view");

    assert(
      canSettings === false &&
      canFinance === false &&
      canSubscription === false &&
      canTeam === false,
      "[Phase F Role Ceiling] Hard ceiling prevents staff from accessing SETTINGS, FINANCE, SUBSCRIPTION, or TEAM regardless of profile grants"
    );`
);

fs.writeFileSync(p, c, 'utf8');
console.log('Updated test-crm-correctness.ts');

