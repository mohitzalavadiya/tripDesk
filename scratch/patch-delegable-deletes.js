const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const updates = [
  {
    file: 'src/app/api/activities/[id]/route.ts',
    module: 'ACTIVITIES',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ACTIVITIES", "DELETE");',
  },
  {
    file: 'src/app/api/destinations/[id]/route.ts',
    module: 'DESTINATIONS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "DELETE");',
  },
  {
    file: 'src/app/api/hotels/[id]/route.ts',
    module: 'HOTELS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "DELETE");',
  },
  {
    file: 'src/app/api/vehicles/[id]/route.ts',
    module: 'VEHICLES',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "VEHICLES", "DELETE");',
  },
  {
    file: 'src/app/api/itinerary-templates/[id]/route.ts',
    module: 'ITINERARIES',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "DELETE");',
    ensureImport: 'enforceStaffPermission',
  },
  {
    file: 'src/app/api/customers/[id]/route.ts',
    module: 'CUSTOMERS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireMemberWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "CUSTOMERS", "DELETE");',
    ensureImport: 'enforceStaffPermission',
  },
  {
    file: 'src/app/api/enquiries/[id]/route.ts',
    module: 'ENQUIRIES',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireMemberWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ENQUIRIES", "DELETE");',
    ensureImport: 'enforceStaffPermission',
  },
  {
    file: 'src/app/api/enquiries/[id]/follow-ups/[followUpId]/route.ts',
    module: 'FOLLOW_UPS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "DELETE");',
  },
  {
    file: 'src/app/api/trips/[id]/route.ts',
    module: 'TRIPS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireMemberWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "DELETE");',
    ensureImport: 'enforceStaffPermission',
  },
  {
    file: 'src/app/api/quotations/[id]/route.ts',
    module: 'QUOTATIONS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "DELETE");',
  },
  {
    file: 'src/app/api/bookings/[id]/route.ts',
    module: 'BOOKINGS',
    find: 'const context = await requireAgencyOwnerContext();',
    replace: 'const context = await requireMemberWriteAccess();\n    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "BOOKINGS", "DELETE");',
    ensureImport: 'enforceStaffPermission',
  },
];

for (const u of updates) {
  const fullPath = path.join(rootDir, u.file);
  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');

  if (u.ensureImport && !content.includes(u.ensureImport)) {
    content = content.replace('requireAgencyOwnerContext,\n', `requireAgencyOwnerContext,\n  ${u.ensureImport},\n`);
  }

  if (content.includes(u.find)) {
    content = content.replace(u.find, u.replace);
    fs.writeFileSync(fullPath, content.replace(/\n/g, '\r\n'), 'utf8');
    console.log(`Successfully patched ${u.file} for ${u.module}`);
  } else {
    console.error(`Target not found in ${u.file}`);
  }
}

