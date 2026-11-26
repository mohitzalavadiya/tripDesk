import { prisma } from "../src/lib/prisma";
import { enquiryService } from "../src/lib/services/enquiry-service";

async function main() {
  const enquiry = await prisma.enquiry.findFirst({
    select: { agencyId: true, id: true, title: true },
  });

  if (!enquiry) {
    console.log("No enquiries found in database.");
    return;
  }
  const agencyId = enquiry.agencyId;
  console.log("Testing agency:", agencyId);

  const assignees = await enquiryService.getEnquiryAssignees(agencyId);
  console.log("[SUCCESS] getEnquiryAssignees returned:", assignees.length, "assignees:");
  console.dir(assignees, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
