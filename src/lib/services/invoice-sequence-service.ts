import "server-only";
import { Prisma } from "@prisma/client";

export const invoiceSequenceService = {
  /**
   * Concurrency-safe atomic generation of sequential invoice numbers per agency (INV-0001+)
   * Must be called inside a Prisma transaction client.
   */
  async getNextInvoiceNumber(agencyId: string, tx: Prisma.TransactionClient): Promise<string> {
    // Upsert and increment sequence atomically
    const sequence = await tx.invoiceSequence.upsert({
      where: { agencyId },
      create: {
        agencyId,
        lastNumber: 1,
      },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
      select: {
        lastNumber: true,
      },
    });

    const formattedNumber = `INV-${String(sequence.lastNumber).padStart(4, "0")}`;
    return formattedNumber;
  },
};
