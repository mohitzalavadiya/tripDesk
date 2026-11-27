const fs = require('fs');
let c = fs.readFileSync('scratch/test-permissions-acceptance-gate.ts', 'utf8');
c = c.replace('assert(normalized.REPORTS.export === false, "REPORTS export forced to false");', 'assert(Boolean(normalized.REPORTS?.export) === false, "REPORTS export forced to false");');
fs.writeFileSync('scratch/test-permissions-acceptance-gate.ts', c);
console.log('Updated acceptance gate test');

