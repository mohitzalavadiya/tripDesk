const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".next" || file === ".git") continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file === "page.tsx") {
      const content = fs.readFileSync(full, "utf8");
      if (content.includes("isAgencyOwner") || content.includes("OwnerRestrictedCard")) {
        results.push({ file: full, hasOwnerCheck: content.includes("isAgencyOwner"), hasCard: content.includes("OwnerRestrictedCard") });
      }
    }
  }
  return results;
}

console.log(JSON.stringify(walk("src/app/(dashboard)"), null, 2));

