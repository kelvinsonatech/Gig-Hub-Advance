import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pushEventToUser, pushEventToAdmins } from "./sse";
import { sendFulfillmentAlert } from "./telegram";

async function markPendingManual(orderId: number, details: any, reason: string) {
  await db.update(ordersTable)
    .set({
      details: {
        ...details,
        fulfillmentProvider: "jessco",
        fulfillmentStatus: "pending_manual",
        fulfillmentError: reason,
        fulfillmentFailedAt: new Date().toISOString(),
      },
    })
    .where(eq(ordersTable.id, orderId));
}

const JESSCO_API_KEY = process.env.XPRESPORTAL_API_KEY || "";
const JESSCO_WEBHOOK_SECRET = process.env.XPRESPORTAL_WEBHOOK_SECRET || "";
const BASE_URL = "https://jesscostore.com/api/v1";

export interface FulfillResult {
  success: boolean;
  providerRef?: string;
  jesscoId?: number;
  message?: string;
  rawResponse?: any;
}

let cachedPackages: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchJesscoPackages(): Promise<any[]> {
  const now = Date.now();
  if (cachedPackages && now - cacheTimestamp < CACHE_TTL) {
    return cachedPackages;
  }

  try {
    console.log("[JessCo] Fetching available packages...");
    const res = await fetch(`${BASE_URL}/packages`, {
      headers: { Authorization: `Bearer ${JESSCO_API_KEY}` },
    });
    const body = await res.json();
    if (body.success && Array.isArray(body.data)) {
      cachedPackages = body.data;
      cacheTimestamp = now;
      const totalPkgs = body.data.reduce((n: number, cat: any) => n + (cat.packages?.length || 0), 0);
      console.log(`[JessCo] Cached ${totalPkgs} packages across ${body.data.length} categories`);
      return body.data;
    }
    console.warn("[JessCo] Unexpected packages response:", JSON.stringify(body).slice(0, 500));
    return cachedPackages || [];
  } catch (err: any) {
    console.error("[JessCo] Failed to fetch packages:", err.message);
    return cachedPackages || [];
  }
}

