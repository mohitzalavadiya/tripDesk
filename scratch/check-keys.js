const fs = require("fs");
const inv = JSON.parse(fs.readFileSync("scratch/route-inventory.json", "utf8"));
console.log("Keys of first entry:", Object.keys(inv[0]));
console.log("First entry:", JSON.stringify(inv[0], null, 2));

