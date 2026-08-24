"use client"

import * as React from "react"
import {
  Supplier,
  SupplierType,
  SupplierService,
  SupplierStatus,
  Hotel,
  HotelStatus,
  HotelRoom,
  RoomStatus,
  MealPlan,
  RateStatus,
  RateSourceType,
  HotelRate,
  RateSheet,
  RateSheetStatus,
  Vehicle,
  VehicleType,
  VehicleStatus,
  VehiclePricingType,
  VehicleRate,
  Activity,
  ActivityCategory,
  ActivityStatus,
  ActivityPricingType,
  ActivityRate,
  TripHotel,
  TripVehicle,
  TripActivity,
  RateSnapshot,
} from "@/types"

// ═════════════════════════════════════════════════════════════════════
// INITIAL DEMO DATA (Rich Indian Travel Inventory)
// ═════════════════════════════════════════════════════════════════════

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "SUP-001",
    name: "WGH Hotels & Resorts",
    type: "Hotel Supplier",
    contactPerson: "Rajesh Kumar",
    phone: "+91 98470 12345",
    email: "contracts@wghhotels.com",
    city: "Kochi",
    website: "https://wghhotels.example.com",
    services: ["Hotel"],
    status: "Active",
    notes: "Preferred luxury hotel chain in Kerala & Goa with dynamic seasonal B2B rates.",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "SUP-002",
    name: "Kerala Travel Partners",
    type: "DMC",
    contactPerson: "Suresh Menon",
    phone: "+91 94471 23456",
    email: "b2b@keralapartners.in",
    city: "Cochin",
    website: "https://keralapartners.example.com",
    services: ["Hotel", "Vehicle", "Activity"],
    status: "Active",
    notes: "Direct ground DMC for Kerala, Munnar resorts, houseboat fleet and Alleppey adventures.",
    createdAt: "2026-07-05T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "SUP-003",
    name: "ABC Travels & Fleet",
    type: "Transport Supplier",
    contactPerson: "Amit Shah",
    phone: "+91 98200 34567",
    email: "operations@abctravels.in",
    city: "Kochi",
    website: "https://abctravels.example.com",
    services: ["Vehicle"],
    status: "Active",
    notes: "Specialized in Force Urbania, Innova Crysta and tempo travellers across South India.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "SUP-004",
    name: "Kerala Adventures & Experiences",
    type: "Activity Supplier",
    contactPerson: "Nikhil Varma",
    phone: "+91 97450 45678",
    email: "booking@keralaadventures.com",
    city: "Alleppey",
    website: "https://keralaadventures.example.com",
    services: ["Activity"],
    status: "Active",
    notes: "Operates kayaking, bamboo rafting, spice plantation walks and Kathakali show tickets.",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "SUP-005",
    name: "Royal Heritage Hospitality",
    type: "Hotel Supplier",
    contactPerson: "Manvendra Singh",
    phone: "+91 98290 56789",
    email: "sales@royalheritage.in",
    city: "Jaipur",
    website: "https://royalheritage.example.com",
    services: ["Hotel"],
    status: "Active",
    notes: "Heritage palaces and boutique havelis in Jaipur, Udaipur and Jodhpur.",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "SUP-006",
    name: "Kashmir Valley DMC",
    type: "DMC",
    contactPerson: "Farooq Ahmed",
    phone: "+91 94190 67890",
    email: "inbound@kashmirdmc.com",
    city: "Srinagar",
    website: "https://kashmirdmc.example.com",
    services: ["Hotel", "Vehicle", "Activity"],
    status: "Active",
    notes: "Deluxe houseboats on Nigeen Lake, Gulmarg transfers, and Gondola pass coordination.",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "SUP-007",
    name: "Goa Coastal Partners",
    type: "Travel Partner",
    contactPerson: "Denzil D'Souza",
    phone: "+91 98221 78901",
    email: "partner@goacoastal.in",
    city: "Panaji",
    website: "https://goacoastal.example.com",
    services: ["Hotel", "Vehicle", "Activity"],
    status: "Active",
    notes: "Beachside resorts, private yachts, self-drive rentals and water sports in North/South Goa.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "SUP-008",
    name: "Himalayan Cabs & Treks",
    type: "Transport Supplier",
    contactPerson: "Rohan Sharma",
    phone: "+91 98160 89012",
    email: "cabs@himalayanwheels.in",
    city: "Shimla",
    website: "https://himalayanwheels.example.com",
    services: ["Vehicle", "Activity"],
    status: "Active",
    notes: "4x4 mountain vehicles for Spiti/Manali and adventure camping in Himachal.",
    createdAt: "2026-07-25T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "SUP-009",
    name: "Andaman Island Holidays",
    type: "DMC",
    contactPerson: "Ananya Roy",
    phone: "+91 94342 90123",
    email: "bookings@andamanislands.com",
    city: "Port Blair",
    website: "https://andamanislands.example.com",
    services: ["Hotel", "Vehicle", "Activity"],
    status: "Active",
    notes: "Havelock & Neil Island beach resorts, scuba centers and Makruzz ferry bookings.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "SUP-010",
    name: "Uttarakhand Hill Stays",
    type: "Hotel Supplier",
    contactPerson: "Deepak Joshi",
    phone: "+91 98370 01234",
    email: "res@uttarakhandstays.com",
    city: "Dehradun",
    website: "https://uttarakhandstays.example.com",
    services: ["Hotel"],
    status: "Inactive",
    notes: "Contract under renegotiation for Rishikesh river camps and Mussoorie boutique hotels.",
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
]

