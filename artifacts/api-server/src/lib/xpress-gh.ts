import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pushEventToUser, pushEventToAdmins } from "./sse";
import { sendFulfillmentAlert } from "./telegram";

const XPRESS_GH_API_KEY = process.env.XPRESS_GH_API_KEY || "";
const XPRESS_GH_WEBHOOK_SECRET = process.env.XPRESS_GH_WEBHOOK_SECRET || "";
const BASE_URL = "https://labppmcqsdeuollwcgwu.supabase.co/functions/v1/agent-api";

export function getXpressGhWebhookSecret(): string {
  return XPRESS_GH_WEBHOOK_SECRET;
}

export interface FulfillResult {
  success: boolean;
  providerRef?: string;
  xpressOrderId?: string;
  message?: string;
  rawResponse?: any;
}

const networkServiceMap: Record<string, "mtn" | "at" | "telecel"> = {
  mtn: "mtn",
  mtnghana: "mtn",
  at: "at",
  atl: "at",
  airteltigo: "at",
  airtel: "at",
  tigo: "at",
  telecel: "telecel",
  telecelghana: "telecel",
  vodafone: "telecel",
  vodafoneghana: "telecel",
};

function mapNetworkToService(networkName: string): "mtn" | "at" | "telecel" | null {
  const code = networkName.toLowerCase().replace(/\s+/g, "");
  return networkServiceMap[code] ?? null;
}

/** Convert bundle data string (e.g. "1GB", "2 GB", "500MB") to whole GB integer.
 *  Xpress-gh only accepts whole GB — sub-GB or fractional bundles return null. */
function dataToWholeGB(input: string): number | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d+(?:\.\d+)?)\s*(gb|mb|tb)$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  let gb: number;
  if (unit === "gb") gb = num;
  else if (unit === "tb") gb = num * 1024;
  else if (unit === "mb") gb = num / 1024;
  else return null;
  if (gb < 1 || !Number.isInteger(gb)) return null;
  return gb;
}

async function markPendingManual(orderId: number, details: any, reason: string) {
  await db
    .update(ordersTable)
    .set({
      details: {
        ...details,
        fulfillmentProvider: "xpress_gh",
        fulfillmentStatus: "pending_manual",
        fulfillmentError: reason,
        fulfillmentFailedAt: new Date().toISOString(),
      },
    })
    .where(eq(ordersTable.id, orderId));
}

const inFlightOrders = new Set<number>();

export async function fulfillBundle(order: {
  id: number;
  userId: number;
  details: any;
  amount: string;
}): Promise<FulfillResult> {
  const details = order.details as any;

  if (details?.fulfillmentStatus === "sent" || details?.fulfillmentStatus === "delivered") {
    return { success: false, message: "Order already fulfilled or in flight" };
  }
  if (inFlightOrders.has(order.id)) {
    return { success: false, message: "Fulfillment already in progress for this order" };
  }
  if (!details?.phoneNumber || !details?.networkName) {
    const msg = "Missing phoneNumber or networkName in order details";
    await markPendingManual(order.id, details, msg);
    return { success: false, message: msg };
  }
  if (!XPRESS_GH_API_KEY) {
    const msg = "XPRESS_GH_API_KEY not configured";
    await markPendingManual(order.id, details, msg);
    return { success: false, message: msg };
  }

  const service = mapNetworkToService(details.networkName);
  if (!service) {
    const msg = `Unsupported network for Xpress-gh: "${details.networkName}"`;
    await markPendingManual(order.id, details, msg);
    return { success: false, message: msg };
  }

  const dataGB = dataToWholeGB(details.data || "");
  if (dataGB == null) {
    const msg = `Xpress-gh only supports whole-GB bundles — got "${details.data}"`;
    await markPendingManual(order.id, details, msg);
    return { success: false, message: msg };
  }

  inFlightOrders.add(order.id);
  const msisdn = details.phoneNumber.replace(/\s+/g, "");
  const reference = details.xpressGhReference || `TGGH-${order.id}`;

  try {
    const payload = {
      service,
      items: [{ msisdn, data_gb: dataGB, reference }],
    };

    console.log(
      `[Xpress-gh] Order ${order.id}: POST /orders ${service} ${msisdn} ${dataGB}GB ref=${reference}`
    );

    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": XPRESS_GH_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    console.log(`[Xpress-gh] Order ${order.id} response (HTTP ${res.status}):`, rawText.slice(0, 800));

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: "Invalid JSON response", rawBody: rawText.slice(0, 500) };
    }

    if (res.ok && data.order_id) {
      await db
        .update(ordersTable)
        .set({
          details: {
            ...details,
            xpressGhReference: reference,
            xpressGhOrderId: data.order_id,
            xpressGhCharged: data.charged,
            fulfillmentProvider: "xpress_gh",
            fulfillmentStatus: "sent",
          },
        })
        .where(eq(ordersTable.id, order.id));

      return {
        success: true,
        providerRef: reference,
        xpressOrderId: data.order_id,
        rawResponse: data,
      };
    }

    const errorMsg = data.error || data.message || `API returned status ${res.status}`;
    console.error(`[Xpress-gh] Order ${order.id} failed:`, JSON.stringify(data).slice(0, 500));
    await markPendingManual(order.id, details, errorMsg);
    return { success: false, message: errorMsg, rawResponse: data };
  } catch (err: any) {
    const msg = `Network error: ${err.message}`;
    console.error(`[Xpress-gh] Order ${order.id} network error:`, err.message);
    await markPendingManual(order.id, details, msg).catch(() => {});
    return { success: false, message: msg };
  } finally {
    inFlightOrders.delete(order.id);
  }
}

