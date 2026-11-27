import fs from "fs";

const pagesToCheck = [
  "src/app/(dashboard)/customers/page.tsx",
  "src/app/(dashboard)/customers/[id]/page.tsx",
  "src/app/(dashboard)/trips/page.tsx",
  "src/app/(dashboard)/trips/[id]/page.tsx",
  "src/app/(dashboard)/quotations/page.tsx",
  "src/app/(dashboard)/quotations/[id]/page.tsx",
  "src/app/(dashboard)/bookings/page.tsx",
  "src/app/(dashboard)/bookings/[id]/page.tsx",
  "src/app/(dashboard)/payments/page.tsx",
  "src/app/(dashboard)/follow-ups/page.tsx",
  "src/app/(dashboard)/settings/page.tsx",
];

pagesToCheck.forEach(p => {
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split("\n");
  console.log(`\n=================== ${p} ===================`);
  
  // Find fetch function name
  const fetchMatches = content.match(/const\s+(fetch[A-Za-z0-9_]+|load[A-Za-z0-9_]+)\s*=\s*React\.useCallback/g);
  console.log("Fetch functions:", fetchMatches);

  // Look for if (loading) or loading &&
  lines.forEach((l, idx) => {
    if (l.includes("loading") && (l.includes("<TableSkeleton") || l.includes("<Skeleton") || l.includes("Skeleton") || l.includes("return ("))) {
      console.log(`Line ${idx+1}: ${l.trim()}`);
    }
  });

  // Look for mutation calls that call fetch
  lines.forEach((l, idx) => {
    if (l.includes("fetch") && (lines[idx-1]?.includes("toast.success") || lines[idx-2]?.includes("toast.success") || lines[idx-1]?.includes("setModal") || lines[idx-1]?.includes("setOpen") || lines[idx-1]?.includes("close"))) {
      console.log(`Post-mutation fetch at line ${idx+1}: ${l.trim()}`);
    }
  });
});

