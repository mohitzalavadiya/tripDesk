import "dotenv/config";
import { staffPermissionService } from "../src/lib/services/staff-permission-service";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const owner = await prisma.user.findFirst({
      where: { role: "AGENCY_OWNER" },
      select: { id: true, agencyId: true }
    });
    const staff = await prisma.user.findFirst({
      where: { role: "AGENCY_STAFF" },
      select: { id: true, agencyId: true }
    });
    console.log("Owner:", owner);
    console.log("Staff:", staff);

    if (owner && staff) {
      const res = await staffPermissionService.updateStaffPermissions(
        owner.agencyId!,
        staff.id,
        owner.id,
        { CUSTOMERS: { view: true, create: true, update: true } } as any
      );
      console.log("Success:", res);
    }
  } catch (err: any) {
    console.log("Caught expected error:");
    console.log("Message:", err.message);
    console.log("Code:", err.code);
  } finally {
    await prisma.$disconnect();
  }
}
main();
