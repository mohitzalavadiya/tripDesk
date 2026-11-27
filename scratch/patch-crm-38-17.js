const fs = require("fs");
let code = fs.readFileSync("prisma/test-crm-correctness.ts", "utf8");

code = code.replace(
  `      profile.SETTINGS.view === false &&
      profile.FINANCE.view === false &&
      profile.SUBSCRIPTION === undefined,`,
  `      profile.SETTINGS.view === false &&
      profile.FINANCE.view === false &&
      profile.SUBSCRIPTION?.view === false,`
);

fs.writeFileSync("prisma/test-crm-correctness.ts", code, "utf8");
console.log("prisma/test-crm-correctness.ts 38.17 patched successfully!");

