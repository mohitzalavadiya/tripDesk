import fs from "fs";

let content = fs.readFileSync("scratch/build-complete-enquiry-service.js", "utf8");

const oldCreate = `  async createEnquiry(
    agencyId: string,
    data: CreateEnquiryInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryWithRelations> {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, agencyId, archivedAt: null },
    });

    if (!customer) {
      throw new Error("Customer not found.");
    }`;

const newCreate = `  async createEnquiry(
    agencyId: string,
    data: CreateEnquiryInput,
    actor?: { userId?: string; userName?: string; role?: string }
  ): Promise<EnquiryWithRelations> {
    if (data.status === EnquiryStatus.CONVERTED) {
      throw new ValidationError("New enquiries cannot be created with CONVERTED status. Conversion occurs only upon booking confirmation.");
    }
    if (data.status === EnquiryStatus.LOST || data.status === EnquiryStatus.CANCELLED) {
      throw new ValidationError("Initial enquiries must begin in an active stage (e.g., NEW, CONTACTED). Mark as LOST or CANCELLED only through explicit lifecycle progression.");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, agencyId, archivedAt: null },
    });

    if (!customer) {
      throw new NotFoundError("Customer not found or does not belong to this agency.");
    }`;

const oldConflict = `        if (updateResult.count === 0) {
          throw new ConflictError(
            "The selected follow-up was completed or modified concurrently by another user."
          );
        }`;

const newConflict = `        if (updateResult.count === 0) {
          throw new ConflictError("Follow-up task could not be completed. It may have already been completed or modified by another request.");
        }`;

if (!content.includes(oldCreate)) {
  console.error("oldCreate not found!");
  process.exit(1);
}
if (!content.includes(oldConflict)) {
  console.error("oldConflict not found!");
  process.exit(1);
}

content = content.replace(oldCreate, newCreate).replace(oldConflict, newConflict);
fs.writeFileSync("scratch/build-complete-enquiry-service.js", content, "utf8");
console.log("Updated Category 30 requirements in scratch/build-complete-enquiry-service.js successfully!");
