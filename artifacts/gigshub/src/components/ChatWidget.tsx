import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Loader2, ArrowDown,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/api";
import { UserAvatar, getAvatarSrc } from "@/components/ui/UserAvatar";

const ADMIN_AVATAR_URL = getAvatarSrc("mablequartey04@gmail.com", "adventurer");

type ChatMessage = {
  id: number;
  senderType: "user" | "admin";
  message: string;
  createdAt: string;
};

type AdminProfile = {
  name: string;
  avatarStyle: string;
  seed: string;
};

type ChatData = {
  conversationId: number | null;
  status: string;
  admin: AdminProfile | null;
  messages: ChatMessage[];
};

const QUICK_TOPICS = [
  "Data bundle issue",
  "Wallet top-up",
  "Account help",
  "Other",
];

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

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1100, now + 0.08);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.1);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);

    setTimeout(() => ctx.close(), 500);
  } catch {}
}

export function ChatWidget() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const lastSeenAdminMsgIdRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);

  const { data: chat, isLoading } = useQuery<ChatData>({
    queryKey: ["chat"],
    queryFn: () => chatFetch(""),
    enabled: isAuthenticated && isOpen,
    refetchInterval: isOpen ? 2000 : false,
    placeholderData: (prev) => prev,
  });

  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["chat-unread"],
    queryFn: () => chatFetch("/unread"),
    enabled: isAuthenticated && !isOpen,
    refetchInterval: 10000,
  });

  const { data: typingData } = useQuery<{ isTyping: boolean }>({
    queryKey: ["chat-typing"],
    queryFn: () => chatFetch("/typing"),
    enabled: isAuthenticated && isOpen,
    refetchInterval: 2000,
  });

  const adminIsTyping = typingData?.isTyping ?? false;

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingSentRef = useRef(0);

  const sendTypingSignal = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    chatFetch("/typing", { method: "POST" }).catch(() => {});
  }, []);

  const unreadCount = unreadData?.unreadCount ?? 0;

  useEffect(() => {
    if (!chat?.messages) return;
    const adminMsgs = chat.messages.filter(m => m.senderType === "admin");
    const latestAdminId = adminMsgs.length > 0 ? adminMsgs[adminMsgs.length - 1].id : 0;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastSeenAdminMsgIdRef.current = latestAdminId;
      return;
    }

    if (latestAdminId > lastSeenAdminMsgIdRef.current) {
      playNotificationSound();
      lastSeenAdminMsgIdRef.current = latestAdminId;
    }
  }, [chat?.messages?.length, chat?.messages?.at(-1)?.id]);

  useEffect(() => {
    if (!isOpen || !unreadData) return;
    if (unreadCount > 0) {
      playNotificationSound();
    }
  }, [isOpen]);

  const sendMessage = useMutation({
    mutationFn: (message: string) =>
      chatFetch("", { method: "POST", body: JSON.stringify({ message }) }),
    onMutate: async (message) => {
      setInput("");
      if (!chat?.conversationId) return;
      await qc.cancelQueries({ queryKey: ["chat"] });
      const previous = qc.getQueryData<ChatData>(["chat"]);
      qc.setQueryData<ChatData>(["chat"], (old) => {
        if (!old) return old;
        const optimistic: ChatMessage = {
          id: Date.now(),
          senderType: "user",
          message,
          createdAt: new Date().toISOString(),
        };
        return { ...old, messages: [...old.messages, optimistic] };
      });
      return { previous };
    },
    onError: (_err, _msg, context) => {
      if (context?.previous) qc.setQueryData(["chat"], context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
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

  const handleQuickTopic = (topic: string) => {
    sendMessage.mutate(topic);
  };

  const [location] = useLocation();

  const chatBgStyle = useMemo(() => ({
    backgroundImage: `url('https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABUV_jDjJ4_X_PSYgTJthNlfoStaN1fqwW1vcTx8bKIwYizu5-VL1365SJPeFB1FIig2dpPVvYdgfODQ9DEKR8t9Ak3G5NIa1HeWv.jpg?r=513')`,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
  }), []);

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
                <img
                  src={ADMIN_AVATAR_URL}
                  alt="Support"
                  className="w-10 h-10 rounded-full ring-2 ring-white/30 object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-orange-500 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">TurboGH Support</p>
                <p className="text-white/70 text-[11px]">Typically replies in minutes</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0"
              style={chatBgStyle}
            >
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-6 px-2">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm mb-4">
                    <p className="text-[13px] text-gray-800 font-medium">Hi! How can we help you today?</p>
                    <p className="text-[12px] text-gray-500 mt-1">Send us a message and we'll reply shortly.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TOPICS.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleQuickTopic(topic)}
                        disabled={sendMessage.isPending}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-300 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
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
                          {msg.senderType === "admin" ? (
                            <div className="shrink-0 mb-0.5">
                              <img src={ADMIN_AVATAR_URL} alt="Support" className="w-6 h-6 rounded-full object-cover" />
                            </div>
                          ) : (
                            <div className="shrink-0 mb-0.5">
                              <UserAvatar name={user?.name} seed={user?.email} size={24} avatarStyle={user?.avatarStyle} />
                            </div>
                          )}
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                              msg.senderType === "user"
                                ? "bg-white text-black rounded-br-md"
                                : "bg-white/90 text-black border border-white/20 shadow-sm rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className={`text-[9px] mt-1 ${
                              msg.senderType === "user" ? "text-black/40" : "text-black/40"
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
              {adminIsTyping && (
                <div className="flex justify-start mb-1.5">
                  <div className="flex items-end gap-1.5 max-w-[80%]">
                    <div className="shrink-0 mb-0.5">
                      <img src={ADMIN_AVATAR_URL} alt="Support" className="w-6 h-6 rounded-full object-cover" />
                    </div>
                    <div className="bg-white/90 border border-white/20 shadow-sm rounded-2xl rounded-bl-md px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (e.target.value.trim()) sendTypingSignal(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Message support..."
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
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">Enter to send &middot; Shift+Enter for new line</p>
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
