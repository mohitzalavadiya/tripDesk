import "server-only";
import { prisma } from "@/lib/prisma";
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  DiscountType,
  BookingStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { invoiceSequenceService } from "./invoice-sequence-service";
import {
  UpdateDraftInvoiceInput,
  IssueInvoiceInput,
  InvoiceQueryInput,
} from "@/lib/validation/invoice-schema";

export type InvoiceWithDetails = Invoice & {
  items: InvoiceItem[];
  payments: any[];
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    balanceAmount: Prisma.Decimal;
    currency: string;
    travelStartDate: Date | null;
    travelEndDate: Date | null;
  };
  agency?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string | null;
    logo: string | null;
  } | null;
  isOverdue?: boolean;
};

export const invoiceService = {
  /**
   * Helper to recalculate financial amounts accurately
   */
  calculateFinancials(
    items: { description: string; quantity: number; rate: number }[],
    discountType?: DiscountType | null,
    discountValue?: number | null,
    currentPaid: number = 0
  ) {
    let subtotal = 0;
    const computedItems = items.map((item, idx) => {
      const amount = Math.round(item.quantity * item.rate * 100) / 100;
      subtotal += amount;
      return {
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount,
        sortOrder: idx,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    let discountAmount = 0;
    if (discountType === DiscountType.FIXED && discountValue && discountValue > 0) {
      discountAmount = Math.min(subtotal, Math.round(discountValue * 100) / 100);
    } else if (discountType === DiscountType.PERCENTAGE && discountValue && discountValue > 0) {
      discountAmount = Math.min(subtotal, Math.round(((subtotal * discountValue) / 100) * 100) / 100);
    }

    const totalAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
    const paidAmount = Math.round(currentPaid * 100) / 100;
    const balanceAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);

    return {
      subtotal,
      discountAmount,
      totalAmount,
      paidAmount,
      balanceAmount,
      items: computedItems,
    };
  },

  /**
   * Create a new Draft Invoice from a Confirmed Booking.
   * If an active Draft already exists for this Booking, returns the existing Draft.
   */
  async createDraftInvoice(agencyId: string, bookingId: string): Promise<InvoiceWithDetails> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        customer: true,
        trip: true,
        quotation: {
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        agency: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found or does not belong to this agency.");
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new Error(`Invoices can only be created for CONFIRMED bookings. Current status is ${booking.status}.`);
    }

    // Check for existing active (non-cancelled) invoice
    const existingActive = await prisma.invoice.findFirst({
      where: {
        agencyId,
        bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            currency: true,
            travelStartDate: true,
            travelEndDate: true,
          },
        },
        agency: {
          select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
        },
      },
    });

    if (existingActive) {
      if (existingActive.status === InvoiceStatus.DRAFT) {
        return existingActive as InvoiceWithDetails;
      }
      throw new Error(`An active ${existingActive.status} invoice (${existingActive.invoiceNumber || "existing"}) already exists for this booking.`);
    }

    // Build snapshots
    const customerSnapshot = booking.customer
      ? {
          id: booking.customer.id,
          name: booking.customer.name,
          phone: booking.customer.phone,
          email: booking.customer.email,
          address: booking.customer.address,
          city: booking.customer.city,
          state: booking.customer.state,
          country: booking.customer.country,
          postalCode: booking.customer.postalCode,
        }
      : null;

    const bookingSnapshot = {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      tripId: booking.tripId,
      tripTitle: booking.trip?.title,
      travelStartDate: booking.travelStartDate,
      travelEndDate: booking.travelEndDate,
      currency: booking.currency || "INR",
    };

    const agencySnapshot = booking.agency
      ? {
          id: booking.agency.id,
          name: booking.agency.name,
          email: booking.agency.email,
          phone: booking.agency.phone,
          address: booking.agency.address,
        }
      : null;

    // Seed line items from quotation if available, otherwise from booking total
    let rawItems: { description: string; quantity: number; rate: number }[] = [];
    if (booking.quotation?.items && booking.quotation.items.length > 0) {
      rawItems = booking.quotation.items.map((qi) => ({
        description: qi.name || qi.description || "Package Item",
        quantity: qi.quantity || 1,
        rate: Number(qi.sellingPrice || qi.unitPrice || 0),
      }));
    } else {
      rawItems = [
        {
          description: `Package Booking - ${booking.bookingNumber}`,
          quantity: 1,
          rate: Number(booking.totalAmount),
        },
      ];
    }

    const { subtotal, discountAmount, totalAmount, paidAmount, balanceAmount, items } =
      this.calculateFinancials(rawItems, null, null, 0);

    // Default due date: today or travelStartDate if in future
    const now = new Date();
    let defaultDueDate = new Date(now);
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);

    const created = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          agencyId,
          bookingId,
          status: InvoiceStatus.DRAFT,
          invoiceDate: now,
          dueDate: defaultDueDate,
          currency: booking.currency || "INR",
          subtotal: new Prisma.Decimal(subtotal),
          discountType: null,
          discountValue: null,
          discountAmount: new Prisma.Decimal(discountAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          balanceAmount: new Prisma.Decimal(balanceAmount),
          customerSnapshot: customerSnapshot ? JSON.parse(JSON.stringify(customerSnapshot)) : undefined,
          bookingSnapshot: JSON.parse(JSON.stringify(bookingSnapshot)),
          agencySnapshot: agencySnapshot ? JSON.parse(JSON.stringify(agencySnapshot)) : undefined,
          items: {
            create: items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              rate: new Prisma.Decimal(it.rate),
              amount: new Prisma.Decimal(it.amount),
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              currency: true,
              travelStartDate: true,
              travelEndDate: true,
            },
          },
          agency: {
            select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
          },
        },
      });

      return inv;
    });

    return created as InvoiceWithDetails;
  },

  /**
   * Get full details of a single invoice
   */
  async getInvoice(agencyId: string, invoiceId: string): Promise<InvoiceWithDetails | null> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, agencyId, archivedAt: null },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            currency: true,
            travelStartDate: true,
            travelEndDate: true,
          },
        },
        agency: {
          select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
        },
      },
    });

    if (!invoice) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const isOverdue =
      Number(invoice.balanceAmount) > 0 &&
      today > dueDate &&
      invoice.status !== InvoiceStatus.PAID &&
      invoice.status !== InvoiceStatus.CANCELLED &&
      invoice.status !== InvoiceStatus.DRAFT;

    return {
      ...(invoice as InvoiceWithDetails),
      isOverdue,
    };
  },

  /**
   * List invoices with server-side pagination, search, and filtering
   */
  async listInvoices(
    agencyId: string,
    query: Partial<InvoiceQueryInput> = {}
  ): Promise<{
    data: (InvoiceWithDetails & { customerName?: string; bookingNumber?: string })[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      paymentState,
      overdue,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where: Prisma.InvoiceWhereInput = {
      agencyId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(startDate ? { invoiceDate: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { invoiceDate: { lte: new Date(endDate) } } : {}),
    };

    if (paymentState === "UNPAID") {
      where.status = InvoiceStatus.ISSUED;
    } else if (paymentState === "PARTIALLY_PAID") {
      where.status = InvoiceStatus.PARTIALLY_PAID;
    } else if (paymentState === "PAID") {
      where.status = InvoiceStatus.PAID;
    }

    if (overdue === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.status = { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] };
      where.dueDate = { lt: today };
      where.balanceAmount = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { booking: { bookingNumber: { contains: search, mode: "insensitive" } } },
        { booking: { customer: { name: { contains: search, mode: "insensitive" } } } },
        { booking: { customer: { phone: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: {
            where: { archivedAt: null },
            select: { id: true, amount: true, status: true, paymentDate: true },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              currency: true,
              travelStartDate: true,
              travelEndDate: true,
              customer: {
                select: { id: true, name: true, phone: true, email: true },
              },
            },
          },
          agency: {
            select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
          },
        },
      }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formattedData = data.map((inv) => {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const isOverdue =
        Number(inv.balanceAmount) > 0 &&
        today > due &&
        inv.status !== InvoiceStatus.PAID &&
        inv.status !== InvoiceStatus.CANCELLED &&
        inv.status !== InvoiceStatus.DRAFT;

      const customerSnapshot = inv.customerSnapshot as any;
      const customerName =
        customerSnapshot?.name || inv.booking?.customer?.name || "Unknown Customer";

      return {
        ...(inv as any),
        customerName,
        bookingNumber: inv.booking?.bookingNumber,
        isOverdue,
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get operational invoice summary totals for dashboard/list metrics
   */
  async getInvoiceSummary(agencyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allInvoices, overdueCount] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          agencyId,
          archivedAt: null,
          status: { not: InvoiceStatus.CANCELLED },
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
      prisma.invoice.count({
        where: {
          agencyId,
          archivedAt: null,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
          dueDate: { lt: today },
          balanceAmount: { gt: 0 },
        },
      }),
    ]);

    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const inv of allInvoices) {
      totalBilled += Number(inv.totalAmount || 0);
      totalPaid += Number(inv.paidAmount || 0);
      totalOutstanding += Number(inv.balanceAmount || 0);
    }

    return {
      totalInvoices: allInvoices.length,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: overdueCount,
    };
  },

  /**
   * Update Draft Invoice details and line items (Server-Authoritative)
   */
  async updateDraftInvoice(
    agencyId: string,
    invoiceId: string,
    input: UpdateDraftInvoiceInput
  ): Promise<InvoiceWithDetails> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, agencyId, archivedAt: null },
      include: { items: true, payments: true },
    });

    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error(`Only DRAFT invoices can be edited. This invoice is ${invoice.status} and immutable.`);
    }

    const rawItems = input.items
      ? input.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          rate: i.rate,
        }))
      : invoice.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          rate: Number(i.rate),
        }));

    const discountType = input.discountType !== undefined ? input.discountType : invoice.discountType;
    const discountValue = input.discountValue !== undefined ? input.discountValue : Number(invoice.discountValue || 0);

    const { subtotal, discountAmount, totalAmount, paidAmount, balanceAmount, items } =
      this.calculateFinancials(rawItems, discountType, discountValue, Number(invoice.paidAmount));

    const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : invoice.invoiceDate;
    const dueDate = input.dueDate ? new Date(input.dueDate) : invoice.dueDate;

    if (dueDate < invoiceDate) {
      throw new Error("Due Date must be on or after the Invoice Date.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Re-create items if modified
      if (input.items) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId },
        });

        await tx.invoiceItem.createMany({
          data: items.map((it) => ({
            invoiceId,
            description: it.description,
            quantity: it.quantity,
            rate: new Prisma.Decimal(it.rate),
            amount: new Prisma.Decimal(it.amount),
            sortOrder: it.sortOrder,
          })),
        });
      }

      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceDate,
          dueDate,
          subtotal: new Prisma.Decimal(subtotal),
          discountType: discountType || null,
          discountValue: discountValue ? new Prisma.Decimal(discountValue) : null,
          discountAmount: new Prisma.Decimal(discountAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          balanceAmount: new Prisma.Decimal(balanceAmount),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.paymentInstructions !== undefined ? { paymentInstructions: input.paymentInstructions } : {}),
          ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              currency: true,
              travelStartDate: true,
              travelEndDate: true,
            },
          },
          agency: {
            select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
          },
        },
      });

      return inv;
    });

    return updated as InvoiceWithDetails;
  },

  /**
   * Concurrency-safe, atomic Invoice Issuance.
   * Generates sequential INV-XXXX number and locks the invoice into immutable state.
   */
  async issueInvoice(
    agencyId: string,
    invoiceId: string,
    userId: string,
    input?: IssueInvoiceInput
  ): Promise<InvoiceWithDetails> {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, agencyId, archivedAt: null },
        include: { items: true, payments: { where: { archivedAt: null, status: { not: PaymentStatus.VOIDED } } } },
      });

      if (!invoice) {
        throw new Error("Invoice not found.");
      }

      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new Error(`Only DRAFT invoices can be issued. Current status is ${invoice.status}.`);
      }

      if (!invoice.items || invoice.items.length === 0) {
        throw new Error("Invoice must have at least one line item before issuance.");
      }

      for (const item of invoice.items) {
        if (item.quantity <= 0) {
          throw new Error(`Line item "${item.description}" has invalid quantity (${item.quantity}). Quantity must be > 0.`);
        }
        if (Number(item.rate) < 0) {
          throw new Error(`Line item "${item.description}" has negative rate. Rate cannot be negative.`);
        }
      }

      const dueDate = input?.dueDate ? new Date(input.dueDate) : invoice.dueDate;
      if (dueDate < invoice.invoiceDate) {
        throw new Error("Due Date must be on or after the Invoice Date.");
      }

      // Generate next sequential number atomically
      const invoiceNumber = await invoiceSequenceService.getNextInvoiceNumber(agencyId, tx);

      // Recalculate status based on active payments
      const activePaymentsTotal = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(invoice.totalAmount);
      const balanceAmount = Math.max(0, Math.round((totalAmount - activePaymentsTotal) * 100) / 100);

      let newStatus: InvoiceStatus = InvoiceStatus.ISSUED;
      if (balanceAmount === 0 && totalAmount > 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (activePaymentsTotal > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      const issued = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber,
          status: newStatus,
          dueDate,
          paidAmount: new Prisma.Decimal(activePaymentsTotal),
          balanceAmount: new Prisma.Decimal(balanceAmount),
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              currency: true,
              travelStartDate: true,
              travelEndDate: true,
            },
          },
          agency: {
            select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
          },
        },
      });

      return issued;
    });

    return result as InvoiceWithDetails;
  },

  /**
   * Delete Draft Invoice. Non-draft invoices cannot be deleted.
   */
  async deleteDraftInvoice(agencyId: string, invoiceId: string): Promise<{ success: boolean }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, agencyId, archivedAt: null },
    });

    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error(`Cannot delete an issued invoice (${invoice.status}). Issued invoices must be cancelled instead.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId },
      });
      await tx.invoice.delete({
        where: { id: invoiceId },
      });
    });

    return { success: true };
  },

  /**
   * Cancel an ISSUED or PARTIALLY_PAID Invoice. PAID invoices cannot be cancelled.
   */
  async cancelInvoice(
    agencyId: string,
    invoiceId: string,
    userId: string,
    reason: string
  ): Promise<InvoiceWithDetails> {
    if (!reason || reason.trim().length < 3) {
      throw new Error("A valid cancellation reason (minimum 3 characters) is required.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, agencyId, archivedAt: null },
      });

      if (!invoice) {
        throw new Error("Invoice not found.");
      }

      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new Error("Draft invoices must be deleted rather than cancelled.");
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error("Fully PAID invoices cannot be cancelled. If a refund is needed, handle via manual refund adjustments.");
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error("Invoice is already cancelled.");
      }

      const cancelled = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: reason.trim(),
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              currency: true,
              travelStartDate: true,
              travelEndDate: true,
            },
          },
          agency: {
            select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
          },
        },
      });

      return cancelled;
    });

    return result as InvoiceWithDetails;
  },

  /**
   * Create a Replacement Draft Invoice for a CANCELLED Invoice.
   */
  async createReplacementInvoice(
    agencyId: string,
    cancelledInvoiceId: string
  ): Promise<InvoiceWithDetails> {
    const cancelled = await prisma.invoice.findFirst({
      where: { id: cancelledInvoiceId, agencyId, archivedAt: null },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    if (!cancelled) {
      throw new Error("Cancelled invoice not found.");
    }

    if (cancelled.status !== InvoiceStatus.CANCELLED) {
      throw new Error("Replacement invoices can only be created for CANCELLED invoices.");
    }

    // Check that no other active invoice exists for this booking
    const existingActive = await prisma.invoice.findFirst({
      where: {
        agencyId,
        bookingId: cancelled.bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
    });

    if (existingActive) {
      throw new Error("An active invoice already exists for this booking. Cannot create replacement.");
    }

    const now = new Date();
    const defaultDueDate = new Date(now);
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);

    const replacement = await prisma.$transaction(async (tx) => {
      const newDraft = await tx.invoice.create({
        data: {
          agencyId,
          bookingId: cancelled.bookingId,
          status: InvoiceStatus.DRAFT,
          invoiceDate: now,
          dueDate: defaultDueDate,
          currency: cancelled.currency,
          subtotal: cancelled.subtotal,
          discountType: cancelled.discountType,
          discountValue: cancelled.discountValue,
          discountAmount: cancelled.discountAmount,
          totalAmount: cancelled.totalAmount,
          paidAmount: new Prisma.Decimal(0),
          balanceAmount: cancelled.totalAmount,
          customerSnapshot: cancelled.customerSnapshot ? JSON.parse(JSON.stringify(cancelled.customerSnapshot)) : undefined,
          bookingSnapshot: cancelled.bookingSnapshot ? JSON.parse(JSON.stringify(cancelled.bookingSnapshot)) : undefined,
          agencySnapshot: cancelled.agencySnapshot ? JSON.parse(JSON.stringify(cancelled.agencySnapshot)) : undefined,
          notes: cancelled.notes,
          paymentInstructions: cancelled.paymentInstructions,
          internalNotes: cancelled.internalNotes,
          items: {
            create: cancelled.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              rate: it.rate,
              amount: it.amount,
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              currency: true,
              travelStartDate: true,
              travelEndDate: true,
            },
          },
          agency: {
            select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
          },
        },
      });

      // Link replacement reference on cancelled invoice
      await tx.invoice.update({
        where: { id: cancelledInvoiceId },
        data: { replacedByInvoiceId: newDraft.id },
      });

      return newDraft;
    });

    return replacement as InvoiceWithDetails;
  },
};