/** Webhook handler — Xpress-gh sends order.updated / item.completed /
 *  item.failed / item.refunded events. We treat our single-item orders by
 *  matching on item.reference (which we set to TGGH-<order_id>). */
export async function handleXpressGhWebhook(payload: any): Promise<void> {
  console.log("[Xpress-gh Webhook] Received:", JSON.stringify(payload).slice(0, 1000));

  const items: any[] = Array.isArray(payload.items) ? payload.items : [];
  const orderId = payload.order_id ?? null;
  const topStatus = (payload.status ?? "").toString().toLowerCase();

  if (items.length === 0 && !orderId) {
    console.warn("[Xpress-gh Webhook] No items or order_id in payload");
    return;
  }

  // Build per-item updates. Fall back to order-level status if no items.
  const updates =
    items.length > 0
      ? items.map((it) => ({
          reference: String(it.reference ?? ""),
          status: (it.status ?? topStatus).toString().toLowerCase(),
        }))
      : [{ reference: "", status: topStatus, fallbackOrderId: orderId }];

  for (const u of updates) {
    await applyItemUpdate(u);
  }
}

async function applyItemUpdate(u: {
  reference: string;
  status: string;
  fallbackOrderId?: string;
}): Promise<void> {
  let outcome: "completed" | "failed" | "refunded" | null = null;
  if (["completed", "success", "successful", "delivered"].includes(u.status)) {
    outcome = "completed";
  } else if (["failed", "failure", "error", "rejected"].includes(u.status)) {
    outcome = "failed";
  } else if (u.status === "refunded") {
    outcome = "refunded";
  }
  if (!outcome) {
    console.log(`[Xpress-gh Webhook] Status "${u.status}" — no DB update needed`);
    return;
  }

  // Restrict matching to Xpress-tagged orders only. We require either a stored
  // xpressGhReference / xpressGhOrderId match — never a bare reference-pattern
  // match — so even an authenticated webhook can't flip an order that was
  // never sent to Xpress-gh.
  const allOrders = await db.select().from(ordersTable);
  const order = allOrders.find((o) => {
    const d = o.details as any;
    if (d?.fulfillmentProvider !== "xpress_gh") return false;
    if (u.reference && d?.xpressGhReference === u.reference) return true;
    if (u.fallbackOrderId && d?.xpressGhOrderId === String(u.fallbackOrderId)) return true;
    return false;
  });

  if (!order) {
    console.warn(
      `[Xpress-gh Webhook] No matching order for reference="${u.reference}" fallback="${u.fallbackOrderId}"`
    );
    return;
  }

  if (outcome === "completed") {
    if (order.status === "completed") return;
    await db
      .update(ordersTable)
      .set({
        status: "completed",
        details: {
          ...(order.details as any),
          fulfillmentStatus: "delivered",
          webhookStatus: u.status,
          deliveredAt: new Date().toISOString(),
        },
      })
      .where(eq(ordersTable.id, order.id));

    console.log(`[Xpress-gh Webhook] Order ${order.id} → completed`);
    pushEventToUser(order.userId, "order_update", { id: String(order.id), status: "completed" });
    pushEventToAdmins("order_status_updated", { id: String(order.id), status: "completed" });
  } else {
    // failed or refunded — Xpress-gh auto-refunds the wallet on their side,
    // so on our side we just mark for manual follow-up + alert admin.
    const reason = `Xpress-gh reported: ${u.status}${outcome === "refunded" ? " (auto-refunded by provider)" : ""}`;
    await db
      .update(ordersTable)
      .set({
        details: {
          ...(order.details as any),
          fulfillmentStatus: "pending_manual",
          fulfillmentError: reason,
          fulfillmentFailedAt: new Date().toISOString(),
          webhookStatus: u.status,
        },
      })
      .where(eq(ordersTable.id, order.id));

    console.log(`[Xpress-gh Webhook] Order ${order.id} → pending_manual (${u.status})`);
    sendFulfillmentAlert(order, reason).catch(() => {});
    pushEventToAdmins("order_status_updated", {
      id: String(order.id),
      status: "processing",
      note: "Auto-fulfillment failed — needs manual delivery",
    });
  }
}

