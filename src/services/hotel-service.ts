import { Hotel, HotelRoom, HotelRate, MealPlan } from "@/types";

export interface CreateHotelDTO {
  name: string;
  destination: string;
  area?: string;
  address?: string;
  starCategory?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities: string[];
  description?: string;
  notes?: string;
}

export interface CreateHotelRateDTO {
  hotelId: string;
  roomId: string;
  mealPlan: MealPlan;
  currency?: string;
  baseRate: number;
  occupancyAdults: number;
  occupancyChildren?: number;
  extraAdultRate?: number;
  childRate?: number;
  validFrom: string;
  validTo: string;
  notes?: string;
}

export interface HotelService {
  getHotels: (agencyId?: string) => Promise<Hotel[]>;
  getHotel: (id: string) => Promise<Hotel | null>;
  createHotel: (data: CreateHotelDTO, agencyId: string) => Promise<Hotel>;
  updateHotel: (id: string, data: Partial<Hotel>) => Promise<Hotel>;
  deleteHotel: (id: string) => Promise<boolean>;
  getHotelRooms: (hotelId: string) => Promise<HotelRoom[]>;
  getHotelRates: (hotelId: string) => Promise<HotelRate[]>;
  addHotelRate: (data: CreateHotelRateDTO) => Promise<HotelRate>;
}

// Initial Mock Seed for Hotels (Agency Scoped)
let mockHotels: (Hotel & { agencyId?: string })[] = [
  {
    id: "hotel-1",
    name: "The World Backwaters Resort",
    destination: "Alleppey",
    area: "Punnamada",
    address: "Finishing Point Road, Punnamada, Alleppey",
    starCategory: 5,
    contactPerson: "Mathew Thomas",
    phone: "+91 477 224 5678",
    email: "reservations@theworldbackwaters.com",
    website: "https://theworldbackwaters.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Swimming Pool", "Ayurvedic Spa", "Free Wi-Fi", "Lake View Dining", "Fitness Center"],
    description: "Serene luxury resort nestled along the banks of Vembanad Lake in Kerala.",
    status: "Active",
    agencyId: "agency-1",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
  {
    id: "hotel-2",
    name: "Tall Trees Resort & Spa",
    destination: "Munnar",
    area: "Pothamedu",
    address: "Bison Valley Road, Pothamedu, Munnar",
    starCategory: 4,
    contactPerson: "Suresh Nair",
    phone: "+91 486 523 0441",
    email: "stay@talltreesmunnar.com",
    website: "https://talltreesmunnar.com",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    amenities: ["Treehouse Living", "Organic Tea Plantation", "Nature Trails", "Restaurant"],
    description: "Eco-luxury resort surrounded by 600 towering preserved shola trees.",
    status: "Active",
    agencyId: "agency-1",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
];

let mockRooms: HotelRoom[] = [
  {
    id: "room-1",
    hotelId: "hotel-1",
    name: "Vembanad Club Lakeview",
    maxAdults: 3,
    maxChildren: 1,
    bedType: "King Bed",
    description: "Spacious private balcony overlooking Vembanad Lake.",
    status: "Active",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
  {
    id: "room-2",
    hotelId: "hotel-1",
    name: "Vembanad Club Select Villa",
    maxAdults: 4,
    maxChildren: 2,
    bedType: "King Bed + Sofa Bed",
    description: "Private plunge pool and luxury living room.",
    status: "Active",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
  {
    id: "room-3",
    hotelId: "hotel-2",
    name: "Cinnamon Cottage",
    maxAdults: 2,
    maxChildren: 1,
    bedType: "King Bed",
    description: "Rustic wooden balcony facing tea plantations.",
    status: "Active",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
];

let mockRates: HotelRate[] = [
  {
    id: "rate-1",
    hotelId: "hotel-1",
    roomId: "room-1",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 5500,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 1700,
    childRate: 1000,
    validFrom: "2026-04-01",
    validTo: "2026-09-30",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
  {
    id: "rate-2",
    hotelId: "hotel-1",
    roomId: "room-1",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 7500,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 2300,
    childRate: 1400,
    validFrom: "2026-04-01",
    validTo: "2026-09-30",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
];

export const hotelService: HotelService = {
  async getHotels(agencyId?: string): Promise<Hotel[]> {
    await new Promise((res) => setTimeout(res, 50));
    return mockHotels.filter((h) => !agencyId || !h.agencyId || h.agencyId === agencyId);
  },

  async getHotel(id: string): Promise<Hotel | null> {
    await new Promise((res) => setTimeout(res, 50));
    const hotel = mockHotels.find((h) => h.id === id);
    return hotel ? { ...hotel } : null;
  },

  async createHotel(data: CreateHotelDTO, agencyId: string): Promise<Hotel> {
    await new Promise((res) => setTimeout(res, 80));
    const now = new Date().toISOString();
    const newHotel: Hotel & { agencyId?: string } = {
      id: `hotel-${Date.now()}`,
      name: data.name.trim(),
      destination: data.destination.trim(),
      area: data.area?.trim(),
      address: data.address?.trim(),
      starCategory: data.starCategory,
      contactPerson: data.contactPerson?.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim(),
      website: data.website?.trim(),
      checkInTime: data.checkInTime || "14:00",
      checkOutTime: data.checkOutTime || "11:00",
      amenities: data.amenities || [],
      description: data.description?.trim(),
      notes: data.notes?.trim(),
      status: "Active",
      agencyId,
      createdAt: now,
      updatedAt: now,
    };
    mockHotels.unshift(newHotel);
    return { ...newHotel };
  },

  async updateHotel(id: string, data: Partial<Hotel>): Promise<Hotel> {
    await new Promise((res) => setTimeout(res, 80));
    const index = mockHotels.findIndex((h) => h.id === id);
    if (index === -1) {
      throw new Error(`Hotel ${id} not found`);
    }
    mockHotels[index] = {
      ...mockHotels[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockHotels[index] };
  },

  async deleteHotel(id: string): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 80));
    const prevLen = mockHotels.length;
    mockHotels = mockHotels.filter((h) => h.id !== id);
    return mockHotels.length < prevLen;
  },

  async getHotelRooms(hotelId: string): Promise<HotelRoom[]> {
    await new Promise((res) => setTimeout(res, 50));
    return mockRooms.filter((r) => r.hotelId === hotelId);
  },

  async getHotelRates(hotelId: string): Promise<HotelRate[]> {
    await new Promise((res) => setTimeout(res, 50));
    return mockRates.filter((r) => r.hotelId === hotelId);
  },

  async addHotelRate(data: CreateHotelRateDTO): Promise<HotelRate> {
    await new Promise((res) => setTimeout(res, 80));
    const now = new Date().toISOString();
    const newRate: HotelRate = {
      id: `rate-${Date.now()}`,
      hotelId: data.hotelId,
      roomId: data.roomId,
      mealPlan: data.mealPlan,
      currency: data.currency || "INR",
      baseRate: data.baseRate,
      occupancyAdults: data.occupancyAdults,
      occupancyChildren: data.occupancyChildren,
      extraAdultRate: data.extraAdultRate,
      childRate: data.childRate,
      validFrom: data.validFrom,
      validTo: data.validTo,
      notes: data.notes?.trim(),
      status: "Active",
      sourceType: "Manual",
      createdAt: now,
      updatedAt: now,
    };
    mockRates.unshift(newRate);
    return { ...newRate };
  },
};
