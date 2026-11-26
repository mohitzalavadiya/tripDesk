const fs = require("fs");
const inv = JSON.parse(fs.readFileSync("scratch/route-inventory.json", "utf8"));
const types = {};
for (const entry of inv) {
  types[entry.type] = (types[entry.type] || 0) + 1;
}
console.log("Types distribution:", types);
const samples = inv.filter(x => x.type === "member_write" || x.type === "member_read" || x.type === "context_only").slice(0, 15);
console.log("Samples:", JSON.stringify(samples, null, 2));

