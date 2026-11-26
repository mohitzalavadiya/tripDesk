const fs = require("fs");
let code = fs.readFileSync("src/lib/auth/permissions.ts", "utf8");

const oldSection = `    REPORTS_ANALYTICS: ["VIEW", "EXPORT"], // Delegable: owner can grant view and export
    AGENCY_SETTINGS_BILLING: [], // Strictly forbidden: NO subscription, invoice, or tax settings access
    TEAM_INVITATIONS: [], // Strictly forbidden: NO staff management or invitation privileges
    PLATFORM_ADMIN: [], // Strictly forbidden: NO platform admin access`;

const newSection = `    REPORTS_ANALYTICS: ["VIEW", "EXPORT"], // Delegable: owner can grant view and export
    AGENCY_SETTINGS_BILLING: ["VIEW"], // Delegable: owner can grant view for subscription & billing
    TEAM_INVITATIONS: ["VIEW", "CREATE", "UPDATE"], // Delegable: owner can grant team view and invite
    PLATFORM_ADMIN: [], // Strictly forbidden: NO platform admin access`;

if (code.includes(oldSection)) {
  code = code.replace(oldSection, newSection);
  fs.writeFileSync("src/lib/auth/permissions.ts", code, "utf8");
  console.log("ROLE_PERMISSION_MATRIX.AGENCY_STAFF updated successfully!");
} else {
  console.error("oldSection not found!");
}