export const INITIAL_HOTELS: Hotel[] = [
  {
    id: "HTL-001",
    supplierId: "SUP-001",
    name: "Parakkat Nature Resort",
    destination: "Munnar",
    area: "Pallivasal",
    address: "Chithirapuram P.O, Munnar, Kerala 685565",
    starCategory: 4,
    contactPerson: "Mathew Varghese",
    phone: "+91 4865 263000",
    email: "munnar@parakkatresorts.com",
    website: "https://parakkatresorts.example.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Free WiFi", "Swimming Pool", "Spa & Wellness", "Mountain View", "Multi-cuisine Restaurant", "Kids Play Area"],
    description: "Nestled in the lush hills of Munnar, offering panoramic plantation views and luxury villa rooms.",
    status: "Active",
    notes: "B2B rate includes complimentary plantation walk and high tea.",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "HTL-002",
    supplierId: "SUP-002",
    name: "Munnar Valley Retreat",
    destination: "Munnar",
    area: "Anaviratty",
    address: "Valley View Road, Munnar, Kerala 685561",
    starCategory: 4,
    contactPerson: "Jibin Thomas",
    phone: "+91 4865 274100",
    email: "reservations@munnarvalley.com",
    website: "https://munnarvalley.example.com",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    amenities: ["Free WiFi", "Campfire", "Restaurant", "Balcony Views", "Room Service"],
    description: "Quiet hideaway near tea estates, famous for sunset views and personalized Kerala cuisine.",
    status: "Active",
    notes: "Popular with honeymoon couples and small families.",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
  },
  {
    id: "HTL-003",
    supplierId: "SUP-002",
    name: "Kerala Backwater Lake Resort",
    destination: "Alleppey",
    area: "Punnamada",
    address: "Punnamada Jetty Road, Alleppey, Kerala 688006",
    starCategory: 5,
    contactPerson: "Vinod Nair",
    phone: "+91 477 2244555",
    email: "frontdesk@keralalakeresort.com",
    website: "https://keralalakeresort.example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    amenities: ["Infinity Pool", "Ayurvedic Spa", "Houseboat Dock", "Waterfront Dining", "Fitness Center", "Free WiFi"],
    description: "Luxury 5-star backwater paradise with lake-facing cottages and private cruise boats.",
    status: "Active",
    notes: "Mandatory gala dinner supplements applicable on Dec 24 and Dec 31.",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "HTL-004",
    supplierId: "SUP-001",
    name: "Coastal Varkala Cliff Resort",
    destination: "Varkala",
    area: "North Cliff",
    address: "North Cliff Helipad Road, Varkala, Kerala 695141",
    starCategory: 3,
    contactPerson: "Arun Das",
    phone: "+91 470 2601234",
    email: "stay@varkalacliff.com",
    website: "https://varkalacliff.example.com",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    amenities: ["Ocean View", "Yoga Deck", "Cafe", "Free WiFi", "Airport Transfer"],
    description: "Prime cliff-top location overlooking the Arabian Sea, steps from beach stairs.",
    status: "Active",
    notes: "Direct supplier contract via WGH.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "HTL-005",
    supplierId: "SUP-007",
    name: "Goa Beachside Haven",
    destination: "Goa",
    area: "Candolim",
    address: "Fort Aguada Road, Candolim, Goa 403515",
    starCategory: 4,
    contactPerson: "Savio Fernandes",
    phone: "+91 832 2489000",
    email: "bookings@goahaven.com",
    website: "https://goahaven.example.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Private Beach Access", "Swimming Pool", "Beach Bar", "Free Breakfast", "Spa"],
    description: "Vibrant coastal resort 2 minutes walk from Candolim beach with live weekend music.",
    status: "Active",
    notes: "Minimum 3-night stay required during peak season (Dec 20 - Jan 05).",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "HTL-006",
    supplierId: "SUP-005",
    name: "Jaipur Royal Palace Haveli",
    destination: "Jaipur",
    area: "Bani Park",
    address: "Madho Singh Road, Bani Park, Jaipur, Rajasthan 302016",
    starCategory: 4,
    contactPerson: "Raghavendra Rathore",
    phone: "+91 141 2205555",
    email: "heritage@jaipurroyal.in",
    website: "https://jaipurroyal.example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    amenities: ["Courtyard Dining", "Folk Dance Shows", "Swimming Pool", "Valet Parking", "Free WiFi"],
    description: "Authentic Rajasthani haveli with carved archways, antique decor and royal hospitality.",
    status: "Active",
    notes: "Special group rates for weddings and corporate incentive groups.",
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "HTL-007",
    supplierId: "SUP-006",
    name: "Royal Heritage Houseboats",
    destination: "Srinagar",
    area: "Nigeen Lake",
    address: "West Bank, Nigeen Lake, Srinagar, J&K 190006",
    starCategory: 4,
    contactPerson: "Bashir Ahmed",
    phone: "+91 194 2421234",
    email: "res@royalhouseboats.com",
    website: "https://royalhouseboats.example.com",
    checkInTime: "12:00",
    checkOutTime: "10:00",
    amenities: ["Shikara Transfer", "Traditional Wazwan Meals", "Heating / Heated Blankets", "Cedar Wood Carvings", "Sun Deck"],
    description: "Handcrafted deodar wood houseboats anchored on peaceful Nigeen Lake with snow-capped mountain views.",
    status: "Active",
    notes: "Includes 1 hour complimentary Shikara sunset cruise per booking.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "HTL-008",
    supplierId: "SUP-006",
    name: "Gulmarg Pine Alpine Resort",
    destination: "Gulmarg",
    area: "Gondola Base",
    address: "Circular Road, Gulmarg, J&K 193403",
    starCategory: 4,
    contactPerson: "Tariq Lone",
    phone: "+91 1954 254500",
    email: "stay@gulmargpine.com",
    website: "https://gulmargpine.example.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Central Heating", "Ski Equipment Rental", "Restaurant", "Gondola View", "Hot Water 24/7"],
    description: "Ski-in ski-out luxury mountain chalet located 500m from the Gulmarg Gondola Phase 1.",
    status: "Active",
    notes: "Heavy snowfall zone: 4x4 chains vehicle needed for access in Jan-Feb.",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "HTL-009",
    supplierId: "SUP-008",
    name: "Manali Mountain Lodge & Spa",
    destination: "Manali",
    area: "Old Manali",
    address: "Log Huts Area, Manali, Himachal Pradesh 175131",
    starCategory: 4,
    contactPerson: "Sanjay Thakur",
    phone: "+91 1902 252300",
    email: "info@manalimountainlodge.com",
    website: "https://manalimountainlodge.example.com",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    amenities: ["Apple Orchard View", "Bonfire Area", "Steam & Sauna", "Games Room", "Free WiFi"],
    description: "Set in lush apple orchards with views of Rohtang peaks and pine forests.",
    status: "Active",
    notes: "Extra heater charges waived for B2B contract bookings.",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
  },
  {
    id: "HTL-010",
    supplierId: "SUP-005",
    name: "Udaipur Lakeview Boutique Palace",
    destination: "Udaipur",
    area: "Lake Pichola",
    address: "Lal Ghat, Udaipur, Rajasthan 313001",
    starCategory: 5,
    contactPerson: "Mahesh Chundawat",
    phone: "+91 294 2420000",
    email: "palace@udaipurlakeview.com",
    website: "https://udaipurlakeview.example.com",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    amenities: ["Rooftop Lake Restaurant", "Infinity Pool", "Cultural Evenings", "Spa", "Boat Transfers"],
    description: "Palatial 5-star hotel facing Lake Pichola and City Palace with premier sunset views.",
    status: "Active",
    notes: "Direct booking with GM concession available for high-tier VIP clients.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
  },
  {
    id: "HTL-011",
    supplierId: "SUP-009",
    name: "Havelock Coral Beach Resort",
    destination: "Andaman",
    area: "Radhanagar Beach",
    address: "Beach No. 7, Havelock Island, Andaman 744211",
    starCategory: 4,
    contactPerson: "Praveen Halder",
    phone: "+91 3192 282400",
    email: "havelock@coralbeach.in",
    website: "https://coralbeach.example.com",
    checkInTime: "12:00",
    checkOutTime: "09:00",
    amenities: ["Private White Sand Beach", "Diving School", "Beachfront Restaurant", "Eco Cottages", "Bar"],
    description: "Eco-luxury wooden cottages under tropical canopy 100 meters from world famous Radhanagar Beach.",
    status: "Active",
    notes: "Ferry arrival/departure transfers must be booked 48 hours in advance.",
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
  },
  {
    id: "HTL-012",
    supplierId: "SUP-010",
    name: "Ganga Riverside Retreat & Spa",
    destination: "Rishikesh",
    area: "Tapovan",
    address: "Badrinath Road, Tapovan, Rishikesh, Uttarakhand 249192",
    starCategory: 4,
    contactPerson: "Alok Semwal",
    phone: "+91 135 2441122",
    email: "res@gangaretreat.in",
    website: "https://gangaretreat.example.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Ganga River Access", "Yoga Hall", "Vegetarian Organic Cafe", "Ayurveda Spa", "WiFi"],
    description: "Holistic wellness retreat right on the bank of the holy Ganges with daily Ganga Aarti.",
    status: "Inactive",
    notes: "Under seasonal monsoon renovation; re-opening Oct 2026.",
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "HTL-013",
    supplierId: "SUP-001",
    name: "Kochi Port Heritage Hotel",
    destination: "Kochi",
    area: "Fort Kochi",
    address: "Tower Road, Fort Kochi, Kerala 682001",
    starCategory: 4,
    contactPerson: "George Mathew",
    phone: "+91 484 2217700",
    email: "stay@kochiheritage.com",
    website: "https://kochiheritage.example.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Swimming Pool", "Seafood Restaurant", "Colonial Architecture", "Free WiFi", "Art Gallery"],
    description: "Restored Dutch colonial mansion walking distance from Chinese fishing nets and spice markets.",
    status: "Active",
    notes: "Transit hotel for airport arrivals before hill station drive.",
    createdAt: "2026-08-07T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "HTL-014",
    supplierId: "SUP-007",
    name: "South Goa Palm Palms Resort",
    destination: "Goa",
    area: "Benaulim",
    address: "Benaulim Beach Road, Salcete, Goa 403716",
    starCategory: 4,
    contactPerson: "Maria Coutinho",
    phone: "+91 832 2771234",
    email: "res@palmpalmsgoa.com",
    website: "https://palmpalmsgoa.example.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    amenities: ["Lush Palm Gardens", "2 Swimming Pools", "Tennis Court", "Kids Club", "Beach Shuttle"],
    description: "Sprawling family resort amidst coconut groves, 500m from peaceful Benaulim beach.",
    status: "Active",
    notes: "Excellent for family groups looking for quiet South Goa stay.",
    createdAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
  },
  {
    id: "HTL-015",
    supplierId: "SUP-005",
    name: "Jodhpur Desert Dune Camp",
    destination: "Jodhpur",
    area: "Osian",
    address: "Khetasar Sand Dunes, Osian, Jodhpur, Rajasthan 342303",
    starCategory: 3,
    contactPerson: "Kalyan Singh",
    phone: "+91 2922 274000",
    email: "desertcamp@jodhpurdunes.in",
    website: "https://jodhpurdunes.example.com",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    amenities: ["Swiss Luxury Tents", "Camel Safari", "Folk Music & Bonfire", "Traditional Buffet Dinner"],
    description: "Swiss tented camp in the Thar desert with starlit dinner and sunset camel rides.",
    status: "Active",
    notes: "Operates exclusively from October through March.",
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
]

