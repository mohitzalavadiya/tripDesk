import { Booking, BookingStatus, PaymentStatus } from "@/types";

export interface CreateBookingDTO {
  tripId: string;
  quotationId?: string;
  customerId: string;
  totalAmount: number;
  notes?: string;
}

export interface BookingService {
  getBookings: (agencyId?: string) => Promise<Booking[]>;
  getBooking: (id: string) => Promise<Booking | null>;
  createBooking: (data: CreateBookingDTO, agencyId: string) => Promise<Booking>;
  updateBooking: (id: string, data: Partial<Booking>) => Promise<Booking>;
}

export const bookingService: BookingService = {
  async getBookings(agencyId?: string): Promise<Booking[]> {
    await new Promise((res) => setTimeout(res, 50));
    return [];
  },

  async getBooking(id: string): Promise<Booking | null> {
    await new Promise((res) => setTimeout(res, 50));
    return null;
  },

  async createBooking(data: CreateBookingDTO, agencyId: string): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 80));
    const now = new Date().toISOString();
    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      bookingNumber: `BK-${Date.now().toString().slice(-6)}`,
      secureToken: `SEC-${Date.now()}`,
      tripId: data.tripId,
      quotationId: data.quotationId,
      customerId: data.customerId,
      title: "Confirmed Package Booking",
      destination: "Kerala",
      startDate: "2026-09-10",
      endDate: "2026-09-16",
      adults: 2,
      children: 0,
      infants: 0,
      status: "Confirmed",
      paymentStatus: "Unpaid",
      totalAmount: data.totalAmount,
      paidAmount: 0,
      pendingAmount: data.totalAmount,
      totalSupplierCost: 0,
      paidSupplierCost: 0,
      pendingSupplierCost: 0,
      expectedProfit: 0,
      customerSnapshot: {
        id: data.customerId,
        name: "Rahul Patel",
        phone: "+91 98765 43210",
        email: "rahul@example.com",
        city: "Mumbai",
        travellersLabel: "2 Adults",
      },
      tripSnapshot: {
        id: data.tripId,
        title: "Kerala Discovery",
        destination: "Kerala",
        startDate: "2026-09-10",
        endDate: "2026-09-16",
        durationLabel: "6 Nights / 7 Days",
        nights: 6,
        days: 7,
        adults: 2,
        children: 0,
        infants: 0,
      },
      agencySnapshot: {
        name: "ABC Travels",
        email: "contact@abctravels.com",
        phone: "+91 98470 12345",
      },
      payments: [],
      supplierPayments: [],
      refunds: [],
      items: [],
      timeline: [],
      documents: [],
      createdAt: now,
      updatedAt: now,
    };
    return newBooking;
  },

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    await new Promise((res) => setTimeout(res, 80));
    return {
      id,
      bookingNumber: `BK-${id}`,
      secureToken: `SEC-${id}`,
      tripId: "trip-1",
      customerId: "cust-1",
      title: "Confirmed Package Booking",
      destination: "Kerala",
      startDate: "2026-09-10",
      endDate: "2026-09-16",
      adults: 2,
      children: 0,
      infants: 0,
      status: "Confirmed",
      paymentStatus: "Unpaid",
      totalAmount: 50000,
      paidAmount: 0,
      pendingAmount: 50000,
      totalSupplierCost: 0,
      paidSupplierCost: 0,
      pendingSupplierCost: 0,
      expectedProfit: 0,
      customerSnapshot: {
        id: "cust-1",
        name: "Rahul Patel",
        phone: "+91 98765 43210",
        email: "rahul@example.com",
        city: "Mumbai",
        travellersLabel: "2 Adults",
      },
      tripSnapshot: {
        id: "trip-1",
        title: "Kerala Discovery",
        destination: "Kerala",
        startDate: "2026-09-10",
        endDate: "2026-09-16",
        durationLabel: "6 Nights / 7 Days",
        nights: 6,
        days: 7,
        adults: 2,
        children: 0,
        infants: 0,
      },
      agencySnapshot: {
        name: "ABC Travels",
        email: "contact@abctravels.com",
        phone: "+91 98470 12345",
      },
      payments: [],
      supplierPayments: [],
      refunds: [],
      items: [],
      timeline: [],
      documents: [],
      ...data,
      updatedAt: new Date().toISOString(),
    } as Booking;
  },
};
