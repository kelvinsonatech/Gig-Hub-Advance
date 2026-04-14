import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Send, MessageCircle, X, ArrowLeft,
  Clock, User, Mail, Phone, XCircle, RotateCcw,
  CheckCheck, Circle,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}/api/admin${path}`, {
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

type ConversationSummary = {
  id: number;
  status: "open" | "closed";
  subject: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string; phone: string };
  lastMessage: { message: string; senderType: "user" | "admin"; createdAt: string } | null;
  unreadCount: number;
};

type ChatMessage = {
  id: number;
  senderType: "user" | "admin";
  message: string;
  isRead: boolean;
  createdAt: string;
};

type ConversationDetail = {
  id: number;
  status: "open" | "closed";
  subject: string | null;
  user: { name: string; email: string; phone: string };
  messages: ChatMessage[];
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return formatTime(iso);
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: {
  conversations: ConversationSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
}) {
  const open = conversations.filter(c => c.status === "open");
  const closed = conversations.filter(c => c.status === "closed");

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No conversations yet</p>
        <p className="text-xs text-gray-400 mt-1">Customer chats will appear here</p>
      </div>
    );
  }

  const renderList = (list: ConversationSummary[], label: string) => (
    list.length > 0 && (
      <div>
        <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        {list.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 ${
              selectedId === c.id
                ? "bg-orange-50 border-l-2 border-l-orange-500"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="relative shrink-0 mt-0.5">
              <UserAvatar name={c.user.name} seed={c.user.email} size={38} />
              {c.status === "open" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900 truncate">{c.user.name}</p>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {c.lastMessage ? formatDate(c.lastMessage.createdAt) : formatDate(c.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-gray-500 truncate">
                  {c.lastMessage
                    ? `${c.lastMessage.senderType === "admin" ? "You: " : ""}${c.lastMessage.message}`
                    : "No messages yet"
                  }
                </p>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[20px] h-[20px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  );

  return (
    <div className="overflow-y-auto">
      {renderList(open, `Open (${open.length})`)}
      {renderList(closed, `Closed (${closed.length})`)}
    </div>
  );
}

function ChatPanel({
  conversationId,
  onBack,
}: {
  conversationId: number;
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: chat, isLoading } = useQuery<ConversationDetail>({
    queryKey: ["admin-chat", conversationId],
    queryFn: () => apiFetch(`/chats/${conversationId}`),
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: (message: string) =>
      apiFetch(`/chats/${conversationId}`, { method: "POST", body: JSON.stringify({ message }) }),
    onSuccess: (newMsg) => {
      qc.setQueryData<ConversationDetail>(["admin-chat", conversationId], (old) => {
        if (!old) return old;
        return { ...old, messages: [...old.messages, newMsg] };
      });
      setInput("");
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const closeChat = useMutation({
    mutationFn: () => apiFetch(`/chats/${conversationId}/close`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat", conversationId] });
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
      toast({ title: "Conversation closed" });
    },
  });

  const reopenChat = useMutation({
    mutationFn: () => apiFetch(`/chats/${conversationId}/reopen`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat", conversationId] });
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
      toast({ title: "Conversation reopened" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length]);

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

  const messages = chat?.messages ?? [];
  let lastDateLabel = "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        <button onClick={onBack} className="lg:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        {chat && (
          <>
            <UserAvatar name={chat.user.name} seed={chat.user.email} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{chat.user.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-0.5">
                  <Mail className="w-3 h-3" /> {chat.user.email}
                </span>
                {chat.user.phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="w-3 h-3" /> {chat.user.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {chat.status === "open" ? (
                <button
                  onClick={() => closeChat.mutate()}
                  disabled={closeChat.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Close
                </button>
              ) : (
                <button
                  onClick={() => reopenChat.mutate()}
                  disabled={reopenChat.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reopen
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50/50 min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const dateLabel = formatDateLabel(msg.createdAt);
            const showDate = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <div className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"} mb-1.5`}>
                  <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    msg.senderType === "admin"
                      ? "bg-orange-500 text-white rounded-br-md"
                      : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <div className={`flex items-center gap-1 mt-1 ${
                      msg.senderType === "admin" ? "text-white/60 justify-end" : "text-gray-400"
                    }`}>
                      <span className="text-[9px]">{formatTime(msg.createdAt)}</span>
                      {msg.senderType === "admin" && (
                        <CheckCheck className={`w-3 h-3 ${msg.isRead ? "text-blue-300" : "text-white/40"}`} />
                      )}
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chat?.status === "closed" ? "Reopen to reply..." : "Type your reply..."}
            disabled={chat?.status === "closed"}
            rows={1}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all max-h-24 disabled:opacity-50"
            style={{ minHeight: 40 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending || chat?.status === "closed"}
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
    </div>
  );
}

export default function AdminChat() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: conversations = [], isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ["admin-chats"],
    queryFn: () => apiFetch("/chats"),
    refetchInterval: 10000,
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Support Chat</h1>
          {totalUnread > 0 && (
            <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {totalUnread} new
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Respond to customer messages</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
        <div className="flex h-full">
          {/* Sidebar — conversation list */}
          <div className={`w-full lg:w-[340px] border-r border-gray-100 flex flex-col shrink-0 ${
            selectedId !== null ? "hidden lg:flex" : "flex"
          }`}>
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-sm font-bold text-gray-700">Conversations</p>
              <p className="text-[11px] text-gray-400">{conversations.length} total</p>
            </div>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isLoading={isLoading}
            />
          </div>

          {/* Chat panel */}
          <div className={`flex-1 flex flex-col min-w-0 ${
            selectedId === null ? "hidden lg:flex" : "flex"
          }`}>
            {selectedId === null ? (
              <div className="flex-1 flex items-center justify-center bg-gray-50/50">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Select a conversation</p>
                  <p className="text-xs text-gray-400 mt-1">Choose from the list to start replying</p>
                </div>
              </div>
            ) : (
              <ChatPanel
                conversationId={selectedId}
                onBack={() => setSelectedId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
