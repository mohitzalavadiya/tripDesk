import { Trip, TripStatus, ItineraryDay } from "@/types";

export interface CreateTripDTO {
  customerId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  budget?: number;
  notes?: string;
  status?: TripStatus;
}

export interface TripTravelerDTO {
  id: string;
  tripId: string;
  name: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  isPrimary?: boolean;
  subTravelers?: {
    id: string;
    name: string;
    relationship?: string;
    age?: number;
  }[];
}

export interface TripService {
  getTrips: (agencyId?: string, customerId?: string) => Promise<Trip[]>;
  getTrip: (id: string) => Promise<Trip | null>;
  createTrip: (data: CreateTripDTO, agencyId: string) => Promise<Trip>;
  updateTrip: (id: string, data: Partial<Trip>) => Promise<Trip>;
  updateTripStatus: (id: string, status: TripStatus) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<boolean>;
}

// Initial Mock Seed for Trips
let mockTrips: (Trip & { agencyId?: string })[] = [
  {
    id: "trip-1",
    customerId: "cust-1",
    name: "Luxury Munnar & Alleppey Discovery",
    destination: "Kerala",
    startDate: "2026-09-10",
    endDate: "2026-09-16",
    adults: 2,
    children: 1,
    infants: 0,
    budget: 85000,
    status: "CONFIRMED",
    notes: "Honeymoon & relaxation theme. Lake-view rooms requested.",
    agencyId: "agency-1",
    createdAt: "2025-08-22T10:00:00Z",
    updatedAt: "2025-08-22T10:00:00Z",
  },
  {
    id: "trip-2",
    customerId: "cust-1",
    name: "Dubai Winter Getaway",
    destination: "Dubai",
    startDate: "2026-12-15",
    endDate: "2026-12-21",
    adults: 2,
    children: 0,
    infants: 0,
    budget: 180000,
    status: "QUOTATION",
    notes: "Luxury desert safari and shopping package.",
    agencyId: "agency-1",
    createdAt: "2026-01-10T12:00:00Z",
    updatedAt: "2026-01-10T12:00:00Z",
  },
  {
    id: "trip-3",
    customerId: "cust-2",
    name: "Kashmir Valley & Gulmarg Snow Trail",
    destination: "Kashmir",
    startDate: "2026-10-02",
    endDate: "2026-10-08",
    adults: 4,
    children: 0,
    infants: 0,
    budget: 120000,
    status: "CONFIRMED",
    notes: "Gondola ride tickets and houseboat in Dal Lake.",
    agencyId: "agency-1",
    createdAt: "2025-09-15T15:00:00Z",
    updatedAt: "2025-09-15T15:00:00Z",
  },
  {
    id: "trip-4",
    customerId: "cust-3",
    name: "Royal Heritage Forts of Rajasthan",
    destination: "Rajasthan",
    startDate: "2026-11-05",
    endDate: "2026-11-12",
    adults: 6,
    children: 0,
    infants: 0,
    budget: 250000,
    status: "DRAFT",
    notes: "Jaipur, Jodhpur, and Udaipur heritage palace hotels.",
    agencyId: "agency-1",
    createdAt: "2025-10-06T11:00:00Z",
    updatedAt: "2025-10-06T11:00:00Z",
  },
];

export const tripService: TripService = {
  async getTrips(agencyId?: string, customerId?: string): Promise<Trip[]> {
    await new Promise((res) => setTimeout(res, 50));
    return mockTrips.filter((t) => {
      if (agencyId && t.agencyId && t.agencyId !== agencyId) return false;
      if (customerId && t.customerId !== customerId) return false;
      return true;
    });
  },

  async getTrip(id: string): Promise<Trip | null> {
    await new Promise((res) => setTimeout(res, 50));
    const trip = mockTrips.find((t) => t.id === id);
    return trip ? { ...trip } : null;
  },

  async createTrip(data: CreateTripDTO, agencyId: string): Promise<Trip> {
    await new Promise((res) => setTimeout(res, 80));
    const now = new Date().toISOString();
    const newTrip: Trip & { agencyId?: string } = {
      id: `trip-${Date.now()}`,
      customerId: data.customerId,
      name: data.name.trim(),
      destination: data.destination.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      adults: data.adults,
      children: data.children || 0,
      infants: data.infants || 0,
      budget: data.budget,
      status: data.status || "DRAFT",
      notes: data.notes?.trim(),
      agencyId,
      createdAt: now,
      updatedAt: now,
    };
    mockTrips.unshift(newTrip);
    return { ...newTrip };
  },

  async updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
    await new Promise((res) => setTimeout(res, 80));
    const index = mockTrips.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Trip ${id} not found`);
    }
    mockTrips[index] = {
      ...mockTrips[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockTrips[index] };
  },

  async updateTripStatus(id: string, status: TripStatus): Promise<Trip> {
    await new Promise((res) => setTimeout(res, 80));
    const index = mockTrips.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Trip ${id} not found`);
    }
    mockTrips[index] = {
      ...mockTrips[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockTrips[index] };
  },

  async deleteTrip(id: string): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 80));
    const prevLen = mockTrips.length;
    mockTrips = mockTrips.filter((t) => t.id !== id);
    return mockTrips.length < prevLen;
  },
};
