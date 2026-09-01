import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { TripStatus } from "@prisma/client";

async function main() {
  console.log("Setting up Browser QA fixture for Phase 21-E...");

  const pilotAgency = await prisma.agency.findFirst({
    where: { name: "TripDesk Pilot Agency" },
  });
  if (!pilotAgency) throw new Error("Pilot Agency not found");

  let customer = await prisma.customer.findFirst({
    where: { agencyId: pilotAgency.id, phone: "+919876543299" },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        agencyId: pilotAgency.id,
        customerNumber: "CUST-QA-21E",
        name: "Ananya Sharma",
        phone: "+919876543299",
        email: "ananya.sharma@example.com",
        city: "Bangalore",
      },
    });
  }

  // Check if existing test trip exists
  let trip = await prisma.trip.findFirst({
    where: { agencyId: pilotAgency.id, title: "Royal Rajasthan Heritage Tour (Completed QA)" },
  });

  if (!trip) {
    trip = await prisma.trip.create({
      data: {
        agencyId: pilotAgency.id,
        customerId: customer.id,
        tripNumber: "TRIP-QA-21E-01",
        title: "Royal Rajasthan Heritage Tour (Completed QA)",
        startDate: new Date("2026-08-10"),
        endDate: new Date("2026-08-18"),
        status: TripStatus.COMPLETED,
      },
    });
  }

  // Create active share link
  const tokenHash = "qa_token_phase21e_completed_review";
  let shareLink = await prisma.publicShareLink.findFirst({
    where: { tokenHash },
  });
  if (!shareLink) {
    shareLink = await prisma.publicShareLink.create({
      data: {
        agencyId: pilotAgency.id,
        tripId: trip.id,
        tokenHash,
        status: "ACTIVE",
      },
    });
  }

  // Delete any existing feedback for clean slate test
  await prisma.customerFeedback.deleteMany({
    where: { tripId: trip.id },
  });

  console.log("\nFixture Ready:");
  console.log("Portal URL: http://localhost:3001/trip/" + tokenHash);
  console.log("Trip Title:", trip.title);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
