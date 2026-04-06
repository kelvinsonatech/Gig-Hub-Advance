const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

function toRef(id: string | number): string {
  const num = String(id).padStart(6, "0");
  return `GH-${num.slice(-4).toUpperCase()}`;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export async function sendOrderNotification(order: {
  id: string;
  amount: number;
  status: string;
  details?: Record<string, any>;
  user: { name: string; email: string; phone?: string };
}): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const d       = order.details ?? {};
  const network = d.networkName  ? escapeMarkdown(d.networkName)  : "—";
  const bundle  = d.bundleName   ? escapeMarkdown(d.bundleName)   : "—";
  const data    = d.data         ? escapeMarkdown(d.data)         : "";
  const phone   = d.phoneNumber  ? escapeMarkdown(d.phoneNumber)  : "—";
  const userName = escapeMarkdown(order.user.name || "Unknown");
  const userEmail = escapeMarkdown(order.user.email || "");
  const ref     = escapeMarkdown(toRef(order.id));
  const amount  = order.amount.toFixed(2);
  const now     = new Date().toLocaleString("en-GH", {
    timeZone: "Africa/Accra",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const text = [
    `🛒 *New Order Received\\!*`,
    ``,
    `📦 *Bundle:* ${network} · ${bundle}${data ? ` \\(${data}\\)` : ""}`,
    `📱 *Phone:* \`${phone}\``,
    `💵 *Amount:* GHS ${escapeMarkdown(amount)}`,
    ``,
    `👤 *Customer:* ${userName}`,
    userEmail ? `📧 ${userEmail}` : null,
    ``,
    `🔖 *Ref:* \`${ref}\``,
    `🕐 ${escapeMarkdown(now)}`,
    ``,
    `⚡ Status: *Processing*`,
  ].filter(Boolean).join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "MarkdownV2",
      }),
    });
  } catch {
    // Non-critical — don't let Telegram failure affect order flow
  }
}
