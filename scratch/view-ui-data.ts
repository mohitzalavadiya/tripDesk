import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const agency = await prisma.agency.findFirst({
    include: {
      bookings: {
        include: {
          invoices: true,
          customer: true,
          trip: true,
        },
      },
    },
  });

  if (!agency) {
    console.log("No agency found");
    return;
  }

  console.log("Agency:", agency.name, agency.id);
  console.log("Bookings count:", agency.bookings.length);
  agency.bookings.forEach((b) => {
    console.log({
      id: b.id,
      number: b.bookingNumber,
      status: b.status,
      customer: b.customer?.name,
      invoices: b.invoices.map((i) => ({ id: i.id, num: i.invoiceNumber, status: i.status })),
    });
  });
}

main().finally(() => prisma.$disconnect());
