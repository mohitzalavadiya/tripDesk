import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("src/lib/services/staff-permission-service.ts");
let content = fs.readFileSync(filePath, "utf-8");

function replaceNormalized(src: string, target: string, replacement: string): string {
  const normTarget = target.replace(/\r\n/g, "\n");
  const normSrc = src.replace(/\r\n/g, "\n");
  if (!normSrc.includes(normTarget)) {
    throw new Error(`Target not found: ${target.substring(0, 60)}...`);
  }
  const isCrlf = src.includes("\r\n");
  const replacedNorm = normSrc.replace(normTarget, replacement.replace(/\r\n/g, "\n"));
  return isCrlf ? replacedNorm.replace(/\n/g, "\r\n") : replacedNorm;
}

const target = `    try {
      if (client.staffPermissionProfile?.findUnique) {
        const profile = await client.staffPermissionProfile.findUnique({
          where: { userId },
        });

        if (profile?.permissions && typeof profile.permissions === "object") {
          return profile.permissions as StaffPermissionsProfileMap;
        }
      }
    } catch {
      // Fallback if table not yet migrated
    }

    return DEFAULT_STAFF_PERMISSIONS;`;

const repl = `    try {
      if (client.staffPermissionProfile?.findUnique) {
        const profile = await client.staffPermissionProfile.findUnique({
          where: { userId },
        });

        // 1. Genuinely new or unconfigured staff member: query succeeded and returned no custom record
        if (profile === null || profile === undefined) {
          return DEFAULT_STAFF_PERMISSIONS;
        }

        // 2. Existing profile with valid structured permissions object
        if (profile?.permissions && typeof profile.permissions === "object" && !Array.isArray(profile.permissions)) {
          return profile.permissions as StaffPermissionsProfileMap;
        }

        // 3. Profile exists but permissions field is corrupt/malformed -> fail closed
        console.warn("[StaffPermissionService] Corrupt or malformed permission profile detected; failing closed", {
          agencyId,
          userId,
        });
        return {};
      }
    } catch (err: any) {
      // 4. Database failure, connection outage, or unmigrated table (e.g. Prisma P2021)
      console.error("[StaffPermissionService] Database or schema failure while retrieving staff permissions; failing closed", {
        agencyId,
        userId,
        errorCode: err?.code,
        errorMessage: err?.message,
      });
      return {};
    }

    return DEFAULT_STAFF_PERMISSIONS;`;

content = replaceNormalized(content, target, repl);
fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated staff-permission-service.ts!");

