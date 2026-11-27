const fs = require("fs");
let code = fs.readFileSync("scratch/test-permissions-acceptance-gate.ts", "utf8");

code = code.replace(
  `    assert(normalized.SUBSCRIPTION === undefined || normalized.SUBSCRIPTION.delete === false, "Subscription is permanently locked from staff");

    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "CUSTOMERS", "DELETE") === true, "Staff authorized to delete customer");
    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "FINANCE", "DELETE") === false, "Staff denied finance deletion");
    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "SUBSCRIPTION", "VIEW") === false, "Staff denied subscription view");`,
  `    assert(normalized.SUBSCRIPTION.delete === false, "Subscription delete is non-delegable and forced false");

    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "CUSTOMERS", "DELETE") === true, "Staff authorized to delete customer");
    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "FINANCE", "DELETE") === false, "Staff denied finance deletion");
    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "SUBSCRIPTION", "VIEW") === true, "Staff permitted subscription view when granted");
    assert(evaluateStaffPermission("AGENCY_STAFF", normalized, "SUBSCRIPTION", "DELETE") === false, "Staff denied subscription deletion");`
);

fs.writeFileSync("scratch/test-permissions-acceptance-gate.ts", code, "utf8");
console.log("acceptance gate test script updated!");

