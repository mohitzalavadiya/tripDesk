const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!full.includes('node_modules') && !full.includes('.next') && !full.includes('.git')) {
        results = results.concat(walk(full));
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('src');
const hits = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('canAccessFinancialMargins')) {
    hits.push(f);
  }
}
console.log('Files using canAccessFinancialMargins:', hits);

