const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('evaluateStaffPermission')) {
    console.log(i + 1, l);
  }
});

