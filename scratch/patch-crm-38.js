const fs = require("fs");
let code = fs.readFileSync("prisma/test-crm-correctness.ts", "utf8");

code = code.replace(
  `    const canTeam = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "TEAM", "view");
    const canFinanceDelete = evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, delete: true } }, "FINANCE", "delete");
    const canSettingsDelete = evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true, delete: true } }, "SETTINGS", "delete");

    assert(
      canSettings === true &&
      canFinance === true &&
      canFinanceDelete === false &&
      canSettingsDelete === false &&
      canSubscription === false &&
      canTeam === false,
      "[Phase F Role Ceiling] Hard ceiling prevents staff from deleting FINANCE/SETTINGS and accessing SUBSCRIPTION or TEAM regardless of profile grants"
    );`,
  `    const canTeam = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "TEAM", "view");
    const canFinanceDelete = evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, delete: true } }, "FINANCE", "delete");
    const canSettingsDelete = evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true, delete: true } }, "SETTINGS", "delete");
    const canSubscriptionDelete = evaluateStaffPermission("AGENCY_STAFF", { SUBSCRIPTION: { view: true, delete: true } }, "SUBSCRIPTION", "delete");
    const canTeamDelete = evaluateStaffPermission("AGENCY_STAFF", { TEAM: { view: true, delete: true } }, "TEAM", "delete");

    assert(
      canSettings === true &&
      canFinance === true &&
      canSubscription === true &&
      canTeam === true &&
      canFinanceDelete === false &&
      canSettingsDelete === false &&
      canSubscriptionDelete === false &&
      canTeamDelete === false,
      "[Phase F Role Ceiling] Configurable page permissions allow delegated view while hard ceiling prevents unauthorized deletions"
    );`
);

fs.writeFileSync("prisma/test-crm-correctness.ts", code, "utf8");
console.log("prisma/test-crm-correctness.ts 38.2 patched successfully!");

