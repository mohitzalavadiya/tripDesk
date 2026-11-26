const fs = require("fs");
const content = fs.readFileSync("TRIPDESK_MASTER_CONTEXT_FINAL_V3.md", "utf8");
const idx = content.lastIndexOf("276.");
if (idx !== -1) {
  console.log(content.substring(idx));
} else {
  console.log("Not found");
}

