import "dotenv/config";
import { prisma } from "../src/lib/prisma";

export async function backfillHotelCodes() {
  console.log("Starting safe Hotel Code backfill...");

  // Get all agencies
  const agencies = await prisma.agency.findMany({
    select: { id: true, name: true },
  });

  let totalUpdated = 0;

  for (const agency of agencies) {
    // Find all hotels for this agency without a hotelCode, ordered by createdAt asc
    const hotelsWithoutCode = await prisma.hotel.findMany({
      where: {
        agencyId: agency.id,
        hotelCode: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (hotelsWithoutCode.length === 0) {
      continue;
    }

    // Find the highest existing hotelCode number for this agency
    const existingHotelsWithCode = await prisma.hotel.findMany({
      where: {
        agencyId: agency.id,
        hotelCode: { not: null },
      },
      select: { hotelCode: true },
    });

    let maxNum = 0;
    for (const h of existingHotelsWithCode) {
      if (h.hotelCode) {
        const match = h.hotelCode.match(/^HTL-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    for (const hotel of hotelsWithoutCode) {
      maxNum++;
      const generatedCode = `HTL-${String(maxNum).padStart(4, "0")}`;
      await prisma.hotel.update({
        where: { id: hotel.id },
        data: { hotelCode: generatedCode },
      });
      totalUpdated++;
      console.log(`[Agency: ${agency.name}] Assigned ${generatedCode} to hotel "${hotel.name}" (ID: ${hotel.id})`);
    }
  }

  // Verification
  const remainingNull = await prisma.hotel.count({
    where: { hotelCode: null },
  });

  console.log(`Backfill completed. Total updated: ${totalUpdated}. Remaining null hotelCode: ${remainingNull}.`);
  return { totalUpdated, remainingNull };
}

if (require.main === module) {
  backfillHotelCodes()
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
