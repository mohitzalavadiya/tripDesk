const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gitObjectsDir = path.resolve('.git', 'objects');
const subdirs = fs.readdirSync(gitObjectsDir);

for (const sub of subdirs) {
  if (sub.length !== 2) continue;
  const subPath = path.join(gitObjectsDir, sub);
  const files = fs.readdirSync(subPath);
  for (const f of files) {
    const hash = sub + f;
    try {
      const type = execSync(`git cat-file -t ${hash}`).toString().trim();
      if (type === 'blob') {
        const content = execSync(`git cat-file -p ${hash}`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
        if (content.includes('SELECT "id", "agencyId", "convertedTripId"')) {
          console.log('FOUND BLOB:', hash, 'lines:', content.split('\n').length);
          fs.writeFileSync('scratch/recovered-enquiry-service.ts', content, 'utf8');
          process.exit(0);
        }
      }
    } catch (e) {}
  }
}
console.log('Not found in loose objects.');

