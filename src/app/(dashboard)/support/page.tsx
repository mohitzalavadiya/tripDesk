"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { platformChatClient } from "@/lib/api-client/platform-chat-client";
import { ConversationView } from "@/lib/services/platform-chat-service";
import {
  usePlatformChat,
  formatChatTime,
} from "@/hooks/use-platform-chat";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function SupportPage() {
  const { currentUser } = useAuth();
  const [conversation, setConversation] = React.useState<ConversationView | null>(null);
  const [isLoadingConv, setIsLoadingConv] = React.useState(true);
  const [convError, setConvError] = React.useState<string | null>(null);
  const [inputMessage, setInputMessage] = React.useState("");

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Initialize conversation
  const loadConversation = React.useCallback(async () => {
    setIsLoadingConv(true);
    setConvError(null);
    try {
      const res = await platformChatClient.getAgencyConversation();
      if (res.success && res.data) {
        setConversation(res.data);
      } else {
        setConvError(res.error?.message || "Failed to initialize support conversation");
      }
    } catch (err: any) {
      setConvError(err?.message || "Network error loading support conversation");
    } finally {
      setIsLoadingConv(false);
    }
  }, []);

  React.useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Hook for realtime chat messages
  const {
    messages,
    isLoadingHistory,
    isSending,
    connectionStatus,
    error: chatError,
    sendMessage,
    reloadHistory,
  } = usePlatformChat({
    conversationId: conversation?.id || null,
    agencyId: currentUser?.agencyId || undefined,
    currentUserRole: currentUser?.role || "AGENCY_OWNER",
  });

  // Auto scroll to bottom
  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const textToSend = inputMessage;
    setInputMessage("");
    const sent = await sendMessage(textToSend);
    if (!sent) {
      setInputMessage(textToSend); // Restore on error
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

  if (isLoadingConv) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Connecting to TripDesk Support...</p>
      </div>
    );
  }

  if (convError || !conversation) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-rose-100 rounded-xl shadow-xs text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Support Channel Unavailable</h3>
        <p className="text-sm text-slate-600">{convError || "Could not open support session."}</p>
        <Button onClick={loadConversation} className="bg-purple-600 hover:bg-purple-700 text-white">
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-4 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">TripDesk Support</h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Official Platform Team
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Direct assistance with onboarding, trial questions, plan changes & technical support.
            </p>
          </div>
        </div>

        {/* Realtime status */}
        <div className="flex items-center gap-2 text-xs">
          {connectionStatus === "CONNECTED" && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>
          )}
          {connectionStatus === "CONNECTING" && (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Connecting...
            </span>
          )}
          {(connectionStatus === "DISCONNECTED" || connectionStatus === "ERROR") && (
            <button
              onClick={reloadHistory}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full border border-slate-300 transition-colors"
            >
              <WifiOff className="h-3 w-3 text-rose-500" />
              Offline (Click to Refresh)
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl flex-1 p-4 overflow-y-auto flex flex-col space-y-4 shadow-inner">
        {isLoadingHistory && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            Loading message history...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="h-12 w-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Welcome to TripDesk Support!</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Ask anything about your workspace setup, rates, itineraries, subscriptions, or feature requests. A platform specialist will assist you promptly.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === "AGENCY_OWNER";
            const formattedTime = formatChatTime(msg.createdAt);

            return (
              <div
                key={msg.id || msg.clientMessageId}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-full`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700">
                    {isMe ? "You" : "TripDesk Team"}
                  </span>
                  {!isMe && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                      SUPPORT
                    </span>
                  )}
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

                {/* Status indicator for my optimistic messages */}
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

      {/* Chat Composer */}
      <form
        onSubmit={handleSend}
        className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-xs flex items-end gap-2 shrink-0"
      >
        <textarea
          ref={inputRef}
          rows={2}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question or request (Press Enter to send, Shift+Enter for new line)..."
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
  );
}
