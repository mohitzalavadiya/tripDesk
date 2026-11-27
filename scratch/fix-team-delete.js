const fs = require("fs");
let code = fs.readFileSync("src/lib/auth/permissions.ts", "utf8");

code = code.replace(
  '  "REFERRALS",\n  "TEAM",\n]);',
  '  "REFERRALS",\n]);'
);

// In PAGE_PERMISSIONS_REGISTRY, set TEAM delegableActions to ["view", "create"]
code = code.replace(
  '    moduleKey: "TEAM",\n    name: "Team & Staff Management",\n    description: "Agency staff directory and onboarding invitations (modifying staff permissions is Owner Only)",\n    route: "/settings?tab=team",\n    category: "Settings & Admin",\n    isOwnerOnly: false,\n    delegableActions: ["view", "create", "update", "delete"],',
  '    moduleKey: "TEAM",\n    name: "Team & Staff Management",\n    description: "Agency staff directory and onboarding invitations (modifying staff permissions & removing staff are Owner Only)",\n    route: "/settings?tab=team",\n    category: "Settings & Admin",\n    isOwnerOnly: false,\n    delegableActions: ["view", "create"],'
);

fs.writeFileSync("src/lib/auth/permissions.ts", code, "utf8");
console.log("TEAM delete kept strictly owner-only!");

