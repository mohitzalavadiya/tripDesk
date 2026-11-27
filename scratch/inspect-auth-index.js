const fs = require('fs');
console.log(fs.readFileSync('src/lib/auth/index.ts', 'utf8').slice(0, 1500));

