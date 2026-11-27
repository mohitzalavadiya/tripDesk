const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/audit-results.json', 'utf8'));

const dashboardFiles = Object.keys(data.byFile).filter(f => f.startsWith('src/app/(dashboard)'));
console.log(`Analyzing ${dashboardFiles.length} dashboard files...`);

for (const file of dashboardFiles) {
  const matches = data.byFile[file];
  console.log(`\nFILE: ${file} (${matches.length} matches)`);
  for (const m of matches) {
    console.log(`  Line ${m.line}: ${m.code}`);
  }
}

