const fs = require('fs');
let ops = fs.readFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', 'utf8');
const lines = ops.split('\n');
console.log('Total lines:', lines.length);
const retIdx = lines.findIndex(l => l.includes('from-slate-50 to-slate-100/50 pb-20'));
console.log('Return line index:', retIdx);
if (retIdx !== -1) {
  console.log('Preceding line:', lines[retIdx - 1]);
}

