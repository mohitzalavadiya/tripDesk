import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../src/lib/services/staff-permission-service.ts');
let content = fs.readFileSync(file, 'utf-8');

const targetImport = `import {
  DEFAULT_STAFF_PERMISSIONS,
  evaluateStaffPermission,
  StaffPermissionsProfileMap,
} from "@/lib/auth/permissions";`;

const replaceImport = `import {
  DEFAULT_STAFF_PERMISSIONS,
  evaluateStaffPermission,
  normalizeStaffPermissions,
  StaffPermissionsProfileMap,
} from "@/lib/auth/permissions";`;

const targetGet = `      // 3. Table exists and query executed successfully: existing profile with valid structured permissions object
      if (profile?.permissions && typeof profile.permissions === "object" && !Array.isArray(profile.permissions)) {
        return profile.permissions as StaffPermissionsProfileMap;
      }`;

const replaceGet = `      // 3. Table exists and query executed successfully: existing profile with valid structured permissions object
      if (profile?.permissions && typeof profile.permissions === "object" && !Array.isArray(profile.permissions)) {
        return normalizeStaffPermissions(profile.permissions);
      }`;

const targetSanitize = `    // Sanitize and enforce invariants
    const sanitized: StaffPermissionsProfileMap = {};

    for (const [moduleKey, actions] of Object.entries(permissionsInput)) {
      const cleanKey = moduleKey.toUpperCase();
      const viewAllowed = Boolean(actions.view);

      sanitized[cleanKey] = {
        view: viewAllowed,
        create: viewAllowed ? Boolean(actions.create) : false,
        update: viewAllowed ? Boolean(actions.update) : false,
        delete: false, // Strict Invariant: Staff can NEVER be granted delete
      };

      // Preserve specific flags only if view is allowed
      if (viewAllowed) {
        for (const [subAction, val] of Object.entries(actions)) {
          if (!["view", "create", "update", "delete"].includes(subAction)) {
            sanitized[cleanKey][subAction] = Boolean(val);
          }
        }
      }
    }`;

const replaceSanitize = `    // Sanitize and enforce invariants via canonical normalizer
    const sanitized = normalizeStaffPermissions(permissionsInput);`;

const targetEnd = `    return evaluateStaffPermission(role, grants, moduleKey, actionKey);
  },
};`;

const replaceEnd = `    return evaluateStaffPermission(role, grants, moduleKey, actionKey);
  },
};

/**
 * Enforces staff capability authorization at server API boundaries.
 * Agency Owner and Platform Owner immediately pass without database query.
 * For staff, verifies permission ceiling and saved grants; throws 403 ForbiddenError if denied.
 */
export async function enforceStaffPermission(
  role: string | null | undefined,
  agencyId: string,
  userId: string,
  moduleKey: string,
  actionKey: string,
  deniedMessage?: string,
  prismaClient: any = prisma
): Promise<void> {
  if (role !== "AGENCY_STAFF") return; // Agency Owner and Platform Owner bypass
  const allowed = await staffPermissionService.hasStaffPermission(
    role,
    agencyId,
    userId,
    moduleKey,
    actionKey,
    prismaClient
  );
  if (!allowed) {
    throw new ForbiddenError(
      deniedMessage || \`You do not have permission to \${actionKey.toLowerCase()} \${moduleKey.toLowerCase().replace(/_/g, " ")}.\`
    );
  }
}`;

const normalized = content.replace(/\r\n/g, '\n');
if (!normalized.includes(targetImport)) {
  console.error('Target import not found!');
  process.exit(1);
}
if (!normalized.includes(targetGet)) {
  console.error('Target get not found!');
  process.exit(1);
}
if (!normalized.includes(targetSanitize)) {
  console.error('Target sanitize not found!');
  process.exit(1);
}
if (!normalized.includes(targetEnd)) {
  console.error('Target end not found!');
  process.exit(1);
}

const updated = normalized
  .replace(targetImport, replaceImport)
  .replace(targetGet, replaceGet)
  .replace(targetSanitize, replaceSanitize)
  .replace(targetEnd, replaceEnd);

const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated staff-permission-service.ts!');

