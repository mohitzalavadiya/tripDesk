const fs = require('fs');
const path = require('path');

function getPageFiles(dir, list = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      getPageFiles(full, list);
    } else if (f === 'page.tsx') {
      list.push(full);
    }
  }
  return list;
}

const allPages = getPageFiles('src/app/(dashboard)');
console.log(`Found ${allPages.length} dashboard page.tsx files.`);

const suspiciousGuards = [];

for (const p of allPages) {
  const rel = path.relative(process.cwd(), p).replace(/\\/g, '/');
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check if line has isAgencyOwner check guarding a return or condition
    if (line.includes('isAgencyOwner') && !line.includes('hasStaffPermission') && !line.includes('isAgencyStaff')) {
      // Check if this line is a page-level return or guard
      if (line.includes('return') || line.includes('if (') || line.includes('&& (') || line.includes('? (')) {
        suspiciousGuards.push({
          file: rel,
          line: idx + 1,
          code: line.trim()
        });
      }
    }
  });
}

console.log('--- POTENTIAL OWNER GUARDS WITHOUT STAFF CHECK ---');
console.log(JSON.stringify(suspiciousGuards, null, 2));

