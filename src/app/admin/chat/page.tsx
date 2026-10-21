"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import {
formatChatTime,
formatShortDate,
usePlatformChat,
} from "@/hooks/use-platform-chat";
import { platformChatClient } from "@/lib/api-client/platform-chat-client";
import { ConversationView } from "@/lib/services/platform-chat-service";
import {
ArrowLeft,
Clock,
ExternalLink,
Filter,
Mail,
MessageSquare,
Phone,
RefreshCw,
Search,
Send,
User
} from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import * as React from "react";

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
  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);

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

  // Auto-scroll messages inside container only without moving window/page
  const scrollToBottom = React.useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
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
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] max-h-[calc(100dvh-8rem)] md:max-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden w-full max-w-[1600px] mx-auto p-2 sm:p-4 lg:p-6 gap-2 sm:gap-3 min-w-0">
      {/* Common Page Header */}
      <div className="shrink-0">
        <PageHeader
          title="Platform Support Chat"
          description="Real-time direct communication with Agency Owners across the platform."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Support Chat" }]}
          primaryAction={{
            label: "Refresh List",
            onClick: () => fetchConversations(selectedConversation?.agencyId),
            icon: RefreshCw,
          }}
          compact
        />
      </div>

      {/* Main Split View Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl flex-1 min-h-0 flex overflow-hidden shadow-xs min-w-0">
          {/* Left: Agency Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50 min-w-0 ${
              selectedConversation ? "hidden md:flex" : "flex flex-1 min-h-0"
            }`}
          >
            {/* Search & Filter Header */}
            <div className="p-2 sm:p-2.5 border-b border-slate-200 space-y-1.5 sm:space-y-2 bg-white shrink-0 min-w-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search agency, owner, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchConversations()}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-1 text-[11px] min-w-0">
                <button
                  onClick={() => setUnreadOnly(!unreadOnly)}
                  className={`font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    unreadOnly
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {unreadOnly ? "Showing Unread" : "Show Unread Only"}
                </button>
                <span className="text-[11px] text-slate-400 truncate text-right">
                  {conversations.length} {conversations.length === 1 ? "agency" : "agencies"}
                </span>
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-100 min-w-0">
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
                      className={`w-full text-left p-2.5 sm:p-3 transition-colors flex items-start gap-2.5 sm:gap-3 relative min-w-0 cursor-pointer ${
                        isSelected
                          ? "bg-purple-50/90 border-l-4 border-l-purple-600"
                          : "hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 mt-0.5">
                        {conv.agencyName?.charAt(0).toUpperCase() || "A"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={conv.agencyName || "Unnamed Agency"}>
                            {conv.agencyName || "Unnamed Agency"}
                          </h4>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                              {formatShortDate(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 truncate mt-0.5" title={conv.lastMessageSnippet || "No messages yet"}>
                          {conv.lastMessageSnippet || (
                            <span className="italic text-slate-400">No messages yet</span>
                          )}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {conv.subscriptionPlan || "Trial"}
                          </span>
                          {conv.subscriptionStatus && (
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
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
            <div className="flex-1 min-h-0 flex flex-col min-w-0 bg-slate-50/30">
              {/* Header / Agency 360 Summary */}
              <div className="p-2 sm:p-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                  {/* Mobile Back Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden h-7 w-7 p-0 shrink-0"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                    {selectedConversation.agencyName?.charAt(0).toUpperCase() || "A"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={selectedConversation.agencyName}>
                        {selectedConversation.agencyName}
                      </h2>
                      <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                        {selectedConversation.subscriptionPlan || "Trial"} •{" "}
                        {selectedConversation.subscriptionStatus || "Active"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 mt-0.5 min-w-0">
                      {selectedConversation.ownerName && (
                        <span className="flex items-center gap-1 truncate" title={selectedConversation.ownerName}>
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[90px] sm:max-w-none">{selectedConversation.ownerName}</span>
                        </span>
                      )}
                      {selectedConversation.ownerEmail && (
                        <span className="hidden min-[360px]:flex items-center gap-1 truncate" title={selectedConversation.ownerEmail}>
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[110px] sm:max-w-none">{selectedConversation.ownerEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Connection State */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {connectionStatus === "CONNECTED" && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                  {connectionStatus === "CONNECTING" && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-700 font-medium bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span className="hidden sm:inline">Connecting</span>
                    </span>
                  )}
                  <Link
                    href={`/admin/agencies/${selectedConversation.agencyId}`}
                    target="_blank"
                  >
                    <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[11px] sm:text-xs font-semibold px-2 sm:px-3">
                      <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1 shrink-0" />
                      <span className="hidden min-[380px]:inline">Agency 360</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Chat Timeline */}
              <div
                ref={chatContainerRef}
                className="flex-1 min-h-0 p-2.5 sm:p-4 overflow-y-auto overscroll-contain flex flex-col space-y-3 sm:space-y-4 min-w-0"
              >
                {isLoadingHistory && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6 space-y-2">
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
                          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 truncate max-w-[150px]">
                            {isMe ? "You (Your Travel Desk)" : selectedConversation.agencyName || "Agency"}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400">{formattedTime}</span>
                        </div>

                        <div
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl max-w-[90%] sm:max-w-[75%] break-words whitespace-pre-wrap text-xs sm:text-sm shadow-xs ${
                            isMe
                              ? "bg-purple-600 text-white rounded-tr-xs"
                              : "bg-white text-slate-900 border border-slate-200 rounded-tl-xs"
                          }`}
                        >
                          {msg.messageText}
                        </div>

                        {isMe && (
                          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 mt-1 px-1">
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
                className="bg-white border-t border-slate-200 p-2 sm:p-2.5 flex items-end gap-1.5 sm:gap-2 shrink-0 min-w-0"
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply to ${selectedConversation.agencyName || "agency"}...`}
                  className="flex-1 resize-none bg-transparent border-0 focus:outline-hidden text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 p-1.5 min-h-[36px] max-h-[90px]"
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="h-8 sm:h-9 px-2.5 sm:px-4 bg-purple-600 hover:bg-purple-700 text-white shrink-0 rounded-lg shadow-xs transition-all disabled:opacity-50 text-xs font-semibold cursor-pointer"
                >
                  {isSending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline mr-1 text-xs font-semibold">Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 min-h-0 flex-col items-center justify-center text-center p-8 space-y-3 bg-slate-50/20">
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
