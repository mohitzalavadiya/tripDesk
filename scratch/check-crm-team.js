const fs = require("fs");
const content = fs.readFileSync("prisma/test-crm-correctness.ts", "utf8");
const lines = content.split("\n");
lines.forEach((line, idx) => {
  if (line.includes("teamInvRouteSrc") || line.includes("teamRevokeRouteSrc") || line.includes("teamResendRouteSrc") || line.includes("Team Invitation API Guard")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

