const fs = require('fs');
let c = fs.readFileSync('scratch/test-permissions-acceptance-gate.ts', 'utf8');
c = c.replace('}, "AGENCY_STAFF");', '});');
fs.writeFileSync('scratch/test-permissions-acceptance-gate.ts', c);
console.log('Fixed toStaffSafeQuotationDTO call in acceptance gate test');

