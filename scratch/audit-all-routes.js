const fs = require("fs");
const path = require("path");

function getPages(dir, base = "") {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (item === "node_modules" || item === ".next" || item === ".git") continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getPages(full, `${base}/${item}`));
    } else if (item === "page.tsx" || item === "page.jsx") {
      results.push(base || "/");
    }
  }
  return results;
}

const dashboardPages = getPages("src/app/(dashboard)");
console.log("Found", dashboardPages.length, "dashboard pages:");
console.log(JSON.stringify(dashboardPages.sort(), null, 2));

