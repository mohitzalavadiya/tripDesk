import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";

async function runAudit() {
  console.log("=================================================");
  console.log("TRIPDESK INVOICE LEGACY DATA AUDIT");
  console.log("=================================================\n");

  // ─── AUDIT 1: INVOICE COUNTS ──────────────────────────────────
  const totalInvoices = await prisma.invoice.count();
  const invoicesByStatus = await prisma.invoice.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const withInvoiceNumber = await prisma.invoice.count({
    where: { invoiceNumber: { not: null } },
  });
  const withoutInvoiceNumber = await prisma.invoice.count({
    where: { invoiceNumber: null },
  });
  const withBookingId = await prisma.invoice.count({
    where: { bookingId: { not: "" } },
  });
  const withoutBookingId = await prisma.invoice.count({
    where: { bookingId: "" },
  });

  console.log("--- AUDIT 1: INVOICE COUNTS ---");
  console.log(`Total Invoice records: ${totalInvoices}`);
  console.log(`With invoiceNumber: ${withInvoiceNumber}`);
  console.log(`Without invoiceNumber (null): ${withoutInvoiceNumber}`);
  console.log(`With bookingId: ${withBookingId}`);
  console.log(`Without bookingId: ${withoutBookingId}`);
  console.log("Status Breakdown:");
  invoicesByStatus.forEach((s) => console.log(`  - ${s.status}: ${s._count.id}`));
  console.log("");

  // ─── AUDIT 2: INVOICES PER BOOKING ────────────────────────────
  const allBookings = await prisma.booking.findMany({
    select: {
      id: true,
      bookingNumber: true,
      agencyId: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      paymentStatus: true,
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          createdAt: true,
          cancelledAt: true,
          replacedByInvoiceId: true,
        },
      },
    },
  });

  const bookingsWithZeroInvoices = allBookings.filter((b) => b.invoices.length === 0);
  const bookingsWithOneInvoice = allBookings.filter((b) => b.invoices.length === 1);
  const bookingsWithMultipleInvoices = allBookings.filter((b) => b.invoices.length > 1);

  console.log("--- AUDIT 2: INVOICES PER BOOKING ---");
  console.log(`Total Bookings in DB: ${allBookings.length}`);
  console.log(`Bookings with 0 Invoices: ${bookingsWithZeroInvoices.length}`);
  console.log(`Bookings with 1 Invoice: ${bookingsWithOneInvoice.length}`);
  console.log(`Bookings with >1 Invoices: ${bookingsWithMultipleInvoices.length}`);
  if (bookingsWithMultipleInvoices.length > 0) {
    console.log("\nDetails of Bookings with >1 Invoices:");
    bookingsWithMultipleInvoices.forEach((b) => {
      console.log(`\nBooking ID: ${b.id} (#${b.bookingNumber}, Status: ${b.status}, Invoices: ${b.invoices.length})`);
      b.invoices.forEach((inv) => {
        console.log(
          `  - Invoice ID: ${inv.id}, Num: ${inv.invoiceNumber || "NULL"}, Status: ${inv.status}, Total: ₹${inv.totalAmount}, Created: ${inv.createdAt.toISOString()}, Cancelled: ${inv.cancelledAt ? inv.cancelledAt.toISOString() : "N/A"}, ReplacedBy: ${inv.replacedByInvoiceId || "N/A"}`
        );
      });
    });
  }
  console.log("");

  // ─── AUDIT 3: REPLACEMENT INVOICES ────────────────────────────
  const replacementInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { replacedByInvoiceId: { not: null } },
        { cancellationReason: { not: null } },
        { status: "CANCELLED" },
      ],
    },
    include: {
      booking: { select: { id: true, bookingNumber: true } },
    },
  });

  console.log("--- AUDIT 3: REPLACEMENT & CANCELLED INVOICES ---");
  console.log(`Total Cancelled / Replacement Records: ${replacementInvoices.length}`);
  const withReplacedById = replacementInvoices.filter((i) => i.replacedByInvoiceId !== null);
  console.log(`Invoices with replacedByInvoiceId set: ${withReplacedById.length}`);
  withReplacedById.forEach((i) => {
    console.log(
      `  - Inv: ${i.invoiceNumber || "DRAFT"} (${i.id}) on Booking ${i.booking?.bookingNumber} -> Replaced by: ${i.replacedByInvoiceId}`
    );
  });
  console.log("");

  // ─── AUDIT 4: PAYMENT RELATIONSHIPS ───────────────────────────
  const totalPayments = await prisma.payment.count();
  const paymentsWithBookingId = await prisma.payment.count({ where: { bookingId: { not: "" } } });
  const paymentsWithInvoiceId = await prisma.payment.count({ where: { invoiceId: { not: null } } });
  const paymentsWithBoth = await prisma.payment.count({
    where: { AND: [{ bookingId: { not: "" } }, { invoiceId: { not: null } }] },
  });
  const paymentsWithBookingOnly = await prisma.payment.count({
    where: { AND: [{ bookingId: { not: "" } }, { invoiceId: null }] },
  });
  const paymentsWithInvoiceOnly = await prisma.payment.count({
    where: { AND: [{ bookingId: "" }, { invoiceId: { not: null } }] },
  });

  console.log("--- AUDIT 4: PAYMENT RELATIONSHIPS ---");
  console.log(`Total Payments: ${totalPayments}`);
  console.log(`Payments with bookingId: ${paymentsWithBookingId}`);
  console.log(`Payments with invoiceId: ${paymentsWithInvoiceId}`);
  console.log(`Payments with BOTH bookingId AND invoiceId: ${paymentsWithBoth}`);
  console.log(`Payments with bookingId ONLY (invoiceId = NULL): ${paymentsWithBookingOnly}`);
  console.log(`Payments with invoiceId ONLY (bookingId NULL): ${paymentsWithInvoiceOnly}`);
  console.log("");

  // ─── AUDIT 5: FINANCIAL CONSISTENCY ───────────────────────────
  const bookingsWithInvoices = await prisma.booking.findMany({
    where: { invoices: { some: {} } },
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
      },
    },
  });

  let matchingFinancials = 0;
  let mismatchedFinancials = 0;
  const mismatchDetails: any[] = [];

  for (const b of bookingsWithInvoices) {
    if (b.invoices.length === 0) continue;
    const inv = b.invoices[0]; // active invoice
    const bTotal = Number(b.totalAmount);
    const iTotal = Number(inv.totalAmount);
    const bPaid = Number(b.paidAmount);
    const iPaid = Number(inv.paidAmount);
    const bBal = Number(b.balanceAmount);
    const iBal = Number(inv.balanceAmount);

    const isMatch = bTotal === iTotal && bPaid === iPaid && bBal === iBal;
    if (isMatch) {
      matchingFinancials++;
    } else {
      mismatchedFinancials++;
      mismatchDetails.push({
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        bTotal,
        iTotal,
        bPaid,
        iPaid,
        bBal,
        iBal,
        bookingPaymentStatus: b.paymentStatus,
        invoiceStatus: inv.status,
      });
    }
  }

  console.log("--- AUDIT 5: BOOKING VS INVOICE FINANCIAL CONSISTENCY ---");
  console.log(`Total Bookings with Active Invoice: ${bookingsWithInvoices.length}`);
  console.log(`Matching Financials (Total, Paid, Balance): ${matchingFinancials}`);
  console.log(`Mismatched Financials: ${mismatchedFinancials}`);
  if (mismatchDetails.length > 0) {
    console.log("\nSample Mismatches (up to 10):");
    mismatchDetails.slice(0, 10).forEach((m) => {
      console.log(`  - Booking #${m.bookingNumber} (${m.bookingId}) vs Inv ${m.invoiceNumber || "DRAFT"} (${m.invoiceId}):`);
      console.log(`    Total: Booking ₹${m.bTotal} vs Inv ₹${m.iTotal}`);
      console.log(`    Paid:  Booking ₹${m.bPaid} vs Inv ₹${m.iPaid}`);
      console.log(`    Bal:   Booking ₹${m.bBal} vs Inv ₹${m.iBal}`);
      console.log(`    Status: Booking ${m.bookingPaymentStatus} vs Inv ${m.invoiceStatus}`);
    });
  }
  console.log("");

  // ─── AUDIT 6: INVOICE / BOOKING STATUS COMBINATIONS ───────────
  const allInvoicesWithBooking = await prisma.invoice.findMany({
    include: {
      booking: {
        select: { status: true, bookingNumber: true },
      },
    },
  });

  const combinations: Record<string, number> = {};
  allInvoicesWithBooking.forEach((inv) => {
    const key = `Booking.${inv.booking.status} + Invoice.${inv.status}`;
    combinations[key] = (combinations[key] || 0) + 1;
  });

  console.log("--- AUDIT 6: STATUS COMBINATIONS ---");
  Object.entries(combinations).forEach(([k, v]) => console.log(`  - ${k}: ${v}`));
  console.log("");

  // ─── AUDIT 7: INVOICE NUMBER INTEGRITY ────────────────────────
  const issuedInvoices = await prisma.invoice.findMany({
    where: { invoiceNumber: { not: null } },
    select: { id: true, agencyId: true, invoiceNumber: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const agencyMap: Record<string, string[]> = {};
  issuedInvoices.forEach((inv) => {
    if (!agencyMap[inv.agencyId]) agencyMap[inv.agencyId] = [];
    agencyMap[inv.agencyId].push(inv.invoiceNumber!);
  });

  const sequences = await prisma.invoiceSequence.findMany();

  console.log("--- AUDIT 7: INVOICE NUMBER INTEGRITY ---");
  console.log(`Total Issued Invoices with Numbers: ${issuedInvoices.length}`);
  console.log(`Total Agencies with InvoiceSequences: ${sequences.length}`);
  sequences.forEach((seq) => {
    const agencyInvs = agencyMap[seq.agencyId] || [];
    console.log(`  - Agency ${seq.agencyId}: InvoiceSequence.lastNumber = ${seq.lastNumber}, Issued Invoices count = ${agencyInvs.length}`);
    if (agencyInvs.length > 0) {
      console.log(`    Numbers: [${agencyInvs.join(", ")}]`);
    }
  });

  // Check duplicates
  const allInvNums = issuedInvoices.map((i) => `${i.agencyId}:::${i.invoiceNumber}`);
  const duplicateNums = allInvNums.filter((item, index) => allInvNums.indexOf(item) !== index);
  console.log(`Duplicate invoice numbers within same agency: ${duplicateNums.length}`);
  console.log("");

  // ─── AUDIT 8: MULTI-TENANT CONSISTENCY ────────────────────────
  let invoiceAgencyMismatchCount = 0;
  for (const inv of allInvoicesWithBooking) {
    const fullInv = await prisma.invoice.findUnique({
      where: { id: inv.id },
      select: { agencyId: true, booking: { select: { agencyId: true } } },
    });
    if (fullInv && fullInv.agencyId !== fullInv.booking.agencyId) {
      invoiceAgencyMismatchCount++;
    }
  }

  let paymentAgencyMismatchCount = 0;
  const allPayments = await prisma.payment.findMany({
    select: {
      id: true,
      agencyId: true,
      booking: { select: { agencyId: true } },
      invoice: { select: { agencyId: true } },
    },
  });

  for (const p of allPayments) {
    if (p.booking && p.agencyId !== p.booking.agencyId) {
      paymentAgencyMismatchCount++;
    }
    if (p.invoice && p.agencyId !== p.invoice.agencyId) {
      paymentAgencyMismatchCount++;
    }
  }

  console.log("--- AUDIT 8: MULTI-TENANT CONSISTENCY ---");
  console.log(`Invoice-Booking agency mismatches: ${invoiceAgencyMismatchCount}`);
  console.log(`Payment-Booking/Invoice agency mismatches: ${paymentAgencyMismatchCount}`);
  console.log("");

  // ─── AUDIT 9: LEGACY SNAPSHOT & ITEM DATA ─────────────────────
  const totalItems = await prisma.invoiceItem.count();
  const withCustomerSnapshot = await prisma.invoice.count({ where: { customerSnapshot: { not: Prisma.JsonNull } } });
  const withBookingSnapshot = await prisma.invoice.count({ where: { bookingSnapshot: { not: Prisma.JsonNull } } });
  const withAgencySnapshot = await prisma.invoice.count({ where: { agencySnapshot: { not: Prisma.JsonNull } } });

  console.log("--- AUDIT 9: LEGACY SNAPSHOT & ITEM USAGE ---");
  console.log(`Total InvoiceItem records: ${totalItems}`);
  console.log(`Invoices with customerSnapshot: ${withCustomerSnapshot} / ${totalInvoices}`);
  console.log(`Invoices with bookingSnapshot: ${withBookingSnapshot} / ${totalInvoices}`);
  console.log(`Invoices with agencySnapshot: ${withAgencySnapshot} / ${totalInvoices}`);
  console.log("");
}

runAudit()
  .catch((e) => {
    console.error("Audit error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
