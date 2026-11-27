const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".next" || file === ".git" || file === "dist") continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = fs.readFileSync(full, "utf8");
      if (content.includes("IMMUTABLE_OWNER_ONLY_MODULES")) {
        results.push(full);
      }
    }
  }
  return results;
}

console.log(JSON.stringify(walk("."), null, 2));

