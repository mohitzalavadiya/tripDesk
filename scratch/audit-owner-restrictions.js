const fs = require('fs');
const path = require('path');

const SEARCH_PATTERNS = [
  /Owner Only/i,
  /ownerOnly/,
  /isOwnerOnly/,
  /IMMUTABLE_OWNER_ONLY_MODULES/,
  /isAgencyOwner/,
  /!isAgencyOwner/,
  /AGENCY_OWNER/,
  /OwnerRestrictedCard/
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (/\.(tsx?|jsx?)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allSrcFiles = getAllFiles(path.resolve('src'));
console.log(`Discovered ${allSrcFiles.length} files in src/`);

const results = [];

for (const filePath of allSrcFiles) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    for (const pattern of SEARCH_PATTERNS) {
      if (pattern.test(line)) {
        results.push({
          file: relPath,
          line: lineNum,
          pattern: pattern.toString(),
          code: trimmed
        });
        break; // Match once per line
      }
    }
  });
}

console.log(`Total matching lines found: ${results.length}`);

// Group by file
const byFile = {};
for (const r of results) {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
}

fs.writeFileSync('scratch/audit-results.json', JSON.stringify({
  totalFiles: allSrcFiles.length,
  totalMatches: results.length,
  filesWithMatches: Object.keys(byFile).length,
  byFile,
  results
}, null, 2));

console.log(`Results written to scratch/audit-results.json across ${Object.keys(byFile).length} files.`);

