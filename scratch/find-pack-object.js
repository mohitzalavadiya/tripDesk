const { execSync } = require('child_process');
const fs = require('fs');

try {
  const objects = execSync('git rev-list --objects --all').toString('utf8').split('\n');
  for (const line of objects) {
    const hash = line.split(' ')[0];
    if (!hash || hash.length !== 40) continue;
    try {
      const type = execSync(`git cat-file -t ${hash}`).toString().trim();
      if (type === 'blob') {
        const content = execSync(`git cat-file -p ${hash}`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
        if (content.includes('SELECT "id", "agencyId", "convertedTripId"')) {
          console.log('FOUND IN PACKED OBJECT:', hash, 'lines:', content.split('\n').length);
          fs.writeFileSync('scratch/recovered-enquiry-service.ts', content, 'utf8');
          process.exit(0);
        }
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
console.log('Not found in packed objects.');

