import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("src/app/(dashboard)");
const findings = [];

files.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  const relPath = path.relative(process.cwd(), f).replace(/\\/g, "/");
  
  // Check for router.refresh
  const hasRouterRefresh = content.includes("router.refresh()");
  // Check for setLoading(true) in fetch callbacks or mutation handlers
  const hasSetLoading = content.includes("setLoading(true)");
  // Check if skeleton replaces content
  const hasIfLoadingReturn = /if\s*\(\s*loading\s*\)\s*return/.test(content);
  const hasLoadingSkeleton = /\{loading\s*&&\s*<[A-Za-z]+Skeleton/.test(content);
  const hasLoadingTernary = /\{loading\s*\?\s*<[A-Za-z]+Skeleton/.test(content);
  
  if (hasRouterRefresh || hasSetLoading || hasIfLoadingReturn || hasLoadingSkeleton || hasLoadingTernary) {
    findings.push({
      file: relPath,
      hasRouterRefresh,
      hasSetLoading,
      hasIfLoadingReturn,
      hasLoadingSkeleton,
      hasLoadingTernary,
    });
  }
});

console.log("Total dashboard pages with loading patterns:", findings.length);
findings.forEach(f => {
  console.log(`${f.file}: refresh=${f.hasRouterRefresh}, setLoading=${f.hasSetLoading}, ifLoadingReturn=${f.hasIfLoadingReturn}, skeletonCondition=${f.hasLoadingSkeleton || f.hasLoadingTernary}`);
});

