const fs = require("fs");
if (fs.existsSync("scratch/route-inventory.json")) {
  const inv = JSON.parse(fs.readFileSync("scratch/route-inventory.json", "utf8"));
  console.log("Total entries in inventory:", inv.length);
  const unguarded = inv.filter((x) => x.type === "unguarded");
  console.log("Total unguarded:", unguarded.length);
  unguarded.forEach((u) => console.log(u.method, u.file));
} else {
  console.log("scratch/route-inventory.json does not exist");
}

