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
    bookingDate?: Date | null;
    notes?: string | null;
    customer?: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postalCode?: string | null;
    } | null;
    trip?: {
      id: string;
      title: string;
      tripNumber: string;
      startDate: Date | null;
      endDate: Date | null;
      travelers?: Array<{ id: string; name: string; type: string }>;
    } | null;
    quotation?: {
      id: string;
      quotationNumber: string;
      title?: string | null;
      items?: Array<{
        id: string;
        name: string;
        description?: string | null;
        quantity: number;
        sellingPrice?: Prisma.Decimal | null;
        unitPrice?: Prisma.Decimal | null;
        totalPrice?: Prisma.Decimal | null;
        sortOrder: number;
      }>;
    } | null;
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

export function calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  isCancelled: boolean = false
): InvoiceStatus {
  if (isCancelled) return InvoiceStatus.CANCELLED;
  if (paidAmount >= totalAmount && totalAmount > 0) return InvoiceStatus.PAID;
  if (paidAmount > 0) return InvoiceStatus.PARTIALLY_PAID;
  return InvoiceStatus.ISSUED;
}

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
   * Get or Create a Persistent Invoice for a Confirmed Booking (Decision #18).
   * - First call creates the persistent Invoice with sequential INV-XXXX number.
   * - Later calls reuse the existing Invoice, refreshing latest Booking financial and payment data.
   * - Never creates a DRAFT; directly creates ISSUED, PARTIALLY_PAID, or PAID.
   */
  async getOrCreateInvoiceForBooking(agencyId: string, bookingId: string): Promise<InvoiceWithDetails> {
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
        agency: {
          include: {
            taxProfile: true,
          },
        },
        payments: {
          where: { archivedAt: null, status: PaymentStatus.COMPLETED },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found or does not belong to this agency.");
    }

    const eligibleStatuses: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.ONGOING,
      BookingStatus.COMPLETED,
    ];

    if (!eligibleStatuses.includes(booking.status)) {
      throw new Error(`Invoices can only be created for CONFIRMED, ONGOING, or COMPLETED bookings. Current status is ${booking.status}.`);
    }

    // Calculate authoritative payment totals from booking's completed payments
    let netPaid = 0;
    for (const p of booking.payments) {
      const net = Number(p.amount) - Number(p.refundedAmount || 0);
      netPaid += Math.max(0, net);
    }
    netPaid = Math.round(netPaid * 100) / 100;
    const totalAmount = Number(booking.totalAmount);
    const balanceAmount = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);
    const invoiceStatus = calculateInvoiceStatus(totalAmount, netPaid, false);

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Check for existing invoice for this booking (using composite unique selector)
          const existingActive = await tx.invoice.findUnique({
            where: {
              agencyId_bookingId: {
                agencyId,
                bookingId,
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
                  taxableAmount: true,
                  taxAmount: true,
                  taxRate: true,
                  taxMode: true,
                  gstTreatment: true,
                  cgstAmount: true,
                  sgstAmount: true,
                  igstAmount: true,
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
            // If existing active invoice was missing invoiceNumber (e.g. legacy draft), allocate number
            let invoiceNumber = existingActive.invoiceNumber;
            if (!invoiceNumber) {
              invoiceNumber = await invoiceSequenceService.getNextInvoiceNumber(agencyId, tx);
            }

            // Synchronize latest Booking financial state, tax snapshot & payment state onto existing Invoice
            const updated = await tx.invoice.update({
              where: { id: existingActive.id },
              data: {
                invoiceNumber,
                totalAmount: new Prisma.Decimal(totalAmount),
                paidAmount: new Prisma.Decimal(netPaid),
                balanceAmount: new Prisma.Decimal(balanceAmount),
                taxableAmount: booking.taxableAmount !== null ? new Prisma.Decimal(booking.taxableAmount) : null,
                taxAmount: booking.taxAmount !== null ? new Prisma.Decimal(booking.taxAmount) : null,
                taxRate: booking.taxRate !== null ? new Prisma.Decimal(booking.taxRate) : null,
                taxMode: booking.taxMode ?? null,
                gstTreatment: booking.gstTreatment ?? null,
                cgstAmount: booking.cgstAmount !== null ? new Prisma.Decimal(booking.cgstAmount) : null,
                sgstAmount: booking.sgstAmount !== null ? new Prisma.Decimal(booking.sgstAmount) : null,
                igstAmount: booking.igstAmount !== null ? new Prisma.Decimal(booking.igstAmount) : null,
                status: invoiceStatus,
                currency: booking.currency || "INR",
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
                    taxableAmount: true,
                    taxAmount: true,
                    taxRate: true,
                    taxMode: true,
                    gstTreatment: true,
                    cgstAmount: true,
                    sgstAmount: true,
                    igstAmount: true,
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

            // Reconcile/link any payments of this booking that had invoiceId = null
            await tx.payment.updateMany({
              where: {
                bookingId: booking.id,
                invoiceId: null,
                archivedAt: null,
              },
              data: {
                invoiceId: updated.id,
              },
            });

            return updated;
          }

          // If no active invoice exists: create persistent invoice
          const invoiceNumber = await invoiceSequenceService.getNextInvoiceNumber(agencyId, tx);

          // Build snapshots for compatibility
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

          const taxProfile = (booking.agency as any)?.taxProfile || null;
          const agencySnapshot = booking.agency
            ? {
                id: booking.agency.id,
                name: booking.agency.name,
                email: booking.agency.email,
                phone: booking.agency.phone,
                address: booking.agency.address,
                logo: booking.agency.logo,
                gstin: taxProfile?.isGstRegistered ? taxProfile.gstin : null,
                legalName: taxProfile?.legalBusinessName || booking.agency.name || null,
                registeredAddress: taxProfile?.registeredAddress || null,
                state: taxProfile?.state || null,
                stateCode: taxProfile?.stateCode || null,
                isGstRegistered: Boolean(taxProfile?.isGstRegistered),
                taxProfile: taxProfile
                  ? {
                      isGstRegistered: Boolean(taxProfile.isGstRegistered),
                      gstin: taxProfile.gstin,
                      legalName: taxProfile.legalBusinessName || booking.agency.name,
                      registeredAddress: taxProfile.registeredAddress,
                      state: taxProfile.state,
                      stateCode: taxProfile.stateCode,
                    }
                  : null,
              }
            : null;

          // Raw items from quotation or booking
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

          const { subtotal, discountAmount, items } = invoiceService.calculateFinancials(
            rawItems,
            null,
            null,
            netPaid
          );

          const now = new Date();
          let defaultDueDate = new Date(now);
          defaultDueDate.setDate(defaultDueDate.getDate() + 7);

          const created = await tx.invoice.create({
            data: {
              agencyId,
              bookingId,
              invoiceNumber,
              status: invoiceStatus,
              invoiceDate: now,
              dueDate: defaultDueDate,
              currency: booking.currency || "INR",
              subtotal: new Prisma.Decimal(subtotal || totalAmount),
              discountType: null,
              discountValue: null,
              discountAmount: new Prisma.Decimal(discountAmount || 0),
              taxableAmount: booking.taxableAmount !== null ? new Prisma.Decimal(booking.taxableAmount) : null,
              taxAmount: booking.taxAmount !== null ? new Prisma.Decimal(booking.taxAmount) : null,
              taxRate: booking.taxRate !== null ? new Prisma.Decimal(booking.taxRate) : null,
              taxMode: booking.taxMode ?? null,
              gstTreatment: booking.gstTreatment ?? null,
              cgstAmount: booking.cgstAmount !== null ? new Prisma.Decimal(booking.cgstAmount) : null,
              sgstAmount: booking.sgstAmount !== null ? new Prisma.Decimal(booking.sgstAmount) : null,
              igstAmount: booking.igstAmount !== null ? new Prisma.Decimal(booking.igstAmount) : null,
              totalAmount: new Prisma.Decimal(totalAmount),
              paidAmount: new Prisma.Decimal(netPaid),
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
                  bookingDate: true,
                  travelStartDate: true,
                  travelEndDate: true,
                  currency: true,
                  totalAmount: true,
                  paidAmount: true,
                  balanceAmount: true,
                  taxableAmount: true,
                  taxAmount: true,
                  taxRate: true,
                  taxMode: true,
                  gstTreatment: true,
                  cgstAmount: true,
                  sgstAmount: true,
                  igstAmount: true,
                  notes: true,
                  customer: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      email: true,
                      address: true,
                      city: true,
                      state: true,
                      country: true,
                      postalCode: true,
                    },
                  },
                  trip: {
                    select: {
                      id: true,
                      title: true,
                      tripNumber: true,
                      startDate: true,
                      endDate: true,
                      travelers: {
                        select: {
                          id: true,
                          name: true,
                          type: true,
                        },
                      },
                    },
                  },
                  quotation: {
                    select: {
                      id: true,
                      quotationNumber: true,
                      title: true,
                      items: {
                        where: { isOptional: false },
                        orderBy: { sortOrder: "asc" },
                        select: {
                          id: true,
                          name: true,
                          description: true,
                          quantity: true,
                          sellingPrice: true,
                          unitPrice: true,
                          totalPrice: true,
                          sortOrder: true,
                        },
                      },
                    },
                  },
                },
              },
              agency: {
                select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
              },
            },
          });

          // Link any existing payments for this booking to this persistent invoice
          await tx.payment.updateMany({
            where: {
              bookingId: booking.id,
              invoiceId: null,
              archivedAt: null,
            },
            data: {
              invoiceId: created.id,
            },
          });

          return created;
        },
        { timeout: 15000, maxWait: 10000 }
      );

      return result as InvoiceWithDetails;
    } catch (error) {
      // Handle P2002 Unique Constraint Violation under high concurrency races
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Fetch the invoice created by the winning concurrent transaction
        const existingInvoice = await prisma.invoice.findUnique({
          where: {
            agencyId_bookingId: {
              agencyId,
              bookingId,
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
                bookingDate: true,
                travelStartDate: true,
                travelEndDate: true,
                currency: true,
                totalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                notes: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    address: true,
                    city: true,
                    state: true,
                    country: true,
                    postalCode: true,
                  },
                },
                trip: {
                  select: {
                    id: true,
                    title: true,
                    tripNumber: true,
                    startDate: true,
                    endDate: true,
                    travelers: {
                      select: {
                        id: true,
                        name: true,
                        type: true,
                      },
                    },
                  },
                },
                quotation: {
                  select: {
                    id: true,
                    quotationNumber: true,
                    title: true,
                    items: {
                      where: { isOptional: false },
                      orderBy: { sortOrder: "asc" },
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        quantity: true,
                        sellingPrice: true,
                        unitPrice: true,
                        totalPrice: true,
                        sortOrder: true,
                      },
                    },
                  },
                },
              },
            },
            agency: {
              select: { id: true, name: true, email: true, phone: true, address: true, logo: true },
            },
          },
        });

        if (existingInvoice) {
          return existingInvoice as InvoiceWithDetails;
        }
      }

      throw error;
    }
  },

  /**
   * Backward-compatible alias for creating/getting persistent invoice
   */
  async createDraftInvoice(agencyId: string, bookingId: string): Promise<InvoiceWithDetails> {
    return this.getOrCreateInvoiceForBooking(agencyId, bookingId);
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
            bookingDate: true,
            travelStartDate: true,
            travelEndDate: true,
            currency: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            taxableAmount: true,
            taxAmount: true,
            taxRate: true,
            taxMode: true,
            gstTreatment: true,
            cgstAmount: true,
            sgstAmount: true,
            igstAmount: true,
            notes: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                city: true,
                state: true,
                country: true,
                postalCode: true,
              },
            },
            trip: {
              select: {
                id: true,
                title: true,
                tripNumber: true,
                startDate: true,
                endDate: true,
                travelers: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            quotation: {
              select: {
                id: true,
                quotationNumber: true,
                title: true,
                items: {
                  where: { isOptional: false },
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    quantity: true,
                    sellingPrice: true,
                    unitPrice: true,
                    totalPrice: true,
                    sortOrder: true,
                  },
                },
              },
            },
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
   * Legacy path: Under Decision #18 & DB Uniqueness (@@unique([agencyId, bookingId])),
   * replacement invoice rows are discontinued. One Booking retains one persistent invoice record.
   */
  async createReplacementInvoice(
    agencyId: string,
    cancelledInvoiceId: string
  ): Promise<InvoiceWithDetails> {
    const cancelled = await prisma.invoice.findFirst({
      where: { id: cancelledInvoiceId, agencyId, archivedAt: null },
    });

    if (!cancelled) {
      throw new Error("Cancelled invoice not found.");
    }

    throw new Error(
      "Replacement invoices are discontinued under Decision #18. One Booking retains one persistent invoice record."
    );
  },
};
