import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Loader2, ArrowDown,
  Headphones, Smile,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/api";
import { UserAvatar } from "@/components/ui/UserAvatar";

type ChatMessage = {
  id: number;
  senderType: "user" | "admin";
  message: string;
  createdAt: string;
};

type ChatData = {
  conversationId: number;
  status: string;
  messages: ChatMessage[];
};

async function chatFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}/api/chat${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ChatWidget() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const { data: chat, isLoading } = useQuery<ChatData>({
    queryKey: ["chat"],
    queryFn: () => chatFetch(""),
    enabled: isAuthenticated && isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["chat-unread"],
    queryFn: () => chatFetch("/unread"),
    enabled: isAuthenticated && !isOpen,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  const sendMessage = useMutation({
    mutationFn: (message: string) =>
      chatFetch("", { method: "POST", body: JSON.stringify({ message }) }),
    onSuccess: (newMsg) => {
      qc.setQueryData<ChatData>(["chat"], (old) => {
        if (!old) return old;
        return { ...old, messages: [...old.messages, newMsg] };
      });
      setInput("");
      qc.invalidateQueries({ queryKey: ["chat-unread"] });
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen && chat?.messages) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, chat?.messages?.length, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      qc.invalidateQueries({ queryKey: ["chat-unread"] });
    }
  }, [isOpen, qc]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const [location] = useLocation();

  if (!isAuthenticated || location.startsWith("/admin")) return null;

  const messages = chat?.messages ?? [];

  let lastDateLabel = "";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[380px] max-h-[min(520px,calc(100vh-140px))] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-orange-500 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">TurboGH Support</p>
                <p className="text-white/70 text-[11px]">We typically reply within minutes</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0 bg-gray-50/50">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-7 h-7 text-orange-500" />
                  </div>
                  <p className="font-bold text-gray-800 text-sm">Start a conversation</p>
                  <p className="text-xs text-gray-500 mt-1">Ask us anything — we're here to help!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const dateLabel = formatDateLabel(msg.createdAt);
                  const showDate = dateLabel !== lastDateLabel;
                  lastDateLabel = dateLabel;

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-2">
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                            {dateLabel}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.senderType === "user" ? "justify-end" : "justify-start"} mb-1.5`}>
                        <div className={`flex items-end gap-1.5 max-w-[80%] ${msg.senderType === "user" ? "flex-row-reverse" : ""}`}>
                          {msg.senderType === "admin" && (
                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mb-0.5">
                              <Headphones className="w-3 h-3 text-orange-600" />
                            </div>
                          )}
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                              msg.senderType === "user"
                                ? "bg-orange-500 text-white rounded-br-md"
                                : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className={`text-[9px] mt-1 ${
                              msg.senderType === "user" ? "text-white/60" : "text-gray-400"
                            }`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all max-h-24"
                  style={{ minHeight: 40 }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sendMessage.isPending}
                  className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[55] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 ${
          isOpen
            ? "bg-gray-800 hover:bg-gray-700 scale-0 pointer-events-none"
            : "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:-translate-y-0.5"
        }`}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
