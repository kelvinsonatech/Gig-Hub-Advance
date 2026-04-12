const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

function toRef(id: string | number): string {
  const num = String(id).padStart(6, "0");
  return `GH-${num.slice(-4).toUpperCase()}`;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

console.log(`[Telegram] Config: ${BOT_TOKEN && CHAT_ID ? "✓ BOT_TOKEN + CHAT_ID present" : "✗ Missing credentials"}`);

export async function sendFulfillmentAlert(order: {
  id: number;
  amount: string;
  details: any;
}, reason: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const d = order.details ?? {};
  const ref = escapeHtml(toRef(order.id));
  const network = d.networkName ? escapeHtml(d.networkName) : "—";
  const bundle = d.bundleName ? escapeHtml(d.bundleName) : "—";
  const data = d.data ? escapeHtml(d.data) : "";
  const phone = d.phoneNumber ? escapeHtml(d.phoneNumber) : "—";

  const lines = [
    `⚠️ <b>Auto-Fulfillment Failed</b>`,
    ``,
    `📦 ${network} · ${bundle}${data ? ` (${data})` : ""}`,
    `📱 <code>${phone}</code>`,
    `💵 GHS ${parseFloat(order.amount).toFixed(2)}`,
    `🔖 <code>${ref}</code>`,
    ``,
    `❌ <b>Reason:</b> ${escapeHtml(reason)}`,
    ``,
    `👉 Order is waiting for <b>manual delivery</b>.`,
    `Top up JessCo or deliver manually from the admin panel.`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: lines, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[Telegram] Failed to send fulfillment alert:", err);
  }
}

export async function sendOrderNotification(order: {
  id: string;
  amount: number;
  status: string;
  type?: string;
  details?: Record<string, any>;
  user: { name: string; email: string; phone?: string };
}): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[Telegram] Missing BOT_TOKEN or CHAT_ID — skipping notification");
    return;
  }

  const d       = order.details ?? {};
  const pm      = d.paymentMethod ?? "momo";
  const network = d.networkName  ? escapeHtml(d.networkName)  : "—";
  const bundle  = d.bundleName   ? escapeHtml(d.bundleName)   : "—";
  const data    = d.data         ? escapeHtml(d.data)         : "";
  const phone   = d.phoneNumber  ? escapeHtml(d.phoneNumber)  : "—";
  const pmLabel = pm === "wallet" ? "💚 Wallet" : "📲 Mobile Money";
  const userName  = escapeHtml(order.user.name  || "Unknown");
  const userEmail = escapeHtml(order.user.email || "");
  const ref       = escapeHtml(toRef(order.id));
  const amount    = order.amount.toFixed(2);
  const now       = new Date().toLocaleString("en-GH", {
    timeZone: "Africa/Accra",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const mode = d.fulfillmentMode;
  const modeLabel = mode === "api" ? "⚡ API (Auto)" : mode === "manual" ? "🖐 Manual" : "";

  const typeLabel =
    order.type === "bundle" ? "Data Bundle"
    : order.type === "afa_registration" ? "AFA Registration"
    : order.type === "agent_registration" ? "Agent Registration"
    : "Order";

  const lines = [
    `🛒 <b>New ${typeLabel}!</b>`,
    ``,
    `📦 <b>Bundle:</b> ${network} · ${bundle}${data ? ` (${data})` : ""}`,
    `📱 <b>Phone:</b> <code>${phone}</code>`,
    `💵 <b>Amount:</b> GHS ${amount}`,
    `💳 <b>Payment:</b> ${pmLabel}`,
    modeLabel ? `🔧 <b>Mode:</b> ${modeLabel}` : null,
    ``,
    `👤 <b>Customer:</b> ${userName}`,
    userEmail ? `📧 ${userEmail}` : null,
    ``,
    `🔖 <b>Ref:</b> <code>${ref}</code>`,
    `🕐 ${now}`,
    ``,
    `⚡ Status: <b>${order.status === "processing" ? "Processing" : order.status === "pending" ? "Pending" : order.status}</b>`,
  ].filter((l): l is string => l !== null).join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: lines,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[Telegram] API error:", JSON.stringify(body));
    } else {
      console.log(`[Telegram] Notification sent for order ${order.id}`);
    }
  } catch (err) {
    console.error("[Telegram] Failed to send notification:", err);
  }
}
