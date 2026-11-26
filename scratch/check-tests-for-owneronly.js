const fs = require("fs");
const path = require("path");

const files = ["prisma/test-staff-failures-phase1.ts", "prisma/test-staff-application-wide-authorization.ts"];
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes("isOwnerOnly") || line.includes("SUBSCRIPTION") || line.includes("IMMUTABLE")) {
      console.log(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}

