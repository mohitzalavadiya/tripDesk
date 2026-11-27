const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/audit-results.json', 'utf8'));

console.log('Total files with matches:', Object.keys(data.byFile).length);

const output = [];

for (const [file, matches] of Object.entries(data.byFile)) {
  const fileContent = fs.readFileSync(file, 'utf8').split('\n');
  
  output.push(`\n=== FILE: ${file} (${matches.length} matches) ===`);
  for (const m of matches) {
    const lineIdx = m.line - 1;
    const start = Math.max(0, lineIdx - 2);
    const end = Math.min(fileContent.length, lineIdx + 3);
    const snippet = fileContent.slice(start, end).map((l, i) => {
      const currLine = start + i + 1;
      return `${currLine === m.line ? '>> ' : '   '}${currLine}: ${l}`;
    }).join('\n');
    output.push(`[Line ${m.line}] Match for ${m.pattern}:`);
    output.push(snippet);
  }
}

fs.writeFileSync('scratch/all-matches-context.txt', output.join('\n'), 'utf8');
console.log('Saved to scratch/all-matches-context.txt');

