"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  platformChatClient,
  ApiResponse,
} from "@/lib/api-client/platform-chat-client";
import { ChatMessageView } from "@/lib/services/platform-chat-service";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface OptimisticChatMessage extends ChatMessageView {
  isOptimistic?: boolean;
  status?: "sending" | "sent" | "failed";
}

interface UsePlatformChatOptions {
  conversationId: string | null;
  agencyId?: string;
  autoMarkAsRead?: boolean;
  currentUserRole?: "PLATFORM_OWNER" | "AGENCY_OWNER" | string;
}

/**
 * Normalizes any timestamp input (Date, ISO with/without 'Z', SQL string)
 * to a standardized UTC ISO 8601 string ending with 'Z'.
 */
export function normalizeIsoTimestamp(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return new Date().toISOString();
  if (dateInput instanceof Date) return dateInput.toISOString();

  let str = String(dateInput).trim();
  if (!str) return new Date().toISOString();

  // If it's a SQL timestamp "YYYY-MM-DD HH:MM:SS.mmm", convert space to T
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(" ", "T");
  }
  // If it does not have a timezone indicator (Z or +HH:MM or -HH:MM), append Z since PostgreSQL stores UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str += "Z";
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Safely parses a timestamp into epoch milliseconds for deterministic comparison.
 */
export function parseChatTimestampEpoch(dateInput: string | Date | null | undefined): number {
  if (!dateInput) return 0;
  if (dateInput instanceof Date) return dateInput.getTime();

  let str = String(dateInput).trim();
  if (!str) return 0;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(" ", "T");
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str += "Z";
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

/**
 * Formats a chat timestamp to the user's local browser timezone.
 */
export function formatChatTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "Just now";
  try {
    const iso = normalizeIsoTimestamp(dateStr);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Just now";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Just now";
  }
}

/**
 * Formats a short date to the user's local browser timezone.
 */
export function formatShortDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  try {
    const iso = normalizeIsoTimestamp(dateStr);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Sorts chat messages deterministically:
 * 1. Primary: createdAt ASC (by epoch timestamp)
 * 2. Secondary: id ASC (deterministic tiebreaker)
 */
export function sortChatMessages<T extends { createdAt: string | Date; id: string }>(
  messages: T[]
): T[] {
  return [...messages].sort((a, b) => {
    const timeA = parseChatTimestampEpoch(a.createdAt);
    const timeB = parseChatTimestampEpoch(b.createdAt);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.id || "").localeCompare(b.id || "");
  });
}

