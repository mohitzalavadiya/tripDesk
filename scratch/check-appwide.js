const fs = require("fs");
const content = fs.readFileSync("prisma/test-staff-application-wide-authorization.ts", "utf8");
const lines = content.split("\n");
lines.forEach((line, idx) => {
  if (line.includes("AGENCY_SETTINGS_BILLING") || line.includes("TEAM_INVITATIONS") || line.includes("canManageTeam") || line.includes("canManageAgencySettings")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

