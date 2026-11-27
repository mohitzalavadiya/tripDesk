const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'lib', 'services', 'staff-permission-service.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace the lines in hasStaffPermission
content = content.replace(
  `    if (role === "AGENCY_OWNER") return actionKey.toUpperCase() !== "DELETE" || true;\r\n    if (role !== "AGENCY_STAFF") return false;\r\n\r\n    // Destructive deletion is ALWAYS denied for staff\r\n    if (actionKey.toUpperCase() === "DELETE") return false;`,
  `    if (role === "AGENCY_OWNER") return true;\r\n    if (role !== "AGENCY_STAFF") return false;`
);

// Fallback if newline is \\n
content = content.replace(
  `    if (role === "AGENCY_OWNER") return actionKey.toUpperCase() !== "DELETE" || true;\n    if (role !== "AGENCY_STAFF") return false;\n\n    // Destructive deletion is ALWAYS denied for staff\n    if (actionKey.toUpperCase() === "DELETE") return false;`,
  `    if (role === "AGENCY_OWNER") return true;\n    if (role !== "AGENCY_STAFF") return false;`
);

content = content.replace(
  `   * 2. Cannot grant DELETE (always owner-only).`,
  `   * 2. Cannot grant DELETE on immutable owner-only modules.`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched src/lib/services/staff-permission-service.ts');

