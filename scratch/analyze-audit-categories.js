const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/audit-results.json', 'utf8'));

console.log('--- FILES BY DIRECTORY GROUP ---');
const groups = {
  app_dashboard_pages: [],
  app_admin_pages: [],
  app_other_pages: [],
  api_routes: [],
  components: [],
  lib_and_auth: [],
  context_and_hooks: [],
  actions: [],
  other: []
};

for (const file of Object.keys(data.byFile)) {
  if (file.startsWith('src/app/(dashboard)')) {
    groups.app_dashboard_pages.push(file);
  } else if (file.startsWith('src/app/admin')) {
    groups.app_admin_pages.push(file);
  } else if (file.startsWith('src/app/api')) {
    groups.api_routes.push(file);
  } else if (file.startsWith('src/app')) {
    groups.app_other_pages.push(file);
  } else if (file.startsWith('src/components')) {
    groups.components.push(file);
  } else if (file.startsWith('src/lib')) {
    groups.lib_and_auth.push(file);
  } else if (file.startsWith('src/context') || file.startsWith('src/hooks')) {
    groups.context_and_hooks.push(file);
  } else if (file.startsWith('src/actions')) {
    groups.actions.push(file);
  } else {
    groups.other.push(file);
  }
}

for (const [k, v] of Object.entries(groups)) {
  console.log(`${k}: ${v.length} files`);
}