function findJesscoPackage(
  categories: any[],
  networkName: string,
  bundleName: string,
  dataAmount: string,
  price: number
): { id: string; name: string } | null {
  const netCode = networkName.toLowerCase().replace(/\s+/g, "");
  const netMap: Record<string, string[]> = {
    mtn: ["mtn"],
    mtnghana: ["mtn"],
    at: ["at", "atl", "airteltigo", "airtel", "tigo"],
    airteltigo: ["at", "atl", "airteltigo"],
    airtel: ["at", "atl", "airteltigo"],
    tigo: ["at", "atl", "airteltigo"],
    telecel: ["telecel", "vod", "vodafone"],
    telecelghana: ["telecel", "vod", "vodafone"],
    vodafone: ["telecel", "vod", "vodafone"],
    vodafoneghana: ["telecel", "vod", "vodafone"],
  };
  const validCodes = netMap[netCode] || [netCode];

  const allPackages: any[] = [];
  for (const cat of categories) {
    const catNet = cat.network?.code?.toLowerCase();
    if (!catNet || !validCodes.includes(catNet)) continue;
    for (const pkg of cat.packages || []) {
      allPackages.push(pkg);
    }
  }

  console.log(`[JessCo] Matching: network="${networkName}" (codes: ${validCodes.join(",")}), bundle="${bundleName}", data="${dataAmount}", price=${price}`);
  console.log(`[JessCo] Found ${allPackages.length} packages for network. Options:`, allPackages.map(p => `${p.id}|${p.name}|val=${p.value}|GHS${p.price}`).join(" | "));

  if (allPackages.length === 0) return null;

  const normalizedData = dataAmount.toLowerCase().replace(/\s+/g, "");
  const normalizedName = bundleName.toLowerCase().replace(/\s+/g, "").replace(/^(mtn|at|telecel|airteltigo|vodafone)\s*/i, "");

  function pkgValueStr(pkg: any): string {
    if (typeof pkg.value === "number") return String(pkg.value);
    return String(pkg.value || "").toLowerCase().replace(/\s+/g, "");
  }

  function dataToMB(input: string): number | null {
    const m = input.match(/^(\d+(?:\.\d+)?)\s*(gb|mb|tb)$/i);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === "gb") return num * 1024;
    if (unit === "tb") return num * 1024 * 1024;
    return num;
  }

  const requestedMB = dataToMB(normalizedData);

  if (requestedMB !== null) {
    for (const pkg of allPackages) {
      const val = typeof pkg.value === "number" ? pkg.value : parseFloat(pkg.value);
      if (!isNaN(val) && Math.abs(val - requestedMB) < 1) {
        console.log(`[JessCo] Matched by MB value: ${pkg.id} (${val}MB = ${normalizedData})`);
        return { id: pkg.id, name: pkg.name };
      }
    }
  }

  const pkgIdData = normalizedData.replace(/\s+/g, "").toUpperCase();
  for (const pkg of allPackages) {
    const pkgId = (pkg.id || "").toUpperCase();
    if (pkgId.includes(pkgIdData)) {
      console.log(`[JessCo] Matched by package ID containing "${pkgIdData}": ${pkg.id}`);
      return { id: pkg.id, name: pkg.name };
    }
  }

  for (const pkg of allPackages) {
    const pkgName = (pkg.name || "").toLowerCase().replace(/\s+/g, "");
    if (pkgName === normalizedData || pkgName.includes(normalizedData) || normalizedData.includes(pkgName)) {
      console.log(`[JessCo] Matched by name: ${pkg.id} (${pkg.name})`);
      return { id: pkg.id, name: pkg.name };
    }
  }

  for (const pkg of allPackages) {
    const pkgName = (pkg.name || "").toLowerCase().replace(/\s+/g, "");
    if (pkgName === normalizedName || pkgName.includes(normalizedName) || normalizedName.includes(pkgName)) {
      console.log(`[JessCo] Matched by bundle name: ${pkg.id} (${pkg.name})`);
      return { id: pkg.id, name: pkg.name };
    }
  }

  for (const pkg of allPackages) {
    if (Math.abs(pkg.price - price) < 0.01) {
      console.log(`[JessCo] Matched by exact price: ${pkg.id} (GHS${pkg.price})`);
      return { id: pkg.id, name: pkg.name };
    }
  }

  console.warn(`[JessCo] No matching package found for: network=${networkName}, bundle="${bundleName}", data="${dataAmount}", price=${price}`);
  return null;
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

  if (!JESSCO_API_KEY) {
    const msg = "JessCo API key not configured";
    await markPendingManual(order.id, details, msg);
    return { success: false, message: msg };
  }

  inFlightOrders.add(order.id);

  const phone = details.phoneNumber.replace(/\s+/g, "");
  const reference = details.jesscoReference || `TGGH-${order.id}-${Date.now()}`;

  try {
    const categories = await fetchJesscoPackages();
    const matched = findJesscoPackage(
      categories,
      details.networkName,
      details.bundleName || "",
      details.data || "",
      parseFloat(order.amount)
    );

    if (!matched) {
      const msg = `No matching JessCo package found for "${details.bundleName}" (${details.data}) on ${details.networkName}`;
      console.error(`[JessCo] ${msg}`);
      await markPendingManual(order.id, details, msg);
      return { success: false, message: msg };
    }

    console.log(`[JessCo] Order ${order.id}: matched package "${matched.id}" (${matched.name}) for ${phone}`);

    const payload = {
      package: matched.id,
      phone,
      reference,
      meta: {
        order_id: String(order.id),
        customer_id: String(order.userId),
        bundle_name: details.bundleName,
      },
    };

    const res = await fetch(`${BASE_URL}/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JESSCO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    console.log(`[JessCo] Response for order ${order.id} (HTTP ${res.status}):`, rawText.slice(0, 1000));

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: "Invalid JSON response", rawBody: rawText.slice(0, 500) };
    }

    if (res.ok && data.success === true) {
      const jesscoPurchaseId = data.data?.id;
      const jesscoRef = data.data?.reference || data.data?.transaction?.reference || reference;

      await db.update(ordersTable)
        .set({
          details: {
            ...details,
            jesscoReference: jesscoRef,
            jesscoPurchaseId,
            jesscoPackageId: matched.id,
            fulfillmentProvider: "jessco",
            fulfillmentStatus: "sent",
          },
        })
        .where(eq(ordersTable.id, order.id));

      return {
        success: true,
        providerRef: jesscoRef,
        jesscoId: jesscoPurchaseId,
        rawResponse: data,
      };
    }

    const errorMsg = data.message || data.error || `API returned status ${res.status}`;
    console.error(`[JessCo] Failed for order ${order.id}:`, JSON.stringify(data).slice(0, 500));

    await markPendingManual(order.id, details, errorMsg);

    return {
      success: false,
      message: errorMsg,
      rawResponse: data,
    };
  } catch (err: any) {
    const msg = `Network error: ${err.message}`;
    console.error(`[JessCo] Network error for order ${order.id}:`, err.message);
    await markPendingManual(order.id, details, msg).catch(() => {});
    return { success: false, message: msg };
  } finally {
    inFlightOrders.delete(order.id);
  }
}

export async function handleJesscoWebhook(payload: any): Promise<void> {
  console.log("[JessCo Webhook] Received:", JSON.stringify(payload, null, 2));

  const purchaseId = payload.purchase_id ?? payload.id ?? null;
  const reference = payload.reference ?? null;
  const rawStatus: string = (payload.status ?? "").toString().toLowerCase();

  if (!purchaseId && !reference) {
    console.warn("[JessCo Webhook] No purchase_id or reference found in payload");
    return;
  }

  let webhookOutcome: "completed" | "provider_failed" | null = null;
  if (["success", "successful", "delivered", "completed", "approved"].includes(rawStatus)) {
    webhookOutcome = "completed";
  } else if (["failed", "failure", "error", "rejected", "declined", "cancelled"].includes(rawStatus)) {
    webhookOutcome = "provider_failed";
  }

  if (!webhookOutcome) {
    console.log(`[JessCo Webhook] Status "${rawStatus}" — no update needed (may be intermediate)`);
    return;
  }

  try {
    const allOrders = await db.select().from(ordersTable);
    const order = allOrders.find((o) => {
      const d = o.details as any;
      if (purchaseId && d?.jesscoPurchaseId !== undefined && String(d.jesscoPurchaseId) === String(purchaseId)) return true;
      if (reference && d?.jesscoReference === String(reference)) return true;
      if (reference && String(o.id) === String(reference)) return true;
      return false;
    });

    if (!order) {
      console.warn(`[JessCo Webhook] No order found for purchase_id=${purchaseId}, reference=${reference}`);
      return;
    }

    if (webhookOutcome === "completed") {
      await db.update(ordersTable)
        .set({
          status: "completed",
          details: {
            ...(order.details as any),
            fulfillmentStatus: "delivered",
            webhookPayload: payload,
          },
        })
        .where(eq(ordersTable.id, order.id));

      console.log(`[JessCo Webhook] Order ${order.id} → completed`);

      pushEventToUser(order.userId, "order_update", {
        id: String(order.id),
        status: "completed",
      });

      pushEventToAdmins("order_status_updated", {
        id: String(order.id),
        status: "completed",
      });
    } else {
      const reason = payload.message || payload.reason || `JessCo reported: ${rawStatus}`;
      await db.update(ordersTable)
        .set({
          details: {
            ...(order.details as any),
            fulfillmentStatus: "pending_manual",
            fulfillmentError: reason,
            fulfillmentFailedAt: new Date().toISOString(),
            webhookPayload: payload,
          },
        })
        .where(eq(ordersTable.id, order.id));

      console.log(`[JessCo Webhook] Order ${order.id} → pending_manual (provider reported ${rawStatus})`);

      sendFulfillmentAlert(order, reason).catch(() => {});

      pushEventToAdmins("order_status_updated", {
        id: String(order.id),
        status: "processing",
        note: "Auto-fulfillment failed — needs manual delivery",
      });
    }
  } catch (err) {
    console.error("[JessCo Webhook] Error processing:", err);
  }
}

export function getJesscoWebhookSecret(): string {
  return JESSCO_WEBHOOK_SECRET;
}

async function pollPendingOrders(): Promise<void> {
  if (!JESSCO_API_KEY) return;

  try {
    const allOrders = await db.select().from(ordersTable);
    const pendingOrders = allOrders.filter((o) => {
      const d = o.details as any;
      return (
        d?.fulfillmentProvider === "jessco" &&
        d?.jesscoPurchaseId &&
        (d?.fulfillmentStatus === "sent" || o.status === "processing")
      );
    });

    if (pendingOrders.length === 0) return;

    console.log(`[JessCo Poller] Checking ${pendingOrders.length} pending order(s)...`);

    for (const order of pendingOrders) {
      const details = order.details as any;
      const purchaseId = details.jesscoPurchaseId;

      try {
        const res = await fetch(`${BASE_URL}/purchases/${purchaseId}`, {
          headers: { Authorization: `Bearer ${JESSCO_API_KEY}` },
        });

        if (!res.ok) {
          console.warn(`[JessCo Poller] HTTP ${res.status} for purchase ${purchaseId}`);
          continue;
        }

        const body = await res.json();
        if (!body.success || !body.data) continue;

        const jesscoStatus = (body.data.status || "").toLowerCase();
        let pollerOutcome: "completed" | "provider_failed" | null = null;

        if (["completed", "success", "successful", "delivered"].includes(jesscoStatus)) {
          pollerOutcome = "completed";
        } else if (["failed", "failure", "error", "rejected", "cancelled"].includes(jesscoStatus)) {
          pollerOutcome = "provider_failed";
        }

        if (!pollerOutcome) continue;

        if (pollerOutcome === "completed") {
          if (order.status === "completed") continue;

          await db.update(ordersTable)
            .set({
              status: "completed",
              details: {
                ...details,
                fulfillmentStatus: "delivered",
                polledAt: new Date().toISOString(),
              },
            })
            .where(eq(ordersTable.id, order.id));

          console.log(`[JessCo Poller] Order ${order.id} → completed`);

          pushEventToUser(order.userId, "order_update", {
            id: String(order.id),
            status: "completed",
          });

          pushEventToAdmins("order_status_updated", {
            id: String(order.id),
            status: "completed",
          });
        } else {
          if (details.fulfillmentStatus === "pending_manual") continue;

          const reason = `JessCo reported: ${jesscoStatus}`;
          await db.update(ordersTable)
            .set({
              details: {
                ...details,
                fulfillmentStatus: "pending_manual",
                fulfillmentError: reason,
                fulfillmentFailedAt: new Date().toISOString(),
                polledAt: new Date().toISOString(),
              },
            })
            .where(eq(ordersTable.id, order.id));

          console.log(`[JessCo Poller] Order ${order.id} → pending_manual (${jesscoStatus})`);

          sendFulfillmentAlert(order, reason).catch(() => {});

          pushEventToAdmins("order_status_updated", {
            id: String(order.id),
            status: "processing",
            note: "Auto-fulfillment failed — needs manual delivery",
          });
        }
      } catch (err: any) {
        console.error(`[JessCo Poller] Error checking purchase ${purchaseId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[JessCo Poller] Error:", err);
  }
}

let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startJesscoPoller(intervalMs = 30_000): void {
  if (pollerInterval) return;
  console.log(`[JessCo Poller] Started — checking every ${intervalMs / 1000}s`);
  pollerInterval = setInterval(pollPendingOrders, intervalMs);
  setTimeout(pollPendingOrders, 5000);
}

export function stopJesscoPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("[JessCo Poller] Stopped");
  }
}