export function usePlatformChat({
  conversationId,
  agencyId,
  autoMarkAsRead = true,
  currentUserRole,
}: UsePlatformChatOptions) {
  const [messages, setMessages] = useState<OptimisticChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR"
  >("DISCONNECTED");
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeConversationIdRef = useRef<string | null>(conversationId);
  activeConversationIdRef.current = conversationId;

  const autoMarkAsReadRef = useRef(autoMarkAsRead);
  autoMarkAsReadRef.current = autoMarkAsRead;

  const currentUserRoleRef = useRef(currentUserRole);
  currentUserRoleRef.current = currentUserRole;

  // Mark as read helper
  const markAsRead = useCallback(async () => {
    if (!activeConversationIdRef.current) return;
    try {
      await platformChatClient.markAsRead(activeConversationIdRef.current);
    } catch (err) {
      console.warn("[PlatformChat] Failed to mark conversation as read:", err);
    }
  }, []);

  // Load message history from database
  const loadHistory = useCallback(async (convId: string) => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const response = await platformChatClient.getMessages(convId, { limit: 100 });
      if (response.success && response.data) {
        setMessages((prev) => {
          // If conversation changed while loading, return existing or empty
          if (activeConversationIdRef.current !== convId) return prev;

          // Merge fetched history with any existing optimistic messages
          const fetchedMap = new Map<string, OptimisticChatMessage>();
          response.data!.forEach((msg) => {
            const normalizedMsg: OptimisticChatMessage = {
              ...msg,
              createdAt: normalizeIsoTimestamp(msg.createdAt),
              status: "sent",
            };
            fetchedMap.set(msg.id, normalizedMsg);
            if (msg.clientMessageId) {
              fetchedMap.set(msg.clientMessageId, normalizedMsg);
            }
          });

          // Keep pending optimistic messages that haven't been reconciled yet
          const pendingOptimistic = prev
            .filter((m) => m.isOptimistic && m.clientMessageId && !fetchedMap.has(m.clientMessageId))
            .map((m) => ({ ...m, createdAt: normalizeIsoTimestamp(m.createdAt) }));

          // Deduplicate by real ID and sort deterministically
          const finalMessages = [
            ...response.data!.map((m) => ({
              ...m,
              createdAt: normalizeIsoTimestamp(m.createdAt),
              status: "sent" as const,
            })),
            ...pendingOptimistic,
          ];

          return sortChatMessages(finalMessages);
        });

        if (autoMarkAsReadRef.current) {
          platformChatClient.markAsRead(convId).catch(() => {});
        }
      } else {
        setError(response.error?.message || "Failed to load chat history");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading chat history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Subscribe to Realtime postgres_changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setConnectionStatus("DISCONNECTED");
      return;
    }

    let isMounted = true;
    const currentConvId = conversationId;

    // 1. Fetch initial message history
    loadHistory(currentConvId);

    // 2. Setup Supabase Realtime subscription
    const supabase = createClient();
    setConnectionStatus("CONNECTING");

    const channelName = `platform-chat:${currentConvId}`;
    console.log(
      `[PlatformChat] Initializing Realtime channel: ${channelName} | Role: ${currentUserRoleRef.current || "UNKNOWN"}`
    );

    // Keep auth in sync for Realtime connection
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    const initSubscription = async () => {
      // Ensure Realtime has access token from current session before/during connection
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      } catch (err) {
        console.warn("[PlatformChat] Error obtaining auth session token for Realtime:", err);
      }

      if (!isMounted) return;

      // Clean up any stale channel with this topic if present
      const existingChannels = supabase.getChannels();
      const duplicateChannel = existingChannels.find((ch) => ch.topic === `realtime:${channelName}`);
      if (duplicateChannel) {
        await supabase.removeChannel(duplicateChannel);
      }

      if (!isMounted) return;

      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "platform_chat_messages",
            filter: `conversationId=eq.${currentConvId}`,
          },
          (payload) => {
            const newRow = payload.new as any;
            if (!newRow) return;

            const rowConvId = newRow.conversationId || newRow.conversation_id;
            if (rowConvId && rowConvId !== currentConvId) return;

            const rowAgencyId = newRow.agencyId || newRow.agency_id || "";
            const rowSenderUserId = newRow.senderUserId || newRow.sender_user_id || "";
            const rowSenderRole = newRow.senderRole || newRow.sender_role || "USER";
            const rowMessageText = newRow.messageText || newRow.message_text || "";
            const rowClientMessageId =
              newRow.clientMessageId || newRow.client_message_id || null;
            const rowCreatedAt = normalizeIsoTimestamp(
              newRow.createdAt || newRow.created_at
            );

            console.log(
              `[PlatformChat] Realtime INSERT received | Conv: ${rowConvId} | Msg ID: ${newRow.id} | Sender: ${rowSenderUserId} (${rowSenderRole}) | Text: "${rowMessageText.substring(0, 30)}"`
            );

            const incomingMessage: OptimisticChatMessage = {
              id: newRow.id,
              conversationId: rowConvId || currentConvId,
              agencyId: rowAgencyId,
              senderUserId: rowSenderUserId,
              senderName:
                rowSenderRole === "PLATFORM_OWNER" ? "TripDesk Support" : "Agency",
              senderEmail: "",
              senderRole: rowSenderRole,
              messageText: rowMessageText,
              clientMessageId: rowClientMessageId,
              createdAt: rowCreatedAt,
              status: "sent",
            };

            setMessages((prev) => {
              // Deduplicate: check if message with this ID or clientMessageId already exists
              const existingIndex = prev.findIndex(
                (m) =>
                  m.id === incomingMessage.id ||
                  (incomingMessage.clientMessageId &&
                    m.clientMessageId === incomingMessage.clientMessageId)
              );

              let updated: OptimisticChatMessage[];
              if (existingIndex >= 0) {
                console.log(
                  `[PlatformChat] Reconciling optimistic / duplicate realtime message: ${incomingMessage.id} (cmid: ${incomingMessage.clientMessageId})`
                );
                // Replace optimistic with real DB record
                updated = [...prev];
                updated[existingIndex] = {
                  ...incomingMessage,
                  senderName: prev[existingIndex].senderName || incomingMessage.senderName,
                  senderEmail: prev[existingIndex].senderEmail || incomingMessage.senderEmail,
                };
              } else {
                console.log(
                  `[PlatformChat] Adding realtime message to state: ${incomingMessage.id} - "${incomingMessage.messageText.substring(0, 30)}"`
                );
                // Append incoming new message
                updated = [...prev, incomingMessage];
              }

              return sortChatMessages(updated);
            });

            // Dispatch global event so sidebar and indicators synchronize unread state
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("tripdesk:chat-unread-updated"));
            }

            // Mark as read if user is actively viewing
            if (autoMarkAsReadRef.current) {
              platformChatClient.markAsRead(currentConvId).catch(() => {});
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[PlatformChat] Subscription status for ${channelName}: ${status}`, err || "");
          if (!isMounted) return;

          if (status === "SUBSCRIBED") {
            setConnectionStatus("CONNECTED");
          } else if (status === "CLOSED") {
            setConnectionStatus("DISCONNECTED");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnectionStatus("ERROR");
          }
        });
    };

    initSubscription();

    // Handle online/offline window events for backfill
    const handleOnline = () => {
      if (activeConversationIdRef.current) {
        console.log("[PlatformChat] Browser back online, reloading history...");
        loadHistory(activeConversationIdRef.current);
      }
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted = false;
      console.log(`[PlatformChat] Cleaning up realtime channel ${channelName}`);
      window.removeEventListener("online", handleOnline);
      authSubscription.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, loadHistory]);

  // Send message action with optimistic insertion
  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed || !conversationId) return false;

      const clientMessageId = `cmid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const optimisticMessage: OptimisticChatMessage = {
        id: clientMessageId,
        conversationId,
        agencyId: agencyId || "",
        senderUserId: "current-user",
        senderName: "You",
        senderEmail: "",
        senderRole: (currentUserRole as any) || "USER",
        messageText: trimmed,
        clientMessageId,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        status: "sending",
      };

      // 1. Optimistically append
      setMessages((prev) => sortChatMessages([...prev, optimisticMessage]));
      setIsSending(true);

      try {
        // 2. Call server write API
        const response = await platformChatClient.sendMessage(
          conversationId,
          trimmed,
          clientMessageId
        );

        if (response.success && response.data) {
          const persisted = response.data;
          // 3. Reconcile optimistic message
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.clientMessageId === clientMessageId || m.id === clientMessageId
                ? {
                    ...persisted,
                    createdAt: normalizeIsoTimestamp(persisted.createdAt),
                    status: "sent" as const,
                  }
                : m
            );
            return sortChatMessages(updated);
          });
          return true;
        } else {
          // Mark as failed
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === clientMessageId || m.id === clientMessageId
                ? { ...m, status: "failed" as const }
                : m
            )
          );
          setError(response.error?.message || "Failed to send message");
          return false;
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId || m.id === clientMessageId
              ? { ...m, status: "failed" as const }
              : m
          )
        );
        setError(err?.message || "Network error while sending message");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, agencyId, currentUserRole]
  );

  return {
    messages,
    isLoadingHistory,
    isSending,
    connectionStatus,
    error,
    sendMessage,
    markAsRead,
    reloadHistory: () => conversationId && loadHistory(conversationId),
  };
}

/**
 * Hook for observing unread Support Chat count in the Sidebar and navigation.
 * Synchronizes with route changes, background notification refresh, and Realtime chat events.
 */
export function usePlatformChatUnreadCount() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const pathname = usePathname();

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await platformChatClient.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount, pathname]);

  useEffect(() => {
    const handleUpdate = () => {
      refreshUnreadCount();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("tripdesk:chat-unread-updated", handleUpdate);
      window.addEventListener("focus", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("tripdesk:chat-unread-updated", handleUpdate);
        window.removeEventListener("focus", handleUpdate);
      }
    };
  }, [refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
}