export const INITIAL_HOTEL_ROOMS: HotelRoom[] = [
  // Parakkat (HTL-001)
  { id: "RM-001", hotelId: "HTL-001", name: "Premium Valley View Room", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Private balcony facing the valley mist with tea maker and bathtub.", status: "Active", createdAt: "2026-07-02T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  { id: "RM-002", hotelId: "HTL-001", name: "Executive Suite", maxAdults: 3, maxChildren: 2, bedType: "King Bed + Sofa Bed", description: "Spacious living area, jacuzzis and unobstructed panoramic views.", status: "Active", createdAt: "2026-07-02T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  { id: "RM-003", hotelId: "HTL-001", name: "Deluxe Plantation Room", maxAdults: 2, maxChildren: 1, bedType: "Twin Beds", description: "Ground level room with direct garden access.", status: "Active", createdAt: "2026-07-02T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Munnar Valley Retreat (HTL-002)
  { id: "RM-004", hotelId: "HTL-002", name: "Premium Room", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Comfortable wooden floored room with private tea-garden sit-out.", status: "Active", createdAt: "2026-07-06T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  { id: "RM-005", hotelId: "HTL-002", name: "Family Valley Suite", maxAdults: 4, maxChildren: 2, bedType: "2 Queen Beds", description: "Interconnected 2-bedroom suite ideal for families.", status: "Active", createdAt: "2026-07-06T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Kerala Backwater Lake Resort (HTL-003)
  { id: "RM-006", hotelId: "HTL-003", name: "Lake View Cottage", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Traditional terracotta tiled cottage with open-to-sky shower.", status: "Active", createdAt: "2026-07-08T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  { id: "RM-007", hotelId: "HTL-003", name: "Private Pool Villa", maxAdults: 2, maxChildren: 2, bedType: "King Bed", description: "Exclusive villa with private plunge pool overlooking the backwaters.", status: "Active", createdAt: "2026-07-08T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Coastal Varkala (HTL-004)
  { id: "RM-008", hotelId: "HTL-004", name: "Cliff Ocean View Room", maxAdults: 2, maxChildren: 1, bedType: "Queen Bed", description: "Sea breeze balcony with sunset views.", status: "Active", createdAt: "2026-07-10T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Goa Beachside (HTL-005)
  { id: "RM-009", hotelId: "HTL-005", name: "Deluxe Pool Facing Room", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Modern decor with patio opening to the central pool.", status: "Active", createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  { id: "RM-010", hotelId: "HTL-005", name: "Beachfront Villa Suite", maxAdults: 3, maxChildren: 2, bedType: "King Bed + Sofa Bed", description: "Direct beach path access with outdoor sun loungers.", status: "Active", createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Jaipur Royal Palace (HTL-006)
  { id: "RM-011", hotelId: "HTL-006", name: "Heritage Deluxe Room", maxAdults: 2, maxChildren: 1, bedType: "Four Poster King Bed", description: "Traditional frescoes, jharokha window seating and brass fittings.", status: "Active", createdAt: "2026-07-18T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  { id: "RM-012", hotelId: "HTL-006", name: "Maharaja Royal Suite", maxAdults: 3, maxChildren: 2, bedType: "Royal King Bed", description: "Antique stained glass, royal sitting hall and marble jacuzzi.", status: "Active", createdAt: "2026-07-18T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Srinagar Houseboats (HTL-007)
  { id: "RM-013", hotelId: "HTL-007", name: "Super Deluxe Cedar Bedroom", maxAdults: 2, maxChildren: 1, bedType: "Double Bed", description: "Carved walnut wood furniture, Kashmiri carpets and heating.", status: "Active", createdAt: "2026-07-22T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Gulmarg Pine (HTL-008)
  { id: "RM-014", hotelId: "HTL-008", name: "Alpine Luxury Chalet", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Heated timber floor with direct views of Mount Apharwat.", status: "Active", createdAt: "2026-07-24T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Manali Lodge (HTL-009)
  { id: "RM-015", hotelId: "HTL-009", name: "Orchard Deluxe Room", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Wooden cottage room with fireplace and private veranda.", status: "Active", createdAt: "2026-07-28T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Udaipur Lakeview (HTL-010)
  { id: "RM-016", hotelId: "HTL-010", name: "Lake Palace View Suite", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Direct view of Jag Mandir and Lake Palace from bedroom window.", status: "Active", createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Havelock Coral (HTL-011)
  { id: "RM-017", hotelId: "HTL-011", name: "Lagoon Wooden Cottage", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "Air-conditioned teak wood villa surrounded by betel nut trees.", status: "Active", createdAt: "2026-08-03T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Rishikesh Ganga (HTL-012)
  { id: "RM-018", hotelId: "HTL-012", name: "Ganga View Deluxe", maxAdults: 2, maxChildren: 1, bedType: "Queen Bed", description: "Hear the gentle sound of the river Ganga from your balcony.", status: "Inactive", createdAt: "2026-08-05T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Kochi Port (HTL-013)
  { id: "RM-019", hotelId: "HTL-013", name: "Colonial Suite", maxAdults: 2, maxChildren: 1, bedType: "King Bed", description: "High ceilings, period furniture and wooden floors.", status: "Active", createdAt: "2026-08-07T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // South Goa Palm (HTL-014)
  { id: "RM-020", hotelId: "HTL-014", name: "Garden Villa Room", maxAdults: 3, maxChildren: 1, bedType: "King Bed", description: "Private lawn view with quiet tropical bird surroundings.", status: "Active", createdAt: "2026-08-08T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },

  // Jodhpur Desert (HTL-015)
  { id: "RM-021", hotelId: "HTL-015", name: "Luxury Swiss Tent", maxAdults: 2, maxChildren: 2, bedType: "Double Bed", description: "Weather-proof tent with attached tiled bathroom and running hot water.", status: "Active", createdAt: "2026-08-10T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
]

export const INITIAL_RATE_SHEETS: RateSheet[] = [
  {
    id: "RS-001",
    supplierId: "SUP-001",
    name: "2026–27 WGH Annual Contract",
    description: "Annual contracted B2B net rates for Kerala & Goa properties.",
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Excel",
    fileName: "WGH_Contract_Rates_2026_27.xlsx",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "RS-002",
    supplierId: "SUP-002",
    name: "Kerala DMC Seasonal Tariff 2026",
    description: "Munnar & Alleppey partner package rates with breakfast and dinner included.",
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "RS-003",
    supplierId: "SUP-005",
    name: "Rajasthan Heritage Tariff 2026–27",
    description: "Winter season contracted rates for Havelis and Desert Camps.",
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "CSV",
    fileName: "Rajasthan_Heritage_2026.csv",
    createdAt: "2026-07-16T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "RS-004",
    supplierId: "SUP-006",
    name: "Kashmir Valley Winter 2026",
    description: "Srinagar houseboats & Gulmarg snow chalets.",
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "RS-005",
    supplierId: "SUP-001",
    name: "2026 Monsoon Special Promo",
    description: "Discounted rates for off-season monsoon travel.",
    validFrom: "2026-06-01",
    validTo: "2026-09-30",
    status: "Active",
    sourceType: "Excel",
    fileName: "WGH_Monsoon_Promo_2026.xlsx",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
]

export const INITIAL_HOTEL_RATES: HotelRate[] = [
  // Parakkat (HTL-001 / RM-001)
  {
    id: "HR-001",
    hotelId: "HTL-001",
    roomId: "RM-001",
    rateSheetId: "RS-001",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 5500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 1500,
    childRate: 800,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Excel",
    notes: "Contract rate from WGH. Includes breakfast & plantation tour.",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "HR-002",
    hotelId: "HTL-001",
    roomId: "RM-001",
    rateSheetId: "RS-001",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 7500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 2200,
    childRate: 1200,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Excel",
    notes: "Breakfast + Dinner buffet included.",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "HR-003",
    hotelId: "HTL-001",
    roomId: "RM-002",
    rateSheetId: "RS-001",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 9000,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 2000,
    childRate: 1000,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Excel",
    notes: "Executive suite special B2B net.",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "HR-004",
    hotelId: "HTL-001",
    roomId: "RM-003",
    rateSheetId: "RS-005",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 4200,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 1200,
    childRate: 600,
    validFrom: "2026-06-01",
    validTo: "2026-09-30",
    status: "Active",
    sourceType: "Excel",
    notes: "Monsoon off-season promo rate.",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },

  // Munnar Valley Retreat (HTL-002 / RM-004)
  {
    id: "HR-005",
    hotelId: "HTL-002",
    roomId: "RM-004",
    rateSheetId: "RS-002",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 5500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 1400,
    childRate: 700,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    notes: "Direct Kerala Travel Partners contract rate.",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "HR-006",
    hotelId: "HTL-002",
    roomId: "RM-004",
    rateSheetId: "RS-002",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 7200,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 2000,
    childRate: 1000,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "HR-007",
    hotelId: "HTL-002",
    roomId: "RM-005",
    rateSheetId: "RS-002",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 9800,
    occupancyAdults: 4,
    occupancyChildren: 2,
    extraAdultRate: 1800,
    childRate: 900,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },

  // Alleppey Lake Resort (HTL-003 / RM-006)
  {
    id: "HR-008",
    hotelId: "HTL-003",
    roomId: "RM-006",
    rateSheetId: "RS-002",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 8500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 2500,
    childRate: 1200,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    sourceType: "Manual",
    notes: "Lake view cottage with breakfast.",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "HR-009",
    hotelId: "HTL-003",
    roomId: "RM-006",
    rateSheetId: "RS-002",
    mealPlan: "APAI",
    currency: "INR",
    baseRate: 11500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 3200,
    childRate: 1600,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    sourceType: "Manual",
    notes: "Full board all meals included.",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "HR-010",
    hotelId: "HTL-003",
    roomId: "RM-007",
    rateSheetId: "RS-002",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 16000,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 3500,
    childRate: 1800,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    notes: "Private plunge pool villa.",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },

  // Goa Beachside (HTL-005 / RM-009)
  {
    id: "HR-011",
    hotelId: "HTL-005",
    roomId: "RM-009",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 6000,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 1800,
    childRate: 900,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "HR-012",
    hotelId: "HTL-005",
    roomId: "RM-010",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 10500,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 2500,
    childRate: 1200,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },

  // Jaipur Royal Palace (HTL-006 / RM-011)
  {
    id: "HR-013",
    hotelId: "HTL-006",
    roomId: "RM-011",
    rateSheetId: "RS-003",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 4800,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 1500,
    childRate: 800,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "CSV",
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "HR-014",
    hotelId: "HTL-006",
    roomId: "RM-012",
    rateSheetId: "RS-003",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 12000,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 3000,
    childRate: 1500,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "CSV",
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },

  // Srinagar Houseboats (HTL-007 / RM-013)
  {
    id: "HR-015",
    hotelId: "HTL-007",
    roomId: "RM-013",
    rateSheetId: "RS-004",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 6500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 2000,
    childRate: 1000,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "Manual",
    notes: "Kashmiri dinner and breakfast on houseboat included.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },

  // Gulmarg Pine (HTL-008 / RM-014)
  {
    id: "HR-016",
    hotelId: "HTL-008",
    roomId: "RM-014",
    rateSheetId: "RS-004",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 9500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 2800,
    childRate: 1400,
    validFrom: "2026-11-01",
    validTo: "2027-03-15",
    status: "Active",
    sourceType: "Manual",
    notes: "Peak ski winter season rate.",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },

  // Manali Lodge (HTL-009 / RM-015)
  {
    id: "HR-017",
    hotelId: "HTL-009",
    roomId: "RM-015",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 4500,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 1200,
    childRate: 600,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
  },

  // Udaipur Lakeview (HTL-010 / RM-016)
  {
    id: "HR-018",
    hotelId: "HTL-010",
    roomId: "RM-016",
    rateSheetId: "RS-003",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 14000,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 3500,
    childRate: 1800,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "CSV",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
  },

  // Havelock Coral (HTL-011 / RM-017)
  {
    id: "HR-019",
    hotelId: "HTL-011",
    roomId: "RM-017",
    mealPlan: "CPAI",
    currency: "INR",
    baseRate: 7800,
    occupancyAdults: 2,
    occupancyChildren: 0,
    extraAdultRate: 2000,
    childRate: 1000,
    validFrom: "2026-10-01",
    validTo: "2027-04-30",
    status: "Active",
    sourceType: "Manual",
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
  },

  // Jodhpur Desert Camp (HTL-015 / RM-021)
  {
    id: "HR-020",
    hotelId: "HTL-015",
    roomId: "RM-021",
    rateSheetId: "RS-003",
    mealPlan: "MAPAI",
    currency: "INR",
    baseRate: 5000,
    occupancyAdults: 2,
    occupancyChildren: 1,
    extraAdultRate: 1800,
    childRate: 900,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    sourceType: "CSV",
    notes: "Includes sunset camel safari and folk show.",
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
]

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: "VEH-001",
    supplierId: "SUP-003",
    name: "Force Urbania (17-Seater)",
    vehicleType: "Tempo Traveller",
    seatingCapacity: 17,
    luggageCapacity: 12,
    baseLocation: "Kochi",
    ac: true,
    driverIncluded: true,
    model: "2025 Luxury Cruiser",
    permitType: "All India Tourist Permit",
    status: "Active",
    notes: "Ultra-luxury reclining seats with individual USB chargers and ambient lighting.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VEH-002",
    supplierId: "SUP-003",
    name: "Toyota Innova Crysta",
    vehicleType: "SUV",
    seatingCapacity: 6,
    luggageCapacity: 4,
    baseLocation: "Kochi",
    ac: true,
    driverIncluded: true,
    model: "2024 Crysta GX",
    permitType: "Kerala & Tamil Nadu State Permit",
    status: "Active",
    notes: "Comfortable family vehicle for Munnar and Thekkady ghat roads.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VEH-003",
    supplierId: "SUP-002",
    name: "Toyota Etios / Dzire",
    vehicleType: "Sedan",
    seatingCapacity: 4,
    luggageCapacity: 2,
    baseLocation: "Cochin Airport",
    ac: true,
    driverIncluded: true,
    model: "2023 Executive Sedan",
    permitType: "Kerala State",
    status: "Active",
    notes: "Standard airport transfers and couple tours.",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "VEH-004",
    supplierId: "SUP-007",
    name: "Maruti Ertiga MUV",
    vehicleType: "MUV",
    seatingCapacity: 6,
    luggageCapacity: 3,
    baseLocation: "Goa (Dabolim/MOPA)",
    ac: true,
    driverIncluded: true,
    model: "2024 Hybrid",
    permitType: "Goa Tourist Permit",
    status: "Active",
    notes: "North and South Goa sightseeing and airport pickup/drop.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "VEH-005",
    supplierId: "SUP-006",
    name: "Mahindra Scorpio 4x4",
    vehicleType: "SUV",
    seatingCapacity: 6,
    luggageCapacity: 4,
    baseLocation: "Srinagar",
    ac: true,
    driverIncluded: true,
    model: "2024 Classic 4WD",
    permitType: "J&K All Route Permit",
    status: "Active",
    notes: "Essential for winter Gulmarg and Sonamarg mountain terrain.",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "VEH-006",
    supplierId: "SUP-008",
    name: "Toyota Fortuner 4x4",
    vehicleType: "Luxury",
    seatingCapacity: 7,
    luggageCapacity: 5,
    baseLocation: "Shimla / Manali",
    ac: true,
    driverIncluded: true,
    model: "2024 4x4 AT",
    permitType: "Himachal & Ladakh Special Permit",
    status: "Active",
    notes: "High ground clearance, suitable for Rohtang Pass and Atal Tunnel tours.",
    createdAt: "2026-07-25T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "VEH-007",
    supplierId: "SUP-003",
    name: "Volvo Luxury 26-Seater Coach",
    vehicleType: "Mini Bus",
    seatingCapacity: 26,
    luggageCapacity: 20,
    baseLocation: "Kochi",
    ac: true,
    driverIncluded: true,
    model: "2024 Air Suspension Coach",
    permitType: "South India Permit",
    status: "Active",
    notes: "Corporate MICE and large student travel groups.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VEH-008",
    supplierId: "SUP-009",
    name: "Havelock AC Private Van",
    vehicleType: "MUV",
    seatingCapacity: 7,
    luggageCapacity: 4,
    baseLocation: "Havelock Island",
    ac: true,
    driverIncluded: true,
    model: "2023 Tourer",
    permitType: "Andaman Local Permit",
    status: "Active",
    notes: "Radhanagar beach & Kalapathar beach day transfers.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "VEH-009",
    supplierId: "SUP-002",
    name: "Tempo Traveller 12-Seater",
    vehicleType: "Tempo Traveller",
    seatingCapacity: 12,
    luggageCapacity: 8,
    baseLocation: "Kochi",
    ac: true,
    driverIncluded: true,
    model: "2023 Deluxe",
    permitType: "All India Permit",
    status: "Active",
    notes: "Standard group vehicle for Kerala circuit.",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "VEH-010",
    supplierId: "SUP-007",
    name: "Self-Drive Thar Convertible",
    vehicleType: "Other",
    seatingCapacity: 4,
    luggageCapacity: 2,
    baseLocation: "North Goa",
    ac: true,
    driverIncluded: false,
    model: "2024 Hard Top 4x4",
    permitType: "Goa Black & Yellow",
    status: "Inactive",
    notes: "Under annual insurance renewal.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
]

export const INITIAL_VEHICLE_RATES: VehicleRate[] = [
  {
    id: "VR-001",
    vehicleId: "VEH-001",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 5500,
    includedKm: 250,
    extraKmRate: 25,
    driverAllowance: 500,
    nightHalt: 750,
    tollIncluded: false,
    parkingIncluded: false,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    notes: "Force Urbania Kerala roundtrip rate.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VR-002",
    vehicleId: "VEH-002",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 3800,
    includedKm: 200,
    extraKmRate: 18,
    driverAllowance: 400,
    nightHalt: 500,
    tollIncluded: false,
    parkingIncluded: false,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    notes: "Innova Crysta daily rate for Kerala hill stations.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VR-003",
    vehicleId: "VEH-002",
    pricingType: "PerTransfer",
    currency: "INR",
    baseRate: 2800,
    includedKm: 120,
    tollIncluded: true,
    parkingIncluded: true,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    notes: "Kochi Airport to Munnar one-way drop.",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VR-004",
    vehicleId: "VEH-003",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 2600,
    includedKm: 150,
    extraKmRate: 14,
    driverAllowance: 350,
    nightHalt: 400,
    status: "Active",
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "VR-005",
    vehicleId: "VEH-004",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 3200,
    includedKm: 100,
    extraKmRate: 16,
    driverAllowance: 300,
    status: "Active",
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "VR-006",
    vehicleId: "VEH-005",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 4500,
    includedKm: 180,
    extraKmRate: 20,
    driverAllowance: 500,
    status: "Active",
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    notes: "Scorpio 4x4 Srinagar circuit rate.",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "VR-007",
    vehicleId: "VEH-006",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 6000,
    includedKm: 200,
    extraKmRate: 28,
    driverAllowance: 600,
    status: "Active",
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    createdAt: "2026-07-25T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "VR-008",
    vehicleId: "VEH-007",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 9500,
    includedKm: 250,
    extraKmRate: 40,
    driverAllowance: 800,
    status: "Active",
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "VR-009",
    vehicleId: "VEH-008",
    pricingType: "PerTrip",
    currency: "INR",
    baseRate: 1800,
    tollIncluded: true,
    parkingIncluded: true,
    status: "Active",
    validFrom: "2026-10-01",
    validTo: "2027-04-30",
    notes: "Radhanagar beach sunset drop & return pickup.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "VR-010",
    vehicleId: "VEH-009",
    pricingType: "PerDay",
    currency: "INR",
    baseRate: 4600,
    includedKm: 200,
    extraKmRate: 22,
    driverAllowance: 450,
    status: "Active",
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
]

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: "ACT-001",
    supplierId: "SUP-004",
    name: "Mangrove Kayaking Experience",
    destination: "Alleppey",
    category: "Water Activity",
    duration: "2.5 Hours",
    description: "Guided kayak through narrow canal backwaters and untouched mangrove reserves with lifejackets and photo stops.",
    ageRestrictions: "Above 8 years",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Morning 06:30 AM sunrise slot is recommended for bird watching.",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "ACT-002",
    supplierId: "SUP-002",
    name: "Private Shikara Lake Cruise",
    destination: "Alleppey",
    category: "Sightseeing",
    duration: "3 Hours",
    description: "Motorized traditional wooden shikara boat ride along Vembanad Lake and Kuttanad paddy fields.",
    ageRestrictions: "All ages welcome",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Capacity up to 6 persons. Includes fresh coconut water on board.",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "ACT-003",
    supplierId: "SUP-002",
    name: "Kolukkumalai Sunrise 4x4 Jeep Safari",
    destination: "Munnar",
    category: "Adventure",
    duration: "4 Hours",
    description: "Early morning off-road jeep drive up to the world's highest tea organic plantation for cloud-bed sunrise.",
    ageRestrictions: "Above 5 years",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Departs Munnar at 04:30 AM. Warm jackets required.",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "ACT-004",
    supplierId: "SUP-004",
    name: "Kathakali & Kalaripayattu Live Show",
    destination: "Cochin / Munnar",
    category: "Cultural",
    duration: "2 Hours",
    description: "Evening performance of Kerala traditional martial arts and classical mudra theatre with live makeup demonstration.",
    ageRestrictions: "All ages",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Show timing: 05:00 PM to 07:00 PM daily.",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "ACT-005",
    supplierId: "SUP-006",
    name: "Gulmarg Gondola Phase 1 & 2 Tour",
    destination: "Gulmarg",
    category: "Experience",
    duration: "4 Hours",
    description: "Asia's highest cable car ride up to Kongdoori and Apharwat Peak at 13,780 ft with snow activities.",
    ageRestrictions: "All ages",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Tickets are strictly non-refundable and subject to clear weather.",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "ACT-006",
    supplierId: "SUP-006",
    name: "Dal Lake Sunset Shikara Ride",
    destination: "Srinagar",
    category: "Sightseeing",
    duration: "2 Hours",
    description: "Glide past floating gardens, lotus swamps, Char Chinar and water merchant markets.",
    ageRestrictions: "All ages",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Boarding at Ghat No. 12.",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "ACT-007",
    supplierId: "SUP-007",
    name: "Grand Island Scuba Diving & Snorkeling",
    destination: "Goa",
    category: "Water Activity",
    duration: "6 Hours",
    description: "Boat cruise to Grand Island with PADI instructor-led shallow dive, underwater video and BBQ lunch.",
    ageRestrictions: "Above 12 years",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Includes hotel pickup/drop in North Goa.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "ACT-008",
    supplierId: "SUP-007",
    name: "Dudhsagar Waterfalls Jungle Jeep Trek",
    destination: "Goa",
    category: "Adventure",
    duration: "7 Hours",
    description: "4x4 jungle drive through Bhagwan Mahavir Sanctuary, swim in the natural waterfall pool and spice plantation lunch.",
    ageRestrictions: "Above 5 years",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Lifejacket rental included.",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "ACT-009",
    supplierId: "SUP-005",
    name: "Amber Fort Heritage Guided Walk",
    destination: "Jaipur",
    category: "Cultural",
    duration: "3 Hours",
    description: "Expert historian tour of Sheesh Mahal, Diwan-e-Aam, secret underground tunnels and elephant gates.",
    ageRestrictions: "All ages",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Entry monument tickets included.",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "ACT-010",
    supplierId: "SUP-005",
    name: "Osian Sunset Camel & Dune Safari",
    destination: "Jodhpur",
    category: "Adventure",
    duration: "3 Hours",
    description: "Ride atop gentle camels into the golden sands of Osian, watch the desert sunset, followed by tea on the dunes.",
    ageRestrictions: "All ages",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Best paired with dinner at desert camp.",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "ACT-011",
    supplierId: "SUP-009",
    name: "Elephant Beach Snorkeling & Sea Walk",
    destination: "Andaman",
    category: "Water Activity",
    duration: "4 Hours",
    description: "Speedboat ride to Elephant Beach with underwater helmet Sea Walk along live coral reefs.",
    ageRestrictions: "Above 10 years",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Certified dive master accompanying throughout.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "ACT-012",
    supplierId: "SUP-008",
    name: "Solang Valley Paragliding Flight",
    destination: "Manali",
    category: "Adventure",
    duration: "1.5 Hours",
    description: "Tandem paragliding jump with experienced pilot over Solang pine valley with HD GoPro recording.",
    ageRestrictions: "Weight: 35kg - 90kg",
    operatingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    status: "Active",
    notes: "Weather permitting.",
    createdAt: "2026-07-25T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
]

export const INITIAL_ACTIVITY_RATES: ActivityRate[] = [
  {
    id: "AR-001",
    activityId: "ACT-001",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 1200,
    childRate: 800,
    validFrom: "2026-08-01",
    validTo: "2026-12-31",
    status: "Active",
    notes: "Mangrove Kayaking net B2B tariff.",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "AR-002",
    activityId: "ACT-002",
    pricingType: "PerVehicle",
    currency: "INR",
    bookingRate: 2200,
    validFrom: "2026-08-01",
    validTo: "2027-04-30",
    status: "Active",
    notes: "3-Hour private Shikara boat booking (up to 6 pax).",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "AR-003",
    activityId: "ACT-003",
    pricingType: "PerVehicle",
    currency: "INR",
    bookingRate: 3500,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    notes: "Private 4x4 Jeep for Kolukkumalai (up to 6 pax).",
    createdAt: "2026-07-06T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "AR-004",
    activityId: "ACT-004",
    pricingType: "PerAdult",
    currency: "INR",
    adultRate: 400,
    childRate: 200,
    validFrom: "2026-08-01",
    validTo: "2027-03-31",
    status: "Active",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "AR-005",
    activityId: "ACT-005",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 2150,
    childRate: 2150,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    notes: "Both phases ticket bundled with guide support.",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "AR-006",
    activityId: "ACT-006",
    pricingType: "PerVehicle",
    currency: "INR",
    bookingRate: 1200,
    validFrom: "2026-09-01",
    validTo: "2027-03-31",
    status: "Active",
    notes: "Private Shikara for Dal Lake sunset (up to 4 pax).",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "AR-007",
    activityId: "ACT-007",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 2800,
    childRate: 1500,
    validFrom: "2026-10-01",
    validTo: "2027-04-30",
    status: "Active",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "AR-008",
    activityId: "ACT-008",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 2200,
    childRate: 1400,
    validFrom: "2026-10-01",
    validTo: "2027-04-30",
    status: "Active",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    id: "AR-009",
    activityId: "ACT-009",
    pricingType: "PerGroup",
    currency: "INR",
    groupRate: 1800,
    validFrom: "2026-09-01",
    validTo: "2027-03-31",
    status: "Active",
    notes: "Private certified guide for up to 8 persons.",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "AR-010",
    activityId: "ACT-010",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 950,
    childRate: 500,
    validFrom: "2026-10-01",
    validTo: "2027-03-31",
    status: "Active",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "AR-011",
    activityId: "ACT-011",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 3500,
    childRate: 3500,
    validFrom: "2026-10-01",
    validTo: "2027-04-30",
    status: "Active",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "AR-012",
    activityId: "ACT-012",
    pricingType: "PerPerson",
    currency: "INR",
    adultRate: 2500,
    validFrom: "2026-09-01",
    validTo: "2027-04-30",
    status: "Active",
    createdAt: "2026-07-25T10:00:00.000Z",
    updatedAt: "2026-08-14T10:00:00.000Z",
  },
]

// ─── Pre-linked Services for Trips ────────────────────────────────────
// TRP-001 (Kerala Family Holiday)
export const INITIAL_TRIP_HOTELS: TripHotel[] = [
  {
    id: "TH-001",
    tripId: "TRP-001",
    hotelId: "HTL-002",
    roomId: "RM-004",
    rateId: "HR-005",
    checkIn: "2026-09-01",
    checkOut: "2026-09-04",
    rooms: 2,
    adults: 4,
    children: 2,
    notes: "2 rooms on 1st floor requested. Connecting if possible.",
    rateSnapshot: {
      name: "Munnar Valley Retreat",
      roomName: "Premium Room",
      mealPlan: "CPAI",
      supplierName: "Kerala Travel Partners",
      supplierId: "SUP-002",
      baseRate: 5500,
      currency: "INR",
      rateType: "Per Room / Night",
      validity: "01 Oct 2026 – 31 Mar 2027",
      sourceType: "Manual",
    },
    createdAt: "2026-08-21T12:00:00.000Z",
  },
  {
    id: "TH-002",
    tripId: "TRP-001",
    hotelId: "HTL-003",
    roomId: "RM-006",
    rateId: "HR-008",
    checkIn: "2026-09-04",
    checkOut: "2026-09-07",
    rooms: 2,
    adults: 4,
    children: 2,
    notes: "Lake view cottages near pool.",
    rateSnapshot: {
      name: "Kerala Backwater Lake Resort",
      roomName: "Lake View Cottage",
      mealPlan: "CPAI",
      supplierName: "Kerala Travel Partners",
      supplierId: "SUP-002",
      baseRate: 8500,
      currency: "INR",
      rateType: "Per Room / Night",
      validity: "01 Sep 2026 – 30 Apr 2027",
      sourceType: "Manual",
    },
    createdAt: "2026-08-21T12:05:00.000Z",
  },
]

export const INITIAL_TRIP_VEHICLES: TripVehicle[] = [
  {
    id: "TV-001",
    tripId: "TRP-001",
    vehicleId: "VEH-001",
    rateId: "VR-001",
    startDate: "2026-09-01",
    endDate: "2026-09-07",
    notes: "Full circuit Kochi – Munnar – Alleppey – Kochi drop.",
    rateSnapshot: {
      name: "Force Urbania (17-Seater)",
      vehicleType: "Tempo Traveller",
      supplierName: "ABC Travels & Fleet",
      supplierId: "SUP-003",
      baseRate: 5500,
      currency: "INR",
      rateType: "Per Day (250 KM incl)",
      validity: "01 Oct 2026 – 31 Mar 2027",
      details: "Driver included, AC luxury cruiser",
    },
    createdAt: "2026-08-21T12:10:00.000Z",
  },
]

export const INITIAL_TRIP_ACTIVITIES: TripActivity[] = [
  {
    id: "TA-001",
    tripId: "TRP-001",
    activityId: "ACT-001",
    rateId: "AR-001",
    date: "2026-09-05",
    adults: 4,
    children: 2,
    notes: "Early morning sunrise kayaking slot booked.",
    rateSnapshot: {
      name: "Mangrove Kayaking Experience",
      supplierName: "Kerala Adventures & Experiences",
      supplierId: "SUP-004",
      baseRate: 1200,
      currency: "INR",
      rateType: "Per Person (Adult: ₹1,200 / Child: ₹800)",
      validity: "01 Aug 2026 – 31 Dec 2026",
    },
    createdAt: "2026-08-21T12:15:00.000Z",
  },
  {
    id: "TA-002",
    tripId: "TRP-001",
    activityId: "ACT-004",
    rateId: "AR-004",
    date: "2026-09-02",
    adults: 4,
    children: 2,
    notes: "Front row seating requested.",
    rateSnapshot: {
      name: "Kathakali & Kalaripayattu Live Show",
      supplierName: "Kerala Adventures & Experiences",
      supplierId: "SUP-004",
      baseRate: 400,
      currency: "INR",
      rateType: "Per Person (Adult: ₹400 / Child: ₹200)",
    },
    createdAt: "2026-08-21T12:18:00.000Z",
  },
]

// ═════════════════════════════════════════════════════════════════════
// CONTEXT INTERFACE
// ═════════════════════════════════════════════════════════════════════

interface InventoryContextType {
  suppliers: Supplier[]
  hotels: Hotel[]
  hotelRooms: HotelRoom[]
  hotelRates: HotelRate[]
  rateSheets: RateSheet[]
  vehicles: Vehicle[]
  vehicleRates: VehicleRate[]
  activities: Activity[]
  activityRates: ActivityRate[]
  tripHotels: TripHotel[]
  tripVehicles: TripVehicle[]
  tripActivities: TripActivity[]

  // Supplier Actions
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => Supplier
  updateSupplier: (id: string, updates: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void

  // Hotel Actions
  addHotel: (hotel: Omit<Hotel, "id" | "createdAt" | "updatedAt">) => Hotel
  updateHotel: (id: string, updates: Partial<Hotel>) => void
  deleteHotel: (id: string) => void

  // Hotel Room Actions
  addHotelRoom: (room: Omit<HotelRoom, "id" | "createdAt" | "updatedAt">) => HotelRoom
  updateHotelRoom: (id: string, updates: Partial<HotelRoom>) => void
  deleteHotelRoom: (id: string) => void

  // Hotel Rate Actions
  addHotelRate: (rate: Omit<HotelRate, "id" | "createdAt" | "updatedAt">) => HotelRate
  updateHotelRate: (id: string, updates: Partial<HotelRate>) => void
  deleteHotelRate: (id: string) => void
  importHotelRates: (rates: Omit<HotelRate, "id" | "createdAt" | "updatedAt">[]) => number

  // Rate Sheet Actions
  addRateSheet: (sheet: Omit<RateSheet, "id" | "createdAt" | "updatedAt">) => RateSheet
  updateRateSheet: (id: string, updates: Partial<RateSheet>) => void
  deleteRateSheet: (id: string) => void

  // Vehicle Actions
  addVehicle: (vehicle: Omit<Vehicle, "id" | "createdAt" | "updatedAt">) => Vehicle
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void
  deleteVehicle: (id: string) => void

  // Vehicle Rate Actions
  addVehicleRate: (rate: Omit<VehicleRate, "id" | "createdAt" | "updatedAt">) => VehicleRate
  updateVehicleRate: (id: string, updates: Partial<VehicleRate>) => void
  deleteVehicleRate: (id: string) => void

  // Activity Actions
  addActivity: (activity: Omit<Activity, "id" | "createdAt" | "updatedAt">) => Activity
  updateActivity: (id: string, updates: Partial<Activity>) => void
  deleteActivity: (id: string) => void

  // Activity Rate Actions
  addActivityRate: (rate: Omit<ActivityRate, "id" | "createdAt" | "updatedAt">) => ActivityRate
  updateActivityRate: (id: string, updates: Partial<ActivityRate>) => void
  deleteActivityRate: (id: string) => void

  // Trip Service Actions
  addTripHotel: (tripHotel: Omit<TripHotel, "id" | "createdAt">) => TripHotel
  updateTripHotel: (id: string, updates: Partial<TripHotel>) => void
  removeTripHotel: (id: string) => void

  addTripVehicle: (tripVehicle: Omit<TripVehicle, "id" | "createdAt">) => TripVehicle
  updateTripVehicle: (id: string, updates: Partial<TripVehicle>) => void
  removeTripVehicle: (id: string) => void

  addTripActivity: (tripActivity: Omit<TripActivity, "id" | "createdAt">) => TripActivity
  updateTripActivity: (id: string, updates: Partial<TripActivity>) => void
  removeTripActivity: (id: string) => void
}

const InventoryContext = React.createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(INITIAL_SUPPLIERS)
  const [hotels, setHotels] = React.useState<Hotel[]>(INITIAL_HOTELS)
  const [hotelRooms, setHotelRooms] = React.useState<HotelRoom[]>(INITIAL_HOTEL_ROOMS)
  const [hotelRates, setHotelRates] = React.useState<HotelRate[]>(INITIAL_HOTEL_RATES)
  const [rateSheets, setRateSheets] = React.useState<RateSheet[]>(INITIAL_RATE_SHEETS)
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(INITIAL_VEHICLES)
  const [vehicleRates, setVehicleRates] = React.useState<VehicleRate[]>(INITIAL_VEHICLE_RATES)
  const [activities, setActivities] = React.useState<Activity[]>(INITIAL_ACTIVITIES)
  const [activityRates, setActivityRates] = React.useState<ActivityRate[]>(INITIAL_ACTIVITY_RATES)
  const [tripHotels, setTripHotels] = React.useState<TripHotel[]>(INITIAL_TRIP_HOTELS)
  const [tripVehicles, setTripVehicles] = React.useState<TripVehicle[]>(INITIAL_TRIP_VEHICLES)
  const [tripActivities, setTripActivities] = React.useState<TripActivity[]>(INITIAL_TRIP_ACTIVITIES)

  // ─── Supplier Handlers ────────────────────────────────────────────────
  const addSupplier = (supplierData: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    const newId = `SUP-0${suppliers.length + 1}`
    const newSupplier: Supplier = {
      ...supplierData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setSuppliers((prev) => [newSupplier, ...prev])
    return newSupplier
  }

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
    )
  }

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
  }

  // ─── Hotel Handlers ───────────────────────────────────────────────────
  const addHotel = (hotelData: Omit<Hotel, "id" | "createdAt" | "updatedAt">) => {
    const newId = `HTL-0${hotels.length + 1}`
    const newHotel: Hotel = {
      ...hotelData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setHotels((prev) => [newHotel, ...prev])
    return newHotel
  }

  const updateHotel = (id: string, updates: Partial<Hotel>) => {
    setHotels((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h))
    )
  }

  const deleteHotel = (id: string) => {
    setHotels((prev) => prev.filter((h) => h.id !== id))
    setHotelRooms((prev) => prev.filter((r) => r.hotelId !== id))
    setHotelRates((prev) => prev.filter((r) => r.hotelId !== id))
  }

  // ─── Hotel Room Handlers ──────────────────────────────────────────────
  const addHotelRoom = (roomData: Omit<HotelRoom, "id" | "createdAt" | "updatedAt">) => {
    const newId = `RM-0${hotelRooms.length + 1}`
    const newRoom: HotelRoom = {
      ...roomData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setHotelRooms((prev) => [...prev, newRoom])
    return newRoom
  }

  const updateHotelRoom = (id: string, updates: Partial<HotelRoom>) => {
    setHotelRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    )
  }

  const deleteHotelRoom = (id: string) => {
    setHotelRooms((prev) => prev.filter((r) => r.id !== id))
    setHotelRates((prev) => prev.filter((rate) => rate.roomId !== id))
  }

  // ─── Hotel Rate Handlers ──────────────────────────────────────────────
  const addHotelRate = (rateData: Omit<HotelRate, "id" | "createdAt" | "updatedAt">) => {
    const newId = `HR-0${hotelRates.length + 1}`
    const newRate: HotelRate = {
      ...rateData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setHotelRates((prev) => [newRate, ...prev])
    return newRate
  }

  const updateHotelRate = (id: string, updates: Partial<HotelRate>) => {
    setHotelRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    )
  }

  const deleteHotelRate = (id: string) => {
    setHotelRates((prev) => prev.filter((r) => r.id !== id))
  }

  const importHotelRates = (ratesData: Omit<HotelRate, "id" | "createdAt" | "updatedAt">[]) => {
    const timestamp = new Date().toISOString()
    const newRecords: HotelRate[] = ratesData.map((rd, idx) => ({
      ...rd,
      id: `HR-IMP-${Date.now()}-${idx + 1}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
    setHotelRates((prev) => [...newRecords, ...prev])
    return newRecords.length
  }

  // ─── Rate Sheet Handlers ──────────────────────────────────────────────
  const addRateSheet = (sheetData: Omit<RateSheet, "id" | "createdAt" | "updatedAt">) => {
    const newId = `RS-0${rateSheets.length + 1}`
    const newSheet: RateSheet = {
      ...sheetData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setRateSheets((prev) => [newSheet, ...prev])
    return newSheet
  }

  const updateRateSheet = (id: string, updates: Partial<RateSheet>) => {
    setRateSheets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
    )
  }

  const deleteRateSheet = (id: string) => {
    setRateSheets((prev) => prev.filter((s) => s.id !== id))
  }

  // ─── Vehicle Handlers ─────────────────────────────────────────────────
  const addVehicle = (vehicleData: Omit<Vehicle, "id" | "createdAt" | "updatedAt">) => {
    const newId = `VEH-0${vehicles.length + 1}`
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setVehicles((prev) => [newVehicle, ...prev])
    return newVehicle
  }

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v))
    )
  }

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id))
    setVehicleRates((prev) => prev.filter((vr) => vr.vehicleId !== id))
  }

  // ─── Vehicle Rate Handlers ────────────────────────────────────────────
  const addVehicleRate = (rateData: Omit<VehicleRate, "id" | "createdAt" | "updatedAt">) => {
    const newId = `VR-0${vehicleRates.length + 1}`
    const newRate: VehicleRate = {
      ...rateData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setVehicleRates((prev) => [newRate, ...prev])
    return newRate
  }

  const updateVehicleRate = (id: string, updates: Partial<VehicleRate>) => {
    setVehicleRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    )
  }

  const deleteVehicleRate = (id: string) => {
    setVehicleRates((prev) => prev.filter((r) => r.id !== id))
  }

  // ─── Activity Handlers ────────────────────────────────────────────────
  const addActivity = (activityData: Omit<Activity, "id" | "createdAt" | "updatedAt">) => {
    const newId = `ACT-0${activities.length + 1}`
    const newActivity: Activity = {
      ...activityData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setActivities((prev) => [newActivity, ...prev])
    return newActivity
  }

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a))
    )
  }

  const deleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
    setActivityRates((prev) => prev.filter((ar) => ar.activityId !== id))
  }

  // ─── Activity Rate Handlers ───────────────────────────────────────────
  const addActivityRate = (rateData: Omit<ActivityRate, "id" | "createdAt" | "updatedAt">) => {
    const newId = `AR-0${activityRates.length + 1}`
    const newRate: ActivityRate = {
      ...rateData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setActivityRates((prev) => [newRate, ...prev])
    return newRate
  }

  const updateActivityRate = (id: string, updates: Partial<ActivityRate>) => {
    setActivityRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    )
  }

  const deleteActivityRate = (id: string) => {
    setActivityRates((prev) => prev.filter((r) => r.id !== id))
  }

  // ─── Trip Services Handlers ───────────────────────────────────────────
  const addTripHotel = (tripHotelData: Omit<TripHotel, "id" | "createdAt">) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newTripHotel: TripHotel = {
      ...tripHotelData,
      id: `TH-${Date.now()}-${randomSuffix}`,
      createdAt: new Date().toISOString(),
    }
    setTripHotels((prev) => [...prev, newTripHotel])
    return newTripHotel
  }

  const updateTripHotel = (id: string, updates: Partial<TripHotel>) => {
    setTripHotels((prev) =>
      prev.map((th) => (th.id === id ? { ...th, ...updates } : th))
    )
  }

  const removeTripHotel = (id: string) => {
    setTripHotels((prev) => prev.filter((th) => th.id !== id))
  }

  const addTripVehicle = (tripVehicleData: Omit<TripVehicle, "id" | "createdAt">) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newTripVehicle: TripVehicle = {
      ...tripVehicleData,
      id: `TV-${Date.now()}-${randomSuffix}`,
      createdAt: new Date().toISOString(),
    }
    setTripVehicles((prev) => [...prev, newTripVehicle])
    return newTripVehicle
  }

  const updateTripVehicle = (id: string, updates: Partial<TripVehicle>) => {
    setTripVehicles((prev) =>
      prev.map((tv) => (tv.id === id ? { ...tv, ...updates } : tv))
    )
  }

  const removeTripVehicle = (id: string) => {
    setTripVehicles((prev) => prev.filter((tv) => tv.id !== id))
  }

  const addTripActivity = (tripActivityData: Omit<TripActivity, "id" | "createdAt">) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newTripActivity: TripActivity = {
      ...tripActivityData,
      id: `TA-${Date.now()}-${randomSuffix}`,
      createdAt: new Date().toISOString(),
    }
    setTripActivities((prev) => [...prev, newTripActivity])
    return newTripActivity
  }

  const updateTripActivity = (id: string, updates: Partial<TripActivity>) => {
    setTripActivities((prev) =>
      prev.map((ta) => (ta.id === id ? { ...ta, ...updates } : ta))
    )
  }

  const removeTripActivity = (id: string) => {
    setTripActivities((prev) => prev.filter((ta) => ta.id !== id))
  }

  return (
    <InventoryContext.Provider
      value={{
        suppliers,
        hotels,
        hotelRooms,
        hotelRates,
        rateSheets,
        vehicles,
        vehicleRates,
        activities,
        activityRates,
        tripHotels,
        tripVehicles,
        tripActivities,

        addSupplier,
        updateSupplier,
        deleteSupplier,

        addHotel,
        updateHotel,
        deleteHotel,

        addHotelRoom,
        updateHotelRoom,
        deleteHotelRoom,

        addHotelRate,
        updateHotelRate,
        deleteHotelRate,
        importHotelRates,

        addRateSheet,
        updateRateSheet,
        deleteRateSheet,

        addVehicle,
        updateVehicle,
        deleteVehicle,

        addVehicleRate,
        updateVehicleRate,
        deleteVehicleRate,

        addActivity,
        updateActivity,
        deleteActivity,

        addActivityRate,
        updateActivityRate,
        deleteActivityRate,

        addTripHotel,
        updateTripHotel,
        removeTripHotel,

        addTripVehicle,
        updateTripVehicle,
        removeTripVehicle,

        addTripActivity,
        updateTripActivity,
        removeTripActivity,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = React.useContext(InventoryContext)
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return context
}
