const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma/test-staff-application-wide-authorization.ts');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  'DEFAULT_STAFF_PERMISSIONS,',
  'DEFAULT_STAFF_PERMISSIONS,\n  evaluateStaffPermission,'
);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated test-staff-application-wide-authorization.ts');