/** Background poller — checks pending Xpress-gh orders by re-fetching
 *  the order from /orders/:id. Catches missed webhooks. */
async function pollPendingOrders(): Promise<void> {
  if (!XPRESS_GH_API_KEY) return;
  try {
    const allOrders = await db.select().from(ordersTable);
    const pending = allOrders.filter((o) => {
      const d = o.details as any;
      return (
        d?.fulfillmentProvider === "xpress_gh" &&
        d?.xpressGhOrderId &&
        (d?.fulfillmentStatus === "sent" || o.status === "processing")
      );
    });
    if (pending.length === 0) return;

    console.log(`[Xpress-gh Poller] Checking ${pending.length} pending order(s)...`);

    for (const order of pending) {
      const details = order.details as any;
      try {
        const res = await fetch(`${BASE_URL}/orders/${details.xpressGhOrderId}`, {
          headers: { "X-API-Key": XPRESS_GH_API_KEY },
        });
        if (!res.ok) {
          console.warn(`[Xpress-gh Poller] HTTP ${res.status} for ${details.xpressGhOrderId}`);
          continue;
        }
        const body = (await res.json()) as any;
        const items: any[] = Array.isArray(body?.items) ? body.items : [];
        for (const it of items) {
          await applyItemUpdate({
            reference: String(it.reference ?? `TGGH-${order.id}`),
            status: (it.status ?? "").toString().toLowerCase(),
            fallbackOrderId: body?.id,
          });
        }
      } catch (err: any) {
        console.error(`[Xpress-gh Poller] Error for order ${order.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[Xpress-gh Poller] Top-level error:", err);
  }
}

let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startXpressGhPoller(intervalMs = 30_000): void {
  if (pollerInterval) return;
  console.log(`[Xpress-gh Poller] Started — checking every ${intervalMs / 1000}s`);
  pollerInterval = setInterval(pollPendingOrders, intervalMs);
  setTimeout(pollPendingOrders, 5000);
}

export function stopXpressGhPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("[Xpress-gh Poller] Stopped");
  }
}

/** Wallet balance check — useful for the admin dashboard. */
export async function getXpressGhWalletBalance(): Promise<{
  ok: boolean;
  balance?: number;
  error?: string;
}> {
  if (!XPRESS_GH_API_KEY) return { ok: false, error: "API key not configured" };
  try {
    const res = await fetch(`${BASE_URL}/wallet`, {
      headers: { "X-API-Key": XPRESS_GH_API_KEY },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = (await res.json()) as any;
    return { ok: true, balance: body?.balance_ghs };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
