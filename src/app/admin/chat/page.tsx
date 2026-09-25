"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { platformChatClient } from "@/lib/api-client/platform-chat-client";
import { ConversationView } from "@/lib/services/platform-chat-service";
import {
  usePlatformChat,
  formatChatTime,
  formatShortDate,
} from "@/hooks/use-platform-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Search,
  Building2,
  User,
  Mail,
  Phone,
  CreditCard,
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  WifiOff,
  Filter,
} from "lucide-react";

export default function AdminChatPage() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialAgencyId = searchParams.get("agencyId");

  const [conversations, setConversations] = React.useState<ConversationView[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const [selectedConversation, setSelectedConversation] = React.useState<ConversationView | null>(
    null
  );
  const [inputMessage, setInputMessage] = React.useState("");

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Fetch list of conversations for admin
  const fetchConversations = React.useCallback(
    async (selectAgencyId?: string | null) => {
      setLoadingList(true);
      try {
        const res = await platformChatClient.getAdminConversations({
          search: searchQuery.trim() || undefined,
          unreadOnly: unreadOnly || undefined,
        });

        if (res.success && res.data) {
          setConversations(res.data);

          // If selectAgencyId is requested, find or fetch that conversation
          if (selectAgencyId) {
            const found = res.data.find((c) => c.agencyId === selectAgencyId);
            if (found) {
              setSelectedConversation(found);
            } else {
              // Lazy create/fetch for this specific agency
              const singleRes = await platformChatClient.getAdminAgencyConversation(
                selectAgencyId
              );
              if (singleRes.success && singleRes.data) {
                setSelectedConversation(singleRes.data);
                setConversations((prev) => [
                  singleRes.data!,
                  ...prev.filter((c) => c.id !== singleRes.data!.id),
                ]);
              }
            }
          } else if (!selectedConversation && res.data.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
            setSelectedConversation(res.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load admin conversations:", err);
      } finally {
        setLoadingList(false);
      }
    },
    [searchQuery, unreadOnly, selectedConversation]
  );

  React.useEffect(() => {
    fetchConversations(initialAgencyId);
  }, [initialAgencyId, unreadOnly]);

  // Hook for realtime messages of selected conversation
  const {
    messages,
    isLoadingHistory,
    isSending,
    connectionStatus,
    error: chatError,
    sendMessage,
    reloadHistory,
  } = usePlatformChat({
    conversationId: selectedConversation?.id || null,
    agencyId: selectedConversation?.agencyId,
    currentUserRole: "PLATFORM_OWNER",
  });

  // Auto-scroll messages
  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSelectConversation = (conv: ConversationView) => {
    setSelectedConversation(conv);
    // Clear unread mark locally
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, hasUnreadForPlatform: false } : c))
    );
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending || !selectedConversation) return;

    const textToSend = inputMessage;
    setInputMessage("");
    const sent = await sendMessage(textToSend);
    if (!sent) {
      setInputMessage(textToSend);
    } else {
      // Update local snippet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessageSnippet: textToSend,
                lastMessageAt: new Date().toISOString(),
                lastMessageSenderRole: "PLATFORM_OWNER",
              }
            : c
        )
      );
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-4 h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Page Title */}
      <div className="mb-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Platform Support Chat
          </h1>
          <p className="text-xs text-slate-500">
            Real-time direct communication with Agency Owners across the platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchConversations(selectedConversation?.agencyId)}
          className="text-xs h-8"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh List
        </Button>
      </div>

      {/* Main Split View Container */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 flex overflow-hidden shadow-xs">
        {/* Left: Agency Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50 ${
            selectedConversation ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search agency, owner, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchConversations()}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  unreadOnly
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Filter className="h-3 w-3" />
                {unreadOnly ? "Showing Unread" : "Show Unread Only"}
              </button>
              <span className="text-[11px] text-slate-400">
                {conversations.length} {conversations.length === 1 ? "agency" : "agencies"}
              </span>
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList ? (
              <div className="flex items-center justify-center p-8 text-slate-400 text-xs gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No support conversations found.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3 transition-colors flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-purple-50/90 border-l-4 border-l-purple-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 mt-0.5">
                      {conv.agencyName?.charAt(0).toUpperCase() || "A"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {conv.agencyName || "Unnamed Agency"}
                        </h4>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatShortDate(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.lastMessageSnippet || (
                          <span className="italic text-slate-400">No messages yet</span>
                        )}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {conv.subscriptionPlan || "Trial"}
                        </span>
                        {conv.subscriptionStatus && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              conv.subscriptionStatus === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : conv.subscriptionStatus === "TRIALING"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {conv.subscriptionStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {conv.hasUnreadForPlatform && (
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-600 shrink-0 mt-1 shadow-xs animate-pulse" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat & Agency 360 Header */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
            {/* Header / Agency 360 Summary */}
            <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="h-10 w-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
                  {selectedConversation.agencyName?.charAt(0).toUpperCase() || "A"}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {selectedConversation.agencyName}
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {selectedConversation.subscriptionPlan || "Trial"} •{" "}
                      {selectedConversation.subscriptionStatus || "Active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                    {selectedConversation.ownerName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {selectedConversation.ownerName}
                      </span>
                    )}
                    {selectedConversation.ownerEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {selectedConversation.ownerEmail}
                      </span>
                    )}
                    {selectedConversation.ownerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {selectedConversation.ownerPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Connection State */}
              <div className="flex items-center gap-2 shrink-0">
                {connectionStatus === "CONNECTED" && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
                {connectionStatus === "CONNECTING" && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Connecting
                  </span>
                )}
                <Link
                  href={`/admin/agencies/${selectedConversation.agencyId}`}
                  target="_blank"
                >
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Agency 360
                  </Button>
                </Link>
              </div>
            </div>

            {/* Chat Timeline */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4">
              {isLoadingHistory && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    No messages exchanged with this agency yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Send a message below to assist them with onboarding, trial support, or plan options.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderRole === "PLATFORM_OWNER";
                  const formattedTime = formatChatTime(msg.createdAt);

                  return (
                    <div
                      key={msg.id || msg.clientMessageId}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-full`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {isMe ? "You (TripDesk)" : selectedConversation.agencyName || "Agency"}
                        </span>
                        <span className="text-[10px] text-slate-400">{formattedTime}</span>
                      </div>

                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[75%] break-words whitespace-pre-wrap text-sm shadow-xs ${
                          isMe
                            ? "bg-purple-600 text-white rounded-tr-xs"
                            : "bg-white text-slate-900 border border-slate-200 rounded-tl-xs"
                        }`}
                      >
                        {msg.messageText}
                      </div>

                      {isMe && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                          {msg.status === "sending" && (
                            <>
                              <Clock className="h-2.5 w-2.5 animate-spin text-amber-500" />
                              <span>Sending...</span>
                            </>
                          )}
                          {msg.status === "failed" && (
                            <span className="text-rose-500 font-medium">Failed to send</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="bg-white border-t border-slate-200 p-3 flex items-end gap-2 shrink-0"
            >
              <textarea
                ref={inputRef}
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Reply to ${selectedConversation.agencyName || "agency"} (Enter to send, Shift+Enter for new line)...`}
                className="flex-1 resize-none bg-transparent border-0 focus:outline-hidden text-sm text-slate-900 placeholder:text-slate-400 p-2 min-h-[44px] max-h-[120px]"
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white shrink-0 rounded-lg shadow-xs transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline mr-1 text-xs font-semibold">Send</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 space-y-3 bg-slate-50/20">
            <div className="h-12 w-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Select an Agency Support Chat</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Choose an agency from the roster on the left to review support questions, onboarding inquiries, and real-time chat history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
