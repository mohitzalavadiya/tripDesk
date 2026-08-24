import { Customer } from "@/types";

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  idPhoto?: string; // Private ID photo (visible only to Agency Owner)
  preferredContactMethod?: "WhatsApp" | "Email" | "Phone" | "SMS";
  preferredHotelCategory?: string;
  preferredMealPlan?: string;
  preferredVehicle?: string;
  preferredDestination?: string;
  preferences?: string;
  notes?: string;
}

export interface CustomerService {
  getCustomers: (agencyId?: string) => Promise<Customer[]>;
  getCustomer: (id: string, agencyId?: string) => Promise<Customer | null>;
  createCustomer: (data: CreateCustomerDTO, agencyId: string) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<boolean>;
}

// Initial Mock Seed (Conceptually partitioned by agencyId)
let mockCustomers: (Customer & { agencyId?: string; idPhoto?: string })[] = [
  {
    id: "cust-1",
    name: "Rahul Patel",
    phone: "+91 98765 43210",
    email: "rahul.patel@example.com",
    city: "Mumbai",
    preferredContactMethod: "WhatsApp",
    preferredHotelCategory: "5 Star Luxury",
    preferredMealPlan: "CPAI",
    preferredVehicle: "Innova Crysta",
    preferredDestination: "Kerala",
    notes: "VIP Repeat Customer. Prefers premium lake-view rooms.",
    idPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop&q=80",
    agencyId: "agency-1",
    createdAt: "2025-08-20T10:00:00Z",
    updatedAt: "2025-08-20T10:00:00Z",
  },
  {
    id: "cust-2",
    name: "Priya Sharma",
    phone: "+91 98123 45678",
    email: "priya.sharma@example.com",
    city: "Delhi",
    preferredContactMethod: "Email",
    preferredHotelCategory: "4 Star",
    preferredMealPlan: "MAPAI",
    preferredVehicle: "Sedan",
    preferredDestination: "Kashmir",
    notes: "Family travel group of 4. Requires vegetarian meals.",
    agencyId: "agency-1",
    createdAt: "2025-09-12T14:30:00Z",
    updatedAt: "2025-09-12T14:30:00Z",
  },
  {
    id: "cust-3",
    name: "Amit Deshmukh",
    phone: "+91 97654 32109",
    email: "amit.deshmukh@example.com",
    city: "Pune",
    preferredContactMethod: "Phone",
    preferredHotelCategory: "Boutique Heritage",
    preferredMealPlan: "CPAI",
    preferredVehicle: "Tempo Traveller",
    preferredDestination: "Rajasthan",
    notes: "Annual corporate retreat planner.",
    agencyId: "agency-1",
    createdAt: "2025-10-05T09:15:00Z",
    updatedAt: "2025-10-05T09:15:00Z",
  },
];

export const customerService: CustomerService = {
  async getCustomers(agencyId?: string): Promise<Customer[]> {
    // Simulate async network latency
    await new Promise((res) => setTimeout(res, 50));
    if (agencyId) {
      return mockCustomers.filter((c) => !c.agencyId || c.agencyId === agencyId);
    }
    return [...mockCustomers];
  },

  async getCustomer(id: string, agencyId?: string): Promise<Customer | null> {
    await new Promise((res) => setTimeout(res, 50));
    const customer = mockCustomers.find(
      (c) => c.id === id && (!agencyId || !c.agencyId || c.agencyId === agencyId)
    );
    return customer ? { ...customer } : null;
  },

  async createCustomer(data: CreateCustomerDTO, agencyId: string): Promise<Customer> {
    await new Promise((res) => setTimeout(res, 80));
    const now = new Date().toISOString();
    const newCustomer: Customer & { agencyId?: string; idPhoto?: string } = {
      id: `cust-${Date.now()}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      city: data.city?.trim(),
      preferredContactMethod: data.preferredContactMethod || "WhatsApp",
      preferredHotelCategory: data.preferredHotelCategory,
      preferredMealPlan: data.preferredMealPlan,
      preferredVehicle: data.preferredVehicle,
      preferredDestination: data.preferredDestination,
      preferences: data.preferences?.trim(),
      notes: data.notes?.trim(),
      idPhoto: data.idPhoto?.trim(),
      agencyId,
      createdAt: now,
      updatedAt: now,
    };
    mockCustomers.unshift(newCustomer);
    return { ...newCustomer };
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    await new Promise((res) => setTimeout(res, 80));
    const index = mockCustomers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Customer ${id} not found`);
    }
    mockCustomers[index] = {
      ...mockCustomers[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockCustomers[index] };
  },

  async deleteCustomer(id: string): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 80));
    const prevLen = mockCustomers.length;
    mockCustomers = mockCustomers.filter((c) => c.id !== id);
    return mockCustomers.length < prevLen;
  },
};
