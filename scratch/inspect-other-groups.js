const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/audit-results.json', 'utf8'));

function printGroup(name, filterFn) {
  const files = Object.keys(data.byFile).filter(filterFn);
  console.log(`\n======================================================`);
  console.log(`=== ${name} (${files.length} files) ===`);
  console.log(`======================================================`);
  for (const file of files) {
    const matches = data.byFile[file];
    console.log(`\nFILE: ${file} (${matches.length} matches)`);
    for (const m of matches) {
      console.log(`  Line ${m.line}: ${m.code}`);
    }
  }
}

printGroup('API ROUTES', f => f.startsWith('src/app/api'));
printGroup('COMPONENTS', f => f.startsWith('src/components'));
printGroup('LIB & AUTH', f => f.startsWith('src/lib'));
printGroup('CONTEXT & HOOKS', f => f.startsWith('src/context') || f.startsWith('src/hooks'));
printGroup('ACTIONS', f => f.startsWith('src/actions'));

