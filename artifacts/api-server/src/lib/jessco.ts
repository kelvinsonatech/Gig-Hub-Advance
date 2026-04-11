import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pushEventToUser, pushEventToAdmins } from "./sse";

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
  console.log(`[JessCo] Found ${allPackages.length} packages for network. Options:`, allPackages.map(p => `${p.id}|${p.name}|${p.value}|GHS${p.price}`).join(" | "));

  if (allPackages.length === 0) return null;

  const normalizedData = dataAmount.toLowerCase().replace(/\s+/g, "");
  const normalizedName = bundleName.toLowerCase().replace(/\s+/g, "").replace(/^(mtn|at|telecel|airteltigo|vodafone)\s*/i, "");

  for (const pkg of allPackages) {
    const pkgValue = (pkg.value || "").toLowerCase().replace(/\s+/g, "");
    if (pkgValue === normalizedData && Math.abs(pkg.price - price) < 0.5) {
      return { id: pkg.id, name: pkg.name };
    }
  }

  for (const pkg of allPackages) {
    const pkgValue = (pkg.value || "").toLowerCase().replace(/\s+/g, "");
    if (pkgValue === normalizedData) {
      return { id: pkg.id, name: pkg.name };
    }
  }

  const dataMatch = normalizedData.match(/^(\d+(?:\.\d+)?)(gb|mb|tb)$/);
  if (dataMatch) {
    const num = dataMatch[1];
    const unit = dataMatch[2];
    for (const pkg of allPackages) {
      const pkgValue = (pkg.value || "").toLowerCase().replace(/\s+/g, "");
      if (pkgValue.includes(num) && pkgValue.includes(unit)) {
        return { id: pkg.id, name: pkg.name };
      }
    }
  }

  for (const pkg of allPackages) {
    const pkgName = (pkg.name || "").toLowerCase().replace(/\s+/g, "");
    if (pkgName === normalizedName || pkgName.includes(normalizedName) || normalizedName.includes(pkgName)) {
      return { id: pkg.id, name: pkg.name };
    }
  }

  for (const pkg of allPackages) {
    if (Math.abs(pkg.price - price) < 0.01) {
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
    return { success: false, message: "Missing phoneNumber or networkName in order details" };
  }

  if (!JESSCO_API_KEY) {
    return { success: false, message: "JessCo API key not configured" };
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
      await db.update(ordersTable)
        .set({
          details: {
            ...details,
            fulfillmentProvider: "jessco",
            fulfillmentStatus: "no_match",
            fulfillmentError: msg,
          },
        })
        .where(eq(ordersTable.id, order.id));
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

    console.error(`[JessCo] Failed for order ${order.id}:`, JSON.stringify(data).slice(0, 500));

    await db.update(ordersTable)
      .set({
        details: {
          ...details,
          fulfillmentProvider: "jessco",
          fulfillmentStatus: "api_error",
          fulfillmentError: data.message || data.error || "Unknown error",
        },
      })
      .where(eq(ordersTable.id, order.id));

    return {
      success: false,
      message: data.message || data.error || `API returned status ${res.status}`,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error(`[JessCo] Network error for order ${order.id}:`, err.message);
    return { success: false, message: `Network error: ${err.message}` };
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

  let newStatus: "completed" | "failed" | null = null;
  if (["success", "successful", "delivered", "completed", "approved"].includes(rawStatus)) {
    newStatus = "completed";
  } else if (["failed", "failure", "error", "rejected", "declined", "cancelled"].includes(rawStatus)) {
    newStatus = "failed";
  }

  if (!newStatus) {
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

    await db.update(ordersTable)
      .set({
        status: newStatus,
        details: {
          ...(order.details as any),
          fulfillmentStatus: newStatus === "completed" ? "delivered" : "failed",
          webhookPayload: payload,
        },
      })
      .where(eq(ordersTable.id, order.id));

    console.log(`[JessCo Webhook] Order ${order.id} → ${newStatus}`);

    pushEventToUser(order.userId, "order_update", {
      id: String(order.id),
      status: newStatus,
    });

    pushEventToAdmins("order_status_updated", {
      id: String(order.id),
      status: newStatus,
    });
  } catch (err) {
    console.error("[JessCo Webhook] Error processing:", err);
  }
}

export function getJesscoWebhookSecret(): string {
  return JESSCO_WEBHOOK_SECRET;
}
