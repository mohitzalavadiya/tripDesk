import { PaymentMethod } from "@/types";

export interface CustomerPaymentRecord {
  id: string;
  tripId: string;
  bookingId?: string;
  customerId: string;
  amount: number;
  paymentMethod: "UPI" | "Bank Transfer" | "Cash" | "Card" | "Other";
  reference?: string;
  paymentDate: string;
  notes?: string;
  agencyId: string;
  createdAt: string;
}

export interface RecordCustomerPaymentDTO {
  tripId: string;
  bookingId?: string;
  customerId: string;
  amount: number;
  paymentMethod: "UPI" | "Bank Transfer" | "Cash" | "Card" | "Other";
  reference?: string;
  notes?: string;
}

export interface TripPaymentSummary {
  tripId: string;
  totalPackageCost: number;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: "Pending" | "Partially Paid" | "Paid in Full";
  payments: CustomerPaymentRecord[];
}

export interface CustomerPaymentService {
  getPaymentsByTrip: (tripId: string) => Promise<CustomerPaymentRecord[]>;
  recordPayment: (data: RecordCustomerPaymentDTO, agencyId: string) => Promise<CustomerPaymentRecord>;
  getTripPaymentSummary: (tripId: string, totalCost: number) => Promise<TripPaymentSummary>;
}

// Initial Mock Seed for Customer Payments (System B: Customer -> Agency)
let mockCustomerPayments: CustomerPaymentRecord[] = [
  {
    id: "CPAY-101",
    tripId: "trip-1",
    bookingId: "book-1",
    customerId: "cust-1",
    amount: 30000,
    paymentMethod: "UPI",
    reference: "UPI/382910283910/GPay",
    paymentDate: "2026-08-22",
    notes: "Initial 35% advance deposit received.",
    agencyId: "agency-1",
    createdAt: "2026-08-22T11:00:00Z",
  },
  {
    id: "CPAY-102",
    tripId: "trip-1",
    bookingId: "book-1",
    customerId: "cust-1",
    amount: 25000,
    paymentMethod: "Bank Transfer",
    reference: "NEFT-HDFC0001284",
    paymentDate: "2026-08-23",
    notes: "Second installment for luxury houseboat confirmation.",
    agencyId: "agency-1",
    createdAt: "2026-08-23T15:30:00Z",
  },
];

export const customerPaymentService: CustomerPaymentService = {
  async getPaymentsByTrip(tripId: string): Promise<CustomerPaymentRecord[]> {
    await new Promise((res) => setTimeout(res, 50));
    return mockCustomerPayments.filter((p) => p.tripId === tripId);
  },

  async recordPayment(
    data: RecordCustomerPaymentDTO,
    agencyId: string
  ): Promise<CustomerPaymentRecord> {
    await new Promise((res) => setTimeout(res, 80));
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const newPayment: CustomerPaymentRecord = {
      id: `CPAY-${Date.now().toString().slice(-4)}`,
      tripId: data.tripId,
      bookingId: data.bookingId,
      customerId: data.customerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      reference: data.reference?.trim() || `MANUAL-${Date.now().toString().slice(-4)}`,
      paymentDate: todayStr,
      notes: data.notes?.trim(),
      agencyId,
      createdAt: now.toISOString(),
    };
    mockCustomerPayments.unshift(newPayment);
    return { ...newPayment };
  },

  async getTripPaymentSummary(
    tripId: string,
    totalCost: number
  ): Promise<TripPaymentSummary> {
    await new Promise((res) => setTimeout(res, 50));
    const payments = mockCustomerPayments.filter((p) => p.tripId === tripId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, totalCost - totalPaid);

    let paymentStatus: "Pending" | "Partially Paid" | "Paid in Full" = "Pending";
    if (totalPaid >= totalCost && totalCost > 0) {
      paymentStatus = "Paid in Full";
    } else if (totalPaid > 0) {
      paymentStatus = "Partially Paid";
    }

    return {
      tripId,
      totalPackageCost: totalCost,
      totalPaid,
      balanceDue,
      paymentStatus,
      payments,
    };
  },
};
