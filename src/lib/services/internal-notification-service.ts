import "server-only";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  UserNotification,
  UserNotificationType,
  UserRole,
} from "@prisma/client";
import { ListUserNotificationsInput } from "@/lib/validation/user-notification-schema";

export interface CreateInternalNotificationInput {
  userId: string;
  agencyId?: string | null;
  role: UserRole;
  type: UserNotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UserNotificationItemView {
  id: string;
  userId: string;
  agencyId: string | null;
  role: UserRole;
  type: UserNotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

export class InternalNotificationService {
  /**
   * Create an internal user notification with idempotency check
   */
  async createNotification(
    input: CreateInternalNotificationInput
  ): Promise<UserNotificationItemView | null> {
    const {
      userId,
      agencyId = null,
      role,
      type,
      title,
      message,
      linkUrl = null,
      idempotencyKey = null,
      metadata = null,
    } = input;

    try {
      // 1. Idempotency Check
      if (idempotencyKey) {
        const existing = await prisma.userNotification.findFirst({
          where: { userId, idempotencyKey },
        });
        if (existing) {
          return this.mapToItemView(existing);
        }
      }

      // 2. Create User Notification in Database
      const notif = await prisma.userNotification.create({
        data: {
          userId,
          agencyId,
          role,
          type,
          title,
          message,
          linkUrl,
          idempotencyKey,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      return this.mapToItemView(notif);
    } catch (err: any) {
      // Handle unique constraint race conditions gracefully
      if (err?.code === "P2002" && idempotencyKey) {
        const existing = await prisma.userNotification.findFirst({
          where: { userId, idempotencyKey },
        });
        if (existing) {
          return this.mapToItemView(existing);
        }
      }
      console.warn("[InternalNotificationService.createNotification Error]", err?.message || err);
      return null;
    }
  }

  /**
   * Broadcast an internal notification to all PLATFORM_OWNER users
   */
  async notifyPlatformOwners(payload: {
    type: UserNotificationType;
    title: string;
    message: string;
    linkUrl?: string | null;
    idempotencyKey?: string | null;
    idempotencyKeyPrefix?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<UserNotificationItemView[]> {
    const results: UserNotificationItemView[] = [];
    try {
      const platformOwners = await prisma.user.findMany({
        where: { role: UserRole.PLATFORM_OWNER },
        select: { id: true },
      });

      const keyBase = payload.idempotencyKey || payload.idempotencyKeyPrefix;

      for (const owner of platformOwners) {
        const item = await this.createNotification({
          userId: owner.id,
          agencyId: null,
          role: UserRole.PLATFORM_OWNER,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          linkUrl: payload.linkUrl,
          idempotencyKey: keyBase ? `${keyBase}-${owner.id}` : null,
          metadata: payload.metadata,
        });
        if (item) results.push(item);
      }
    } catch (err: any) {
      console.warn("[notifyPlatformOwners Error]", err?.message || err);
    }
    return results;
  }

  /**
   * Notify the AGENCY_OWNER(s) of a specific agency
   */
  async notifyAgencyOwner(
    agencyId: string,
    payload: {
      type: UserNotificationType;
      title: string;
      message: string;
      linkUrl?: string | null;
      idempotencyKey?: string | null;
      idempotencyKeyPrefix?: string | null;
      metadata?: Record<string, any> | null;
    }
  ): Promise<UserNotificationItemView[]> {
    const results: UserNotificationItemView[] = [];
    try {
      const agencyOwners = await prisma.user.findMany({
        where: { agencyId, role: UserRole.AGENCY_OWNER },
        select: { id: true },
      });

      const keyBase = payload.idempotencyKey || payload.idempotencyKeyPrefix;

      for (const owner of agencyOwners) {
        const item = await this.createNotification({
          userId: owner.id,
          agencyId,
          role: UserRole.AGENCY_OWNER,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          linkUrl: payload.linkUrl,
          idempotencyKey: keyBase ? `${keyBase}-${owner.id}` : null,
          metadata: payload.metadata,
        });
        if (item) results.push(item);
      }
    } catch (err: any) {
      console.warn("[notifyAgencyOwner Error]", err?.message || err);
    }
    return results;
  }

  /**
   * Broadcast an internal notification to all active AGENCY_OWNER users (e.g. Platform Announcements)
   */
  async notifyAllAgencyOwners(payload: {
    type: UserNotificationType;
    title: string;
    message: string;
    linkUrl?: string | null;
    idempotencyKey?: string | null;
    idempotencyKeyPrefix?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<UserNotificationItemView[]> {
    const results: UserNotificationItemView[] = [];
    try {
      const agencyOwners = await prisma.user.findMany({
        where: {
          role: UserRole.AGENCY_OWNER,
          agency: { status: "ACTIVE" },
        },
        select: { id: true, agencyId: true },
      });

      const keyBase = payload.idempotencyKey || payload.idempotencyKeyPrefix;

      for (const owner of agencyOwners) {
        if (!owner.agencyId) continue;
        const item = await this.createNotification({
          userId: owner.id,
          agencyId: owner.agencyId,
          role: UserRole.AGENCY_OWNER,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          linkUrl: payload.linkUrl,
          idempotencyKey: keyBase ? `${keyBase}-${owner.id}` : null,
          metadata: payload.metadata,
        });
        if (item) results.push(item);
      }
    } catch (err: any) {
      console.warn("[notifyAllAgencyOwners Error]", err?.message || err);
    }
    return results;
  }

  /**
   * List notifications for authenticated user with tenant/role scoping
   */
  async listNotifications(
    userId: string,
    query: Partial<ListUserNotificationsInput> = {}
  ): Promise<{
    data: UserNotificationItemView[];
    meta: {
      total: number;
      unreadCount: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserNotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: items.map((item) => this.mapToItemView(item)),
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get unread notification count for authenticated user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.userNotification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read with ownership verification
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<UserNotificationItemView | null> {
    const existing = await prisma.userNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      return null;
    }

    if (existing.isRead) {
      return this.mapToItemView(existing);
    }

    const updated = await prisma.userNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapToItemView(updated);
  }

  /**
   * Mark all unread notifications as read for authenticated user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const res = await prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: res.count };
  }

  /**
   * Internal mapper
   */
  private mapToItemView(item: UserNotification): UserNotificationItemView {
    return {
      id: item.id,
      userId: item.userId,
      agencyId: item.agencyId,
      role: item.role,
      type: item.type,
      title: item.title,
      message: item.message,
      linkUrl: item.linkUrl,
      isRead: item.isRead,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      metadata: item.metadata ? (item.metadata as Record<string, any>) : null,
    };
  }
}

export const internalNotificationService = new InternalNotificationService();
