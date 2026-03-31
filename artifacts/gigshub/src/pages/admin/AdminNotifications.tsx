import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Send, Trash2, ImageIcon, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");
const token = () => localStorage.getItem("gigshub_token");

async function fetchNotifications() {
  const res = await fetch(`${API}/api/admin/notifications`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function sendNotification(data: { title: string; message: string; imageUrl?: string; userId?: string }) {
  const res = await fetch(`${API}/api/admin/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to send");
  return res.json();
}

async function deleteNotification(id: string) {
  const res = await fetch(`${API}/api/admin/notifications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [success, setSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchNotifications,
  });

  const sendMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      setTitle("");
      setMessage("");
      setImageUrl("");
      setUserId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    sendMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl.trim() || undefined,
      userId: userId.trim() || undefined,
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">Send messages to users — supports image links</p>
      </div>

      {/* Send form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#E91E8C]" /> Send Notification
        </h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. New Bundle Available!"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Write your message here..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Image URL (optional)
            </label>
            <input
              value={imageUrl}
              onChange={e => { setImageUrl(e.target.value); setImgError(false); }}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C]"
            />
            {/* Live preview */}
            {imageUrl.trim() && (
              <div className="mt-2.5">
                {imgError ? (
                  <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    Could not load image — check the URL
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={imageUrl.trim()}
                      alt="Preview"
                      className="w-full max-h-52 object-contain"
                      onError={() => setImgError(true)}
                      onLoad={() => setImgError(false)}
                    />
                    <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full">
                      Preview
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Target User ID (leave blank to send to ALL users)
            </label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="e.g. 42 — or leave empty for broadcast"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C]"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={sendMutation.isPending || !title.trim() || !message.trim()}
              className="bg-[#E91E8C] hover:bg-[#d4197f] text-white rounded-xl px-5"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? "Sending..." : userId ? "Send to User" : "Broadcast to All"}
            </Button>
            {success && (
              <span className="text-sm text-emerald-600 font-medium">✓ Notification sent!</span>
            )}
            {sendMutation.isError && (
              <span className="text-sm text-red-500">Failed to send. Try again.</span>
            )}
          </div>
        </form>
      </div>

      {/* Sent notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E91E8C]" /> Sent Notifications
          </h2>
          <span className="text-xs text-gray-400">{notifications.length} total</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n: any) => (
              <div key={n.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/50">
                {n.imageUrl && (
                  <img src={n.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${n.userId ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
                      {n.userId ? <><User className="w-2.5 h-2.5 inline mr-0.5" />User #{n.userId}</> : <><Users className="w-2.5 h-2.5 inline mr-0.5" />All users</>}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{format(new Date(n.createdAt), "MMM d, yyyy · h:mm a")}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(n.id)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
