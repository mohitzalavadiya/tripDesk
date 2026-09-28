import "server-only";
import { prisma } from "@/lib/prisma";
import {
  PlatformChatConversation,
  PlatformChatMessage,
  Prisma,
  UserRole,
  UserNotificationType,
} from "@prisma/client";
import { internalNotificationService } from "./internal-notification-service";

export interface ConversationView {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyStatus: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialDaysRemaining: number;
  lastMessageAt: string | null;
  lastMessageSnippet: string | null;
  lastMessageSenderRole: UserRole | null;
  agencyLastReadAt: string | null;
  platformLastReadAt: string | null;
  hasUnreadForAgency: boolean;
  hasUnreadForPlatform: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageView {
  id: string;
  conversationId: string;
  agencyId: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  senderRole: UserRole;
  messageText: string;
  clientMessageId: string | null;
  createdAt: string;
}

export class PlatformChatService {
  /**
   * Lazily gets or creates the single permanent conversation for an agency.
   */
  async getOrCreateConversation(agencyId: string): Promise<ConversationView> {
    // 1. Verify agency exists
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        users: {
          where: { role: UserRole.AGENCY_OWNER },
          take: 1,
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!agency) {
      throw new Error(`Agency with ID "${agencyId}" was not found.`);
    }

    // 2. Fetch or create conversation
    let conv = await prisma.platformChatConversation.findUnique({
      where: { agencyId },
    });

    if (!conv) {
      try {
        conv = await prisma.platformChatConversation.create({
          data: {
            agencyId,
          },
        });
      } catch (err: any) {
        // Handle concurrent first-access creation race condition safely
        if (err?.code === "P2002") {
          conv = await prisma.platformChatConversation.findUnique({
            where: { agencyId },
          });
        } else {
          throw err;
        }
      }
    }

    if (!conv) {
      throw new Error("Failed to initialize support conversation.");
    }

    return this.mapConversation(conv, agency);
  }

