import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { staffPermissionService } from "../src/lib/services/staff-permission-service";

async function main() {
  const staff = await prisma.user.findFirst({
    where: { role: "AGENCY_STAFF" },
    select: { id: true, agencyId: true },
  });
  if (!staff || !staff.agencyId) {
    console.log("No staff found");
    return;
  }

  console.log("Testing getStaffPermissions against real DB with unmigrated staff_permission_profiles table...");
  const perms = await staffPermissionService.getStaffPermissions(staff.agencyId, staff.id, prisma);
  console.log("Returned permissions:", perms);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

