const fs = require("fs");
let code = fs.readFileSync("prisma/test-staff-failures-phase1.ts", "utf8");

code = code.replace(
  'assert.strictEqual(keys.length, 33, "PAGE_PERMISSIONS_REGISTRY must contain exactly 33 canonical permission entries");',
  'assert.strictEqual(keys.length, 35, "PAGE_PERMISSIONS_REGISTRY must contain exactly 35 canonical permission entries");'
);

fs.writeFileSync("prisma/test-staff-failures-phase1.ts", code, "utf8");
console.log("Updated count to 35!");

