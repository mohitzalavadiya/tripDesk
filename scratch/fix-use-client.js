const fs = require('fs');

const files = [
  'src/app/(dashboard)/activities/new/page.tsx',
  'src/app/(dashboard)/activities/[id]/page.tsx',
  'src/app/(dashboard)/hotels/new/page.tsx',
  'src/app/(dashboard)/hotels/[id]/page.tsx',
  'src/app/(dashboard)/vehicles/new/page.tsx',
  'src/app/(dashboard)/vehicles/[id]/page.tsx',
  'src/app/(dashboard)/operations/[tripId]/page.tsx',
  'src/app/(dashboard)/operations/analytics/page.tsx',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove "use client" wherever it is
  content = content.replace(/["']use client["'];?\s*/g, '');
  // Clean leading whitespace/newlines
  content = content.trimStart();
  // Ensure "use client"; is at the very top
  content = '"use client";\n\n' + content;
  fs.writeFileSync(file, content);
  console.log(`Ensured "use client" at top of ${file}`);
});