  /**
   * List all conversations for the Platform Owner with metadata and unread indicators.
   */
  async listConversationsForPlatform(query?: {
    search?: string;
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ConversationView[];
    meta: {
      total: number;
      unreadTotal: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 30));
    const skip = (page - 1) * limit;
    const search = query?.search?.trim()?.toLowerCase();

    // Fetch all agencies with their conversations
    const agencies = await prisma.agency.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                {
                  users: {
                    some: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        platformChatConversation: true,
        users: {
          where: { role: UserRole.AGENCY_OWNER },
          take: 1,
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map all agencies to conversation views
    const allViews: ConversationView[] = [];

    for (const agency of agencies) {
      let conv = agency.platformChatConversation;
      if (!conv) {
        // Virtual representation for agencies without messages yet
        const view = this.mapConversation(
          {
            id: `new_${agency.id}`,
            agencyId: agency.id,
            lastMessageAt: null,
            lastMessageSnippet: null,
            lastMessageSenderRole: null,
            agencyLastReadAt: null,
            platformLastReadAt: null,
            createdAt: agency.createdAt,
            updatedAt: agency.updatedAt,
          },
          agency
        );
        allViews.push(view);
      } else {
        allViews.push(this.mapConversation(conv, agency));
      }
    }

    // Sort: Conversations with recent messages first, then unread, then alphabetically
    allViews.sort((a, b) => {
      if (a.hasUnreadForPlatform && !b.hasUnreadForPlatform) return -1;
      if (!a.hasUnreadForPlatform && b.hasUnreadForPlatform) return 1;
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt && !b.lastMessageAt) return -1;
      if (!a.lastMessageAt && b.lastMessageAt) return 1;
      return a.agencyName.localeCompare(b.agencyName);
    });

    const unreadTotal = allViews.filter((v) => v.hasUnreadForPlatform).length;

    const filtered = query?.unreadOnly
      ? allViews.filter((v) => v.hasUnreadForPlatform)
      : allViews;

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: paginated,
      meta: {
        total,
        unreadTotal,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Retrieves message history for a conversation.
   */
  async getMessages(
    conversationId: string,
    options?: {
      limit?: number;
      before?: Date;
      after?: Date;
    }
  ): Promise<ChatMessageView[]> {
    const limit = Math.min(100, Math.max(1, options?.limit || 50));

    const where: Prisma.PlatformChatMessageWhereInput = {
      conversationId,
      ...(options?.before ? { createdAt: { lt: options.before } } : {}),
      ...(options?.after ? { createdAt: { gt: options.after } } : {}),
    };

    const messages = await prisma.platformChatMessage.findMany({
      where,
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return messages.map((m) => this.mapMessage(m));
  }

  /**
   * Sends a message, persists to PostgreSQL, updates conversation state, and creates in-app notification.
   */
  async sendMessage(params: {
    conversationId: string;
    agencyId: string;
    senderUserId: string;
    senderRole: UserRole;
    messageText: string;
    clientMessageId?: string;
  }): Promise<ChatMessageView> {
    const {
      conversationId,
      agencyId,
      senderUserId,
      senderRole,
      messageText,
      clientMessageId,
    } = params;

    const trimmedText = messageText.trim();
    if (!trimmedText) {
      throw new Error("Message text cannot be empty.");
    }
    if (trimmedText.length > 3000) {
      throw new Error("Message text cannot exceed 3,000 characters.");
    }

    // 1. Check idempotency if clientMessageId is provided
    if (clientMessageId) {
      const existing = await prisma.platformChatMessage.findFirst({
        where: {
          conversationId,
          clientMessageId,
        },
        include: {
          senderUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      if (existing) {
        return this.mapMessage(existing);
      }
    }

    // 2. Fetch or create actual conversation record
    let conversation = await prisma.platformChatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      // If conversationId is virtual (e.g. "new_<agencyId>"), find or create by agencyId
      conversation = await prisma.platformChatConversation.upsert({
        where: { agencyId },
        update: {},
        create: { agencyId },
      });
    }

    const now = new Date();
    const snippet = trimmedText.length > 80 ? `${trimmedText.slice(0, 77)}...` : trimmedText;

    // 3. Insert Message and update Conversation within a single transaction
    const [createdMessage] = await prisma.$transaction([
      prisma.platformChatMessage.create({
        data: {
          conversationId: conversation.id,
          agencyId,
          senderUserId,
          senderRole,
          messageText: trimmedText,
          clientMessageId: clientMessageId || null,
        },
        include: {
          senderUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.platformChatConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          lastMessageSnippet: snippet,
          lastMessageSenderRole: senderRole,
          // Sender automatically marks their own side as read up to this message
          ...(senderRole === UserRole.AGENCY_OWNER
            ? { agencyLastReadAt: now }
            : { platformLastReadAt: now }),
        },
      }),
    ]);

    // 4. Trigger In-App Notification asynchronously (non-blocking for chat write)
    try {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: { name: true },
      });
      const agencyName = agency?.name || "Travel Agency";

      if (senderRole === UserRole.AGENCY_OWNER) {
        await internalNotificationService.notifyPlatformOwners({
          type: UserNotificationType.PLATFORM_CHAT_MESSAGE,
          title: `Support Message: ${agencyName}`,
          message: snippet,
          linkUrl: `/admin/chat?agencyId=${agencyId}`,
          idempotencyKey: `chat-notif-${createdMessage.id}`,
        });
      } else {
        await internalNotificationService.notifyAgencyOwner(agencyId, {
          type: UserNotificationType.PLATFORM_CHAT_MESSAGE,
          title: "TripDesk Platform Support",
          message: snippet,
          linkUrl: "/support",
          idempotencyKey: `chat-notif-${createdMessage.id}`,
        });
      }
    } catch (notifErr) {
      console.warn("[PlatformChatService] Failed to dispatch internal notification:", notifErr);
    }

    return this.mapMessage(createdMessage);
  }

  /**
   * Updates the read boundary timestamp for the participant.
   */
  async markAsRead(
    conversationId: string,
    role: UserRole
  ): Promise<{ success: boolean; readAt: string }> {
    const now = new Date();

    await prisma.platformChatConversation.update({
      where: { id: conversationId },
      data: {
        ...(role === UserRole.AGENCY_OWNER
          ? { agencyLastReadAt: now }
          : { platformLastReadAt: now }),
      },
    });

    return {
      success: true,
      readAt: now.toISOString(),
    };
  }

  /**
   * Get unread count for the given user role.
   */
  async getUnreadCount(params: {
    role: UserRole;
    agencyId?: string | null;
  }): Promise<number> {
    if (params.role === UserRole.PLATFORM_OWNER) {
      // Count all conversations where last message was from an agency and newer than platform read timestamp
      const conversations = await prisma.platformChatConversation.findMany({
        where: {
          lastMessageSenderRole: UserRole.AGENCY_OWNER,
        },
        select: {
          lastMessageAt: true,
          platformLastReadAt: true,
        },
      });

      return conversations.filter((c) => {
        if (!c.lastMessageAt) return false;
        if (!c.platformLastReadAt) return true;
        return new Date(c.lastMessageAt).getTime() > new Date(c.platformLastReadAt).getTime();
      }).length;
    }

    if (params.role === UserRole.AGENCY_OWNER && params.agencyId) {
      const conv = await prisma.platformChatConversation.findUnique({
        where: { agencyId: params.agencyId },
        select: {
          lastMessageAt: true,
          lastMessageSenderRole: true,
          agencyLastReadAt: true,
        },
      });

      if (!conv || !conv.lastMessageAt) return 0;
      if (conv.lastMessageSenderRole !== UserRole.PLATFORM_OWNER) return 0;
      if (!conv.agencyLastReadAt) return 1;
      return new Date(conv.lastMessageAt).getTime() > new Date(conv.agencyLastReadAt).getTime() ? 1 : 0;
    }

    return 0;
  }

  /**
   * Map conversation database entity to clean view.
   */
  private mapConversation(conv: any, agency: any): ConversationView {
    const owner = agency.users?.[0] || null;
    const sub = agency.subscriptions?.[0] || null;

    let trialDaysRemaining = 0;
    if (sub && sub.status === "TRIAL" && sub.trialEnd) {
      const end = new Date(sub.trialEnd).getTime();
      trialDaysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    const lastMsgTime = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
    const agencyReadTime = conv.agencyLastReadAt ? new Date(conv.agencyLastReadAt).getTime() : 0;
    const platformReadTime = conv.platformLastReadAt ? new Date(conv.platformLastReadAt).getTime() : 0;

    const hasUnreadForAgency =
      conv.lastMessageSenderRole === UserRole.PLATFORM_OWNER && lastMsgTime > agencyReadTime;

    const hasUnreadForPlatform =
      conv.lastMessageSenderRole === UserRole.AGENCY_OWNER && lastMsgTime > platformReadTime;

    return {
      id: conv.id,
      agencyId: agency.id,
      agencyName: agency.name,
      agencyEmail: agency.email,
      agencyPhone: agency.phone,
      agencyStatus: agency.status,
      ownerName: owner?.name || "Agency Owner",
      ownerEmail: owner?.email || agency.email,
      ownerPhone: owner?.phone || agency.phone,
      subscriptionPlan: sub?.plan?.name || "Starter",
      subscriptionStatus: sub?.status || "TRIAL",
      trialDaysRemaining,
      lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
      lastMessageSnippet: conv.lastMessageSnippet || null,
      lastMessageSenderRole: conv.lastMessageSenderRole || null,
      agencyLastReadAt: conv.agencyLastReadAt ? new Date(conv.agencyLastReadAt).toISOString() : null,
      platformLastReadAt: conv.platformLastReadAt ? new Date(conv.platformLastReadAt).toISOString() : null,
      hasUnreadForAgency,
      hasUnreadForPlatform,
      createdAt: new Date(conv.createdAt).toISOString(),
      updatedAt: new Date(conv.updatedAt).toISOString(),
    };
  }

  /**
   * Map message database entity to clean view.
   */
  private mapMessage(msg: any): ChatMessageView {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      agencyId: msg.agencyId,
      senderUserId: msg.senderUserId,
      senderName: msg.senderUser?.name || (msg.senderRole === UserRole.PLATFORM_OWNER ? "TripDesk Platform" : "Agency Owner"),
      senderEmail: msg.senderUser?.email || "",
      senderRole: msg.senderRole,
      messageText: msg.messageText,
      clientMessageId: msg.clientMessageId || null,
      createdAt: new Date(msg.createdAt).toISOString(),
    };
  }
}

export const platformChatService = new PlatformChatService();
