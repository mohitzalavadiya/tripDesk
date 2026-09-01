import "server-only";

import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api";
import {
  TravelDocument,
  TravelDocumentType,
  TravelDocumentStatus,
  NotificationChannel,
  CustomerNotificationType,
  Prisma,
} from "@prisma/client";
import {
  ListDocumentsInput,
  GenerateBookingDocumentsInput,
  GenerateSingleDocumentInput,
  IssueDocumentInput,
  RevokeDocumentInput,
  ResendDocumentInput,
} from "@/lib/validation/document-schema";
import { documentPdfService } from "./document-pdf-service";
import { communicationService } from "./communication-service";

export interface DocumentListItemView {
  id: string;
  documentNumber: string;
  documentType: TravelDocumentType;
  status: TravelDocumentStatus;
  title: string;
  version: number;
  isLatest: boolean;
  supersedesDocumentId?: string | null;
  bookingId?: string | null;
  bookingNumber?: string | null;
  tripId?: string | null;
  tripNumber?: string | null;
  tripTitle?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  issuedAt?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  generatedAt: string;
  createdAt: string;
}

export class TravelDocumentService {
  /**
   * Generates a sequential document number scoped per agency and document type:
   * e.g. HV-2026-00001, VV-2026-00001, AV-2026-00001, BC-2026-00001, RC-2026-00001
   */
  async generateNextDocumentNumber(
    agencyId: string,
    type: TravelDocumentType
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefixMap: Record<TravelDocumentType, string> = {
      HOTEL_VOUCHER: "HV",
      VEHICLE_VOUCHER: "VV",
      ACTIVITY_VOUCHER: "AV",
      BOOKING_CONFIRMATION: "BC",
      CUSTOMER_ITINERARY: "IT",
      PAYMENT_RECEIPT: "RC",
      SUPPLIER_VOUCHER: "SV",
      TRAVEL_SUMMARY: "TS",
    };

    const prefix = `${prefixMap[type] || "DOC"}-${year}-`;

    const lastDoc = await prisma.travelDocument.findFirst({
      where: {
        agencyId,
        documentNumber: { startsWith: prefix },
      },
      orderBy: { documentNumber: "desc" },
      select: { documentNumber: true },
    });

    let nextNumber = 1;
    if (lastDoc?.documentNumber) {
      const parts = lastDoc.documentNumber.split("-");
      if (parts.length >= 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * 1. Lists documents for the agency with filters, search, and pagination.
   */
  async listDocuments(
    agencyId: string,
    params: ListDocumentsInput
  ): Promise<{
    data: DocumentListItemView[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TravelDocumentWhereInput = {
      agencyId,
      ...(params.type ? { documentType: params.type } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.bookingId ? { bookingId: params.bookingId } : {}),
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.paymentId ? { paymentId: params.paymentId } : {}),
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      ...(params.isLatest !== undefined ? { isLatest: params.isLatest } : {}),
      ...(params.search
        ? {
            OR: [
              { documentNumber: { contains: params.search, mode: "insensitive" } },
              { title: { contains: params.search, mode: "insensitive" } },
              { customer: { name: { contains: params.search, mode: "insensitive" } } },
              { booking: { bookingNumber: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, documents] = await Promise.all([
      prisma.travelDocument.count({ where }),
      prisma.travelDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { version: "desc" }],
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          booking: { select: { id: true, bookingNumber: true } },
          trip: { select: { id: true, tripNumber: true, title: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);

    const data: DocumentListItemView[] = documents.map((doc) => ({
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      status: doc.status,
      title: doc.title,
      version: doc.version,
      isLatest: doc.isLatest,
      supersedesDocumentId: doc.supersedesDocumentId,
      bookingId: doc.bookingId,
      bookingNumber: doc.booking?.bookingNumber,
      tripId: doc.tripId,
      tripNumber: doc.trip?.tripNumber,
      tripTitle: doc.trip?.title,
      customerId: doc.customerId,
      customerName: doc.customer?.name || "Customer",
      customerPhone: doc.customer?.phone,
      customerEmail: doc.customer?.email,
      supplierId: doc.supplierId,
      supplierName: doc.supplier?.name,
      issuedAt: doc.issuedAt?.toISOString() || null,
      revokedAt: doc.revokedAt?.toISOString() || null,
      revokedReason: doc.revokedReason,
      generatedAt: doc.generatedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 2. Retrieves single document details with complete relations and audit history.
   */
  async getDocumentDetails(agencyId: string, documentId: string) {
    const document = await prisma.travelDocument.findFirst({
      where: { id: documentId, agencyId },
      include: {
        agency: true,
        customer: true,
        booking: true,
        trip: {
          include: {
            tripHotels: { include: { hotel: true } },
            tripVehicles: { include: { vehicle: true } },
            tripActivities: { include: { activity: true } },
            itineraryItems: { orderBy: { dayNumber: "asc" } },
          },
        },
        payment: true,
        supplier: true,
        hotelConfirmation: {
          include: {
            tripHotel: { include: { hotel: true } },
          },
        },
        vehicleDispatch: {
          include: {
            tripVehicle: { include: { vehicle: true } },
          },
        },
        activityConfirmation: {
          include: {
            tripActivity: { include: { activity: true } },
          },
        },
        supersedesDocument: true,
        supersededBy: true,
      },
    });

    if (!document) {
      throw new NotFoundError("Travel document not found or access denied.");
    }

    return document;
  }

  /**
   * 3. Generates all or specified travel documents for a confirmed booking.
   * Deterministic & Idempotent:
   * - If an unissued (GENERATED/DRAFT) document exists for a target, updates/returns it.
   * - If an ISSUED document exists, skips or creates v2 if requested.
   */
  async generateBookingDocuments(
    agencyId: string,
    bookingId: string,
    input: GenerateBookingDocumentsInput = {}
  ): Promise<{ generatedCount: number; documents: TravelDocument[] }> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      include: {
        customer: true,
        trip: {
          include: {
            tripHotels: { include: { hotel: true } },
            tripVehicles: { include: { vehicle: true } },
            tripActivities: { include: { activity: true } },
            itineraryItems: { orderBy: { dayNumber: "asc" } },
            tripOperation: {
              include: {
                hotelConfirmations: { include: { tripHotel: { include: { hotel: true } } } },
                vehicleDispatches: { include: { tripVehicle: { include: { vehicle: true } } } },
                activityConfirmations: { include: { tripActivity: { include: { activity: true } } } },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError("Booking not found or access denied.");
    }

    if (booking.status === "CANCELLED") {
      throw new ValidationError("Cannot generate travel documents for a cancelled booking.");
    }

    const targetTypes = input.documentTypes && input.documentTypes.length > 0
      ? input.documentTypes
      : [
          TravelDocumentType.BOOKING_CONFIRMATION,
          TravelDocumentType.CUSTOMER_ITINERARY,
          TravelDocumentType.HOTEL_VOUCHER,
          TravelDocumentType.VEHICLE_VOUCHER,
          TravelDocumentType.ACTIVITY_VOUCHER,
        ];

    const generatedDocs: TravelDocument[] = [];

    // A. BOOKING CONFIRMATION
    if (targetTypes.includes(TravelDocumentType.BOOKING_CONFIRMATION)) {
      const existing = await prisma.travelDocument.findFirst({
        where: {
          agencyId,
          bookingId: booking.id,
          documentType: TravelDocumentType.BOOKING_CONFIRMATION,
          isLatest: true,
        },
      });

      if (!existing) {
        const docNum = await this.generateNextDocumentNumber(agencyId, TravelDocumentType.BOOKING_CONFIRMATION);
        const doc = await prisma.travelDocument.create({
          data: {
            agencyId,
            bookingId: booking.id,
            tripId: booking.tripId,
            customerId: booking.customerId,
            documentNumber: docNum,
            documentType: TravelDocumentType.BOOKING_CONFIRMATION,
            status: TravelDocumentStatus.GENERATED,
            title: `Booking Confirmation - ${booking.bookingNumber}`,
            version: 1,
            isLatest: true,
            notes: input.notes,
          },
        });
        generatedDocs.push(doc);
      } else {
        generatedDocs.push(existing);
      }
    }

    // B. CUSTOMER ITINERARY
    if (targetTypes.includes(TravelDocumentType.CUSTOMER_ITINERARY)) {
      const existing = await prisma.travelDocument.findFirst({
        where: {
          agencyId,
          bookingId: booking.id,
          documentType: TravelDocumentType.CUSTOMER_ITINERARY,
          isLatest: true,
        },
      });

      if (!existing) {
        const docNum = await this.generateNextDocumentNumber(agencyId, TravelDocumentType.CUSTOMER_ITINERARY);
        const doc = await prisma.travelDocument.create({
          data: {
            agencyId,
            bookingId: booking.id,
            tripId: booking.tripId,
            customerId: booking.customerId,
            documentNumber: docNum,
            documentType: TravelDocumentType.CUSTOMER_ITINERARY,
            status: TravelDocumentStatus.GENERATED,
            title: `Travel Itinerary - ${booking.trip.title}`,
            version: 1,
            isLatest: true,
            notes: input.notes,
          },
        });
        generatedDocs.push(doc);
      } else {
        generatedDocs.push(existing);
      }
    }

    // C. HOTEL VOUCHERS (from operation hotelConfirmations or tripHotels)
    if (targetTypes.includes(TravelDocumentType.HOTEL_VOUCHER)) {
      const op = booking.trip.tripOperation;
      if (op && op.hotelConfirmations.length > 0) {
        for (const hc of op.hotelConfirmations) {
          const existing = await prisma.travelDocument.findFirst({
            where: {
              agencyId,
              bookingId: booking.id,
              hotelConfirmationId: hc.id,
              isLatest: true,
            },
          });

          if (!existing) {
            const hotelName = hc.tripHotel?.hotel?.name || "Hotel Accommodation";
            const docNum = await this.generateNextDocumentNumber(agencyId, TravelDocumentType.HOTEL_VOUCHER);
            const doc = await prisma.travelDocument.create({
              data: {
                agencyId,
                bookingId: booking.id,
                tripId: booking.tripId,
                customerId: booking.customerId,
                supplierId: hc.supplierId,
                hotelConfirmationId: hc.id,
                documentNumber: docNum,
                documentType: TravelDocumentType.HOTEL_VOUCHER,
                status: TravelDocumentStatus.GENERATED,
                title: `Hotel Voucher - ${hotelName}`,
                version: 1,
                isLatest: true,
                notes: input.notes,
              },
            });
            generatedDocs.push(doc);
          } else {
            generatedDocs.push(existing);
          }
        }
      }
    }

    // D. VEHICLE VOUCHERS (from operation vehicleDispatches or tripVehicles)
    if (targetTypes.includes(TravelDocumentType.VEHICLE_VOUCHER)) {
      const op = booking.trip.tripOperation;
      if (op && op.vehicleDispatches.length > 0) {
        for (const vd of op.vehicleDispatches) {
          const existing = await prisma.travelDocument.findFirst({
            where: {
              agencyId,
              bookingId: booking.id,
              vehicleDispatchId: vd.id,
              isLatest: true,
            },
          });

          if (!existing) {
            const vehicleName = vd.tripVehicle?.vehicle?.name || "Transport Transfer";
            const docNum = await this.generateNextDocumentNumber(agencyId, TravelDocumentType.VEHICLE_VOUCHER);
            const doc = await prisma.travelDocument.create({
              data: {
                agencyId,
                bookingId: booking.id,
                tripId: booking.tripId,
                customerId: booking.customerId,
                vehicleDispatchId: vd.id,
                documentNumber: docNum,
                documentType: TravelDocumentType.VEHICLE_VOUCHER,
                status: TravelDocumentStatus.GENERATED,
                title: `Transport Voucher - ${vehicleName}`,
                version: 1,
                isLatest: true,
                notes: input.notes,
              },
            });
            generatedDocs.push(doc);
          } else {
            generatedDocs.push(existing);
          }
        }
      }
    }

    // E. ACTIVITY VOUCHERS (from operation activityConfirmations or tripActivities)
    if (targetTypes.includes(TravelDocumentType.ACTIVITY_VOUCHER)) {
      const op = booking.trip.tripOperation;
      if (op && op.activityConfirmations.length > 0) {
        for (const ac of op.activityConfirmations) {
          const existing = await prisma.travelDocument.findFirst({
            where: {
              agencyId,
              bookingId: booking.id,
              activityConfirmationId: ac.id,
              isLatest: true,
            },
          });

          if (!existing) {
            const activityName = ac.tripActivity?.activity?.name || "Activity Sightseeing";
            const docNum = await this.generateNextDocumentNumber(agencyId, TravelDocumentType.ACTIVITY_VOUCHER);
            const doc = await prisma.travelDocument.create({
              data: {
                agencyId,
                bookingId: booking.id,
                tripId: booking.tripId,
                customerId: booking.customerId,
                activityConfirmationId: ac.id,
                documentNumber: docNum,
                documentType: TravelDocumentType.ACTIVITY_VOUCHER,
                status: TravelDocumentStatus.GENERATED,
                title: `Activity Pass - ${activityName}`,
                version: 1,
                isLatest: true,
                notes: input.notes,
              },
            });
            generatedDocs.push(doc);
          } else {
            generatedDocs.push(existing);
          }
        }
      }
    }

    return {
      generatedCount: generatedDocs.length,
      documents: generatedDocs,
    };
  }

  /**
   * 4. Generates a Payment Receipt document for a Phase 12 payment.
   */
  async generatePaymentReceipt(
    agencyId: string,
    paymentId: string
  ): Promise<TravelDocument> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId },
      include: {
        customer: true,
        booking: { include: { trip: true } },
      },
    });

    if (!payment) {
      throw new NotFoundError("Payment record not found or access denied.");
    }

    const customerId = payment.customerId || payment.booking.customerId;

    // Check if receipt document already exists
    const existing = await prisma.travelDocument.findFirst({
      where: {
        agencyId,
        paymentId: payment.id,
        documentType: TravelDocumentType.PAYMENT_RECEIPT,
        isLatest: true,
      },
    });

    if (existing) {
      return existing;
    }

    const docNum = await this.generateNextDocumentNumber(agencyId, TravelDocumentType.PAYMENT_RECEIPT);

    return prisma.travelDocument.create({
      data: {
        agencyId,
        bookingId: payment.bookingId,
        tripId: payment.tripId || payment.booking.tripId,
        customerId,
        paymentId: payment.id,
        documentNumber: docNum,
        documentType: TravelDocumentType.PAYMENT_RECEIPT,
        status: TravelDocumentStatus.ISSUED, // Payment receipts are immediately issued upon generation
        issuedAt: new Date(),
        title: `Payment Receipt - ${payment.receiptNumber || payment.paymentNumber || docNum}`,
        version: 1,
        isLatest: true,
      },
    });
  }

  /**
   * 5. Issues a generated travel document (GENERATED -> ISSUED).
   * Optionally sends document notification via Phase 15 communication layer.
   */
  async issueDocument(
    agencyId: string,
    documentId: string,
    input: IssueDocumentInput = { notifyCustomer: false }
  ): Promise<TravelDocument> {
    const document = await prisma.travelDocument.findFirst({
      where: { id: documentId, agencyId },
      include: {
        customer: true,
        booking: true,
        trip: true,
      },
    });

    if (!document) {
      throw new NotFoundError("Travel document not found or access denied.");
    }

    if (document.status === TravelDocumentStatus.REVOKED) {
      throw new ValidationError("Cannot issue a revoked document. Regenerate a new document version instead.");
    }

    if (document.status === TravelDocumentStatus.SUPERSEDED) {
      throw new ValidationError("Cannot issue a superseded document. Work with the latest active version.");
    }

    const updated = await prisma.travelDocument.update({
      where: { id: document.id },
      data: {
        status: TravelDocumentStatus.ISSUED,
        issuedAt: new Date(),
        notes: input.notes !== undefined ? input.notes : document.notes,
      },
    });

    // Optional dispatch via Phase 15 communication service
    if (input.notifyCustomer && document.customer) {
      const channel = input.channel || NotificationChannel.EMAIL;
      const downloadUrl = `/customer/trips/${document.tripId}/documents`;

      communicationService.sendCommunication(agencyId, {
        agencyId,
        customerId: document.customerId,
        bookingId: document.bookingId || undefined,
        tripId: document.tripId || undefined,
        type: CustomerNotificationType.DOCUMENT_READY,
        channel,
        title: `Travel Document Ready: ${document.title}`,
        message: `Your travel document (${document.title} - ${document.documentNumber}) is now issued and ready for download.`,
        linkUrl: downloadUrl,
        recipient: {
          name: document.customer.name,
          email: document.customer.email || undefined,
          phone: document.customer.phone || undefined,
        },
        metadata: {
          documentId: document.id,
          documentNumber: document.documentNumber,
          documentType: document.documentType,
          version: document.version,
        },
        idempotencyKey: `doc-issued-${document.id}-${channel}`,
      }).catch((err) => {
        console.error("Non-blocking error dispatching document notification:", err);
      });
    }

    return updated;
  }

  /**
   * 6. Revokes an issued document (ISSUED -> REVOKED) with reason.
   */
  async revokeDocument(
    agencyId: string,
    documentId: string,
    input: RevokeDocumentInput
  ): Promise<TravelDocument> {
    const document = await prisma.travelDocument.findFirst({
      where: { id: documentId, agencyId },
    });

    if (!document) {
      throw new NotFoundError("Travel document not found or access denied.");
    }

    if (document.status === TravelDocumentStatus.REVOKED) {
      return document; // Idempotent
    }

    return prisma.travelDocument.update({
      where: { id: document.id },
      data: {
        status: TravelDocumentStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: input.reason,
      },
    });
  }

  /**
   * 7. Regenerates a document by creating v2 and marking old version SUPERSEDED.
   */
  async regenerateDocument(
    agencyId: string,
    documentId: string,
    notes?: string
  ): Promise<TravelDocument> {
    const oldDoc = await prisma.travelDocument.findFirst({
      where: { id: documentId, agencyId },
    });

    if (!oldDoc) {
      throw new NotFoundError("Travel document not found or access denied.");
    }

    // Mark previous versions as not latest and superseded
    await prisma.travelDocument.update({
      where: { id: oldDoc.id },
      data: {
        isLatest: false,
        status: oldDoc.status === TravelDocumentStatus.ISSUED ? TravelDocumentStatus.SUPERSEDED : oldDoc.status,
      },
    });

    // Create new version linked to previous
    return prisma.travelDocument.create({
      data: {
        agencyId,
        bookingId: oldDoc.bookingId,
        tripId: oldDoc.tripId,
        customerId: oldDoc.customerId,
        paymentId: oldDoc.paymentId,
        supplierId: oldDoc.supplierId,
        hotelConfirmationId: oldDoc.hotelConfirmationId,
        vehicleDispatchId: oldDoc.vehicleDispatchId,
        activityConfirmationId: oldDoc.activityConfirmationId,
        documentNumber: oldDoc.documentNumber, // Keeps same document number
        documentType: oldDoc.documentType,
        status: TravelDocumentStatus.GENERATED,
        title: oldDoc.title,
        version: oldDoc.version + 1,
        isLatest: true,
        supersedesDocumentId: oldDoc.id,
        notes: notes || oldDoc.notes,
      },
    });
  }

  /**
   * 8. Resends an issued document to customer via Phase 15 communication service.
   */
  async resendDocument(
    agencyId: string,
    documentId: string,
    input: ResendDocumentInput = {}
  ): Promise<{ success: boolean; notificationId?: string; message: string }> {
    const document = await prisma.travelDocument.findFirst({
      where: { id: documentId, agencyId },
      include: { customer: true, trip: true },
    });

    if (!document) {
      throw new NotFoundError("Travel document not found or access denied.");
    }

    if (document.status === TravelDocumentStatus.REVOKED) {
      throw new ValidationError("Cannot resend a revoked travel document.");
    }

    if (document.status === TravelDocumentStatus.SUPERSEDED) {
      throw new ValidationError("Cannot resend a superseded travel document. Resend the latest issued version.");
    }

    if (document.status !== TravelDocumentStatus.ISSUED) {
      throw new ValidationError("Document must be officially issued before sending to traveler.");
    }

    const channel = input.channel || NotificationChannel.EMAIL;
    const recipient = input.customRecipient || (channel === NotificationChannel.EMAIL ? document.customer.email : document.customer.phone);

    if (!recipient) {
      throw new ValidationError(`Customer does not have a valid recipient address for ${channel}.`);
    }

    const result = await communicationService.sendCommunication(agencyId, {
      agencyId,
      customerId: document.customerId,
      bookingId: document.bookingId || undefined,
      tripId: document.tripId || undefined,
      type: CustomerNotificationType.DOCUMENT_READY,
      channel,
      title: `Travel Document: ${document.title}`,
      message: `Your travel document (${document.title} - ${document.documentNumber}) is attached and available in your portal.`,
      linkUrl: `/customer/trips/${document.tripId}/documents`,
      recipient: {
        name: document.customer.name,
        email: channel === NotificationChannel.EMAIL ? recipient : undefined,
        phone: channel === NotificationChannel.WHATSAPP ? recipient : undefined,
      },
      metadata: {
        documentId: document.id,
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        version: document.version,
      },
      idempotencyKey: `doc-resend-${document.id}-${Date.now()}`,
    });

    return {
      success: true,
      notificationId: result?.id,
      message: `Document ${document.documentNumber} dispatched successfully via ${channel}.`,
    };
  }

  /**
   * 9. Server-authoritative PDF binary rendering with zero commercial leakage.
   */
  async renderDocumentPdf(
    agencyId: string,
    documentId: string
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const document = await this.getDocumentDetails(agencyId, documentId);

    const agency = {
      name: document.agency.name,
      phone: document.agency.phone,
      email: document.agency.email,
      address: document.agency.address,
      logo: document.agency.logo,
    };

    const customer = {
      name: document.customer.name,
      phone: document.customer.phone,
      email: document.customer.email,
      city: document.customer.city,
    };

    let buffer: Buffer;
    let filename = `${document.documentType}-${document.documentNumber}-v${document.version}.pdf`;

    switch (document.documentType) {
      case TravelDocumentType.HOTEL_VOUCHER: {
        const hc = document.hotelConfirmation;
        const hotel = hc?.tripHotel?.hotel;
        buffer = await documentPdfService.renderHotelVoucher({
          documentNumber: document.documentNumber,
          version: document.version,
          issuedAt: document.issuedAt,
          agency,
          customer,
          tripNumber: document.trip?.tripNumber || "TRIP",
          bookingNumber: document.booking?.bookingNumber,
          hotelName: hotel?.name || "Confirmed Accommodation",
          hotelAddress: hotel?.address ? `${hotel.address}, ${hotel.city || ""}` : undefined,
          hotelPhone: hotel?.phone,
          checkIn: hc?.checkIn || null,
          checkOut: hc?.checkOut || null,
          roomDetails: hc?.roomDetails || hc?.tripHotel?.roomType,
          mealPlan: hc?.mealPlan || hc?.tripHotel?.mealPlan,
          confirmationNumber: hc?.confirmationNumber,
          notes: document.notes,
        });
        break;
      }

      case TravelDocumentType.VEHICLE_VOUCHER: {
        const vd = document.vehicleDispatch;
        const vehicle = vd?.tripVehicle?.vehicle;
        buffer = await documentPdfService.renderVehicleVoucher({
          documentNumber: document.documentNumber,
          version: document.version,
          issuedAt: document.issuedAt,
          agency,
          customer,
          tripNumber: document.trip?.tripNumber || "TRIP",
          bookingNumber: document.booking?.bookingNumber,
          vehicleName: vehicle?.name || "Transport Transfer",
          vehicleCategory: vehicle?.type || undefined,
          vehicleNumber: vd?.vehicleNumber,
          driverName: vd?.driverName,
          driverPhone: vd?.driverPhone,
          pickupDate: vd?.pickupDate,
          pickupTime: vd?.pickupTime,
          pickupLocation: vd?.pickupLocation,
          dropLocation: vd?.dropLocation,
          notes: document.notes,
        });
        break;
      }

      case TravelDocumentType.ACTIVITY_VOUCHER: {
        const ac = document.activityConfirmation;
        const activity = ac?.tripActivity?.activity;
        buffer = await documentPdfService.renderActivityVoucher({
          documentNumber: document.documentNumber,
          version: document.version,
          issuedAt: document.issuedAt,
          agency,
          customer,
          tripNumber: document.trip?.tripNumber || "TRIP",
          bookingNumber: document.booking?.bookingNumber,
          activityName: activity?.name || "Sightseeing & Activity",
          activityLocation: activity?.location || undefined,
          activityDate: document.trip?.startDate,
          ticketNumber: ac?.ticketNumber,
          confirmationNumber: ac?.confirmationNumber,
          notes: document.notes,
        });
        break;
      }

      case TravelDocumentType.BOOKING_CONFIRMATION: {
        const booking = document.booking;
        if (!booking) {
          throw new ValidationError("Booking reference missing for confirmation.");
        }
        buffer = await documentPdfService.renderBookingConfirmation({
          documentNumber: document.documentNumber,
          version: document.version,
          issuedAt: document.issuedAt,
          agency,
          customer,
          tripNumber: document.trip?.tripNumber || "TRIP",
          tripTitle: document.trip?.title || "Confirmed Travel Package",
          bookingNumber: booking.bookingNumber,
          bookingDate: booking.bookingDate,
          travelStartDate: booking.travelStartDate || document.trip?.startDate,
          travelEndDate: booking.travelEndDate || document.trip?.endDate,
          totalAmount: booking.totalAmount.toString(),
          paidAmount: booking.paidAmount.toString(),
          balanceAmount: booking.balanceAmount.toString(),
          currency: booking.currency,
          hotels: (document.trip?.tripHotels || []).map((th) => ({
            name: th.hotel?.name || "Hotel",
            city: th.hotel?.city,
            checkIn: th.checkIn,
            checkOut: th.checkOut,
            roomType: th.roomType,
          })),
          vehicles: (document.trip?.tripVehicles || []).map((tv) => ({
            name: tv.vehicle?.name || tv.vehicleName || "Transfer",
            pickupDate: tv.startDate,
            pickupLocation: tv.pickupLocation,
          })),
          activities: (document.trip?.tripActivities || []).map((ta) => ({
            name: ta.activity?.name || ta.name || "Activity",
            date: ta.date,
          })),
          notes: document.notes,
        });
        break;
      }

      case TravelDocumentType.PAYMENT_RECEIPT: {
        const payment = document.payment;
        if (!payment) {
          throw new ValidationError("Payment record missing for receipt.");
        }
        buffer = await documentPdfService.renderPaymentReceipt({
          documentNumber: document.documentNumber,
          version: document.version,
          issuedAt: document.issuedAt,
          agency,
          customer,
          tripNumber: document.trip?.tripNumber,
          bookingNumber: document.booking?.bookingNumber,
          paymentNumber: payment.paymentNumber,
          receiptNumber: payment.receiptNumber || document.documentNumber,
          paymentDate: payment.paymentDate,
          amount: payment.amount.toString(),
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          totalBookingAmount: document.booking?.totalAmount.toString(),
          cumulativePaidAmount: document.booking?.paidAmount.toString(),
          remainingBalance: document.booking?.balanceAmount.toString(),
          notes: document.notes,
        });
        break;
      }

      case TravelDocumentType.CUSTOMER_ITINERARY:
      case TravelDocumentType.TRAVEL_SUMMARY:
      default: {
        buffer = await documentPdfService.renderCustomerItinerary({
          documentNumber: document.documentNumber,
          version: document.version,
          issuedAt: document.issuedAt,
          agency,
          customer,
          tripNumber: document.trip?.tripNumber || "TRIP",
          tripTitle: document.trip?.title || "Confirmed Itinerary",
          bookingNumber: document.booking?.bookingNumber,
          startDate: document.trip?.startDate,
          endDate: document.trip?.endDate,
          itineraryDays: (document.trip?.itineraryItems || []).map((item) => ({
            dayNumber: item.dayNumber,
            title: item.title,
            description: item.description,
            date: item.date,
          })),
          hotels: (document.trip?.tripHotels || []).map((th) => ({
            name: th.hotel?.name || "Hotel",
            city: th.hotel?.city,
            checkIn: th.checkIn,
            checkOut: th.checkOut,
            roomType: th.roomType,
            mealPlan: th.mealPlan,
          })),
          vehicles: (document.trip?.tripVehicles || []).map((tv) => ({
            name: tv.vehicle?.name || tv.vehicleName || "Transfer",
            pickupDate: tv.startDate,
            pickupLocation: tv.pickupLocation,
            dropLocation: tv.dropLocation,
          })),
          activities: (document.trip?.tripActivities || []).map((ta) => ({
            name: ta.activity?.name || ta.name || "Activity",
            date: ta.date,
            time: ta.time,
          })),
          emergencyContact: document.agency.phone,
          notes: document.notes,
        });
        break;
      }
    }

    return {
      buffer,
      filename,
      contentType: "application/pdf",
    };
  }
}

export const travelDocumentService = new TravelDocumentService();
