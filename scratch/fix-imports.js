const fs = require("fs");
const path = require("path");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

const allRoutes = walk("src/app/api");
for (const file of allRoutes) {
  let content = fs.readFileSync(file, "utf8");
  const isCrlf = content.includes("\r\n");
  let normalized = content.replace(/\r\n/g, "\n");

  if (normalized.includes("enforceStaffPermission(") && !normalized.includes("enforceStaffPermission") || 
      (normalized.includes("enforceStaffPermission(") && !/import\s*\{[^}]*enforceStaffPermission[^}]*\}\s*from\s*["']@\/lib\/api["']/.test(normalized))) {
    // Needs import
    // Look for import from "@/lib/api"
    const apiImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*["']@\/lib\/api["'];/;
    if (apiImportRegex.test(normalized)) {
      normalized = normalized.replace(apiImportRegex, (match, imports) => {
        if (imports.includes("enforceStaffPermission")) return match;
        return `import {\n  enforceStaffPermission,\n${imports.trim()}\n} from "@/lib/api";`;
      });
      const finalContent = isCrlf ? normalized.replace(/\n/g, "\r\n") : normalized;
      fs.writeFileSync(file, finalContent, "utf8");
      console.log("Fixed import in:", file);
    } else {
      console.warn("No @/lib/api import found in:", file);
    }
  }
}

