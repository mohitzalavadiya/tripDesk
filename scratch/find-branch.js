const { execSync } = require('child_process');
const branches = execSync('git branch').toString().split('\n').map(b => b.replace('*', '').trim()).filter(Boolean);
for (const b of branches) {
  try {
    const out = execSync(`git show ${b}:src/lib/services/enquiry-service.ts`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
    console.log(b, 'lines:', out.split('\n').length);
  } catch (e) {
    // file might not exist in that branch
  }
}

