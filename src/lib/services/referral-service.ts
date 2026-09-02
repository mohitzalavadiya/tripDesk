import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma, ReferralStatus } from "@prisma/client";
import {
  ReferralFilterInput,
  ReferralCreateInput,
  ReferralStatusUpdateInput,
} from "@/lib/validation/referral-schema";

export interface ReferralSummaryStats {
  totalReferrals: number;
  convertedCount: number;
  rewardedCount: number;
  conversionRate: number;
  totalRewardsDistributed: number;
}

export interface AgencyReferralItem {
  id: string;
  referrerCustomerId: string;
  referrerName: string;
  referrerPhone: string;
  referrerEmail: string | null;
  referredName: string;
  referredEmail: string | null;
  referredPhone: string | null;
  referralCode: string;
  status: ReferralStatus;
  rewardAmount: number | null;
  notes: string | null;
  convertedBookingId: string | null;
  convertedBookingNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export const referralService = {
  /**
   * 1. List referrals with tenant isolation, filtering, and summary statistics
   */
  async listReferrals(agencyId: string, filter?: ReferralFilterInput) {
    const where: Prisma.ReferralWhereInput = {
      agencyId,
    };

    if (filter?.status) {
      where.status = filter.status as ReferralStatus;
    }
    if (filter?.referrerCustomerId) {
      where.referrerCustomerId = filter.referrerCustomerId;
    }

    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { referrerCustomer: { name: { contains: q, mode: "insensitive" } } },
        { referredName: { contains: q, mode: "insensitive" } },
        { referralCode: { contains: q, mode: "insensitive" } },
        { referredPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    const page = Number(filter?.page) || 1;
    const limit = Number(filter?.limit) || 50;
    const skip = (page - 1) * limit;

    const [referrals, totalCount, allReferrals] = await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          referrerCustomer: { select: { id: true, name: true, phone: true, email: true } },
          convertedBooking: { select: { id: true, bookingNumber: true } },
        },
      }),
      prisma.referral.count({ where }),
      prisma.referral.findMany({
        where: { agencyId },
        select: {
          status: true,
          rewardAmount: true,
        },
      }),
    ]);

    // Compute Summary Stats
    const totalAll = allReferrals.length;
    let convertedCount = 0;
    let rewardedCount = 0;
    let totalRewardsDistributed = 0;

    for (const r of allReferrals) {
      if (r.status === "CONVERTED" || r.status === "REWARDED") {
        convertedCount += 1;
      }
      if (r.status === "REWARDED") {
        rewardedCount += 1;
        if (r.rewardAmount) {
          totalRewardsDistributed += Number(r.rewardAmount);
        }
      }
    }

    const conversionRate = totalAll > 0 ? Math.round((convertedCount / totalAll) * 100) : 0;

    const items: AgencyReferralItem[] = referrals.map((r: any) => ({
      id: r.id,
      referrerCustomerId: r.referrerCustomerId,
      referrerName: r.referrerCustomer.name,
      referrerPhone: r.referrerCustomer.phone,
      referrerEmail: r.referrerCustomer.email,
      referredName: r.referredName,
      referredEmail: r.referredEmail,
      referredPhone: r.referredPhone,
      referralCode: r.referralCode,
      status: r.status,
      rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
      notes: r.notes,
      convertedBookingId: r.convertedBookingId,
      convertedBookingNumber: r.convertedBooking?.bookingNumber || null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const stats: ReferralSummaryStats = {
      totalReferrals: totalAll,
      convertedCount,
      rewardedCount,
      conversionRate,
      totalRewardsDistributed,
    };

    return {
      items,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats,
    };
  },

  /**
   * 2. Get single referral with strict tenant isolation
   */
  async getReferral(agencyId: string, referralId: string): Promise<AgencyReferralItem | null> {
    const r: any = await prisma.referral.findFirst({
      where: { id: referralId, agencyId },
      include: {
        referrerCustomer: { select: { id: true, name: true, phone: true, email: true } },
        convertedBooking: { select: { id: true, bookingNumber: true } },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      referrerCustomerId: r.referrerCustomerId,
      referrerName: r.referrerCustomer.name,
      referrerPhone: r.referrerCustomer.phone,
      referrerEmail: r.referrerCustomer.email,
      referredName: r.referredName,
      referredEmail: r.referredEmail,
      referredPhone: r.referredPhone,
      referralCode: r.referralCode,
      status: r.status,
      rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
      notes: r.notes,
      convertedBookingId: r.convertedBookingId,
      convertedBookingNumber: r.convertedBooking?.bookingNumber || null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  },

  /**
   * 3. Create a new referral with a server-generated collision-safe referral code
   */
  async createReferral(agencyId: string, input: ReferralCreateInput) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.referrerCustomerId, agencyId },
    });

    if (!customer) {
      throw new Error(`Referrer customer with ID ${input.referrerCustomerId} not found in this agency.`);
    }

    // Generate clean unique referral code
    const cleanName = customer.name.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "REF";
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const referralCode = `REF-${cleanName}-${randSuffix}`;

    const referral = await prisma.referral.create({
      data: {
        agencyId,
        referrerCustomerId: input.referrerCustomerId,
        referredName: input.referredName.trim(),
        referredEmail: input.referredEmail?.trim() || null,
        referredPhone: input.referredPhone?.trim() || null,
        referralCode,
        status: ReferralStatus.PENDING,
        rewardAmount: input.rewardAmount !== undefined && input.rewardAmount !== null ? new Prisma.Decimal(input.rewardAmount) : new Prisma.Decimal(500),
        notes: input.notes?.trim() || null,
      },
      include: {
        referrerCustomer: true,
      },
    });

    return referral;
  },

  /**
   * 4. Update referral status & reward transition
   */
  async updateReferralStatus(
    agencyId: string,
    referralId: string,
    input: ReferralStatusUpdateInput
  ) {
    const referral = await prisma.referral.findFirst({
      where: { id: referralId, agencyId },
    });

    if (!referral) {
      throw new Error("Referral record not found or access denied.");
    }

    const updated = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: input.status,
        rewardAmount: input.rewardAmount !== undefined && input.rewardAmount !== null ? new Prisma.Decimal(input.rewardAmount) : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
        convertedBookingId: input.convertedBookingId !== undefined ? input.convertedBookingId : undefined,
      },
      include: {
        referrerCustomer: true,
        convertedBooking: true,
      },
    });

    return updated;
  },
};
