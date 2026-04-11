import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pushEventToUser, pushEventToAdmins } from "./sse";

const XPRESPORTAL_API_KEY = process.env.XPRESPORTAL_API_KEY || "";
const BASE_URL = "https://xpresportal.app/api";

const networkMap: Record<string, string> = {
  "MTN Ghana": "mtn",
  "MTN": "mtn",
  "mtn": "mtn",
  "AirtelTigo": "at",
  "Airtel Tigo": "at",
  "AT": "at",
  "at": "at",
  "Telecel Ghana": "telecel",
  "Telecel": "telecel",
  "telecel": "telecel",
  "Vodafone": "telecel",
  "vodafone": "telecel",
};

function mapNetwork(networkName: string): string {
  return networkMap[networkName] ?? networkName.toLowerCase().replace(/\s+/g, "");
}

export interface FulfillResult {
  success: boolean;
  providerRef?: string;
  message?: string;
  rawResponse?: any;
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

  if (!XPRESPORTAL_API_KEY) {
    return { success: false, message: "XPRESPORTAL_API_KEY not configured" };
  }

  inFlightOrders.add(order.id);

  const network = mapNetwork(details.networkName);
  const phone = details.phoneNumber.replace(/\s+/g, "");
  const reference = details.xpresportalReference || `TGGH-${order.id}-${Date.now()}`;

  try {
    console.log(`[JessCo] Sending bundle fulfillment for order ${order.id}: ${network} ${phone} ${details.bundleName}`);

    const payload = {
      network,
      phone,
      bundle_name: details.bundleName,
      data_amount: details.data,
      amount: parseFloat(order.amount),
      reference,
      callback_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://workspace.jedoedtendoed.replit.app"}/api/webhooks/xpresportal`,
    };

    const res = await fetch(`${BASE_URL}/data/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XPRESPORTAL_API_KEY}`,
        "x-api-key": XPRESPORTAL_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    console.log(`[JessCo] Raw response for order ${order.id} (HTTP ${res.status}):`, rawText);
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: "Invalid JSON response", rawBody: rawText.slice(0, 500) };
    }
    console.log(`[JessCo] Parsed response for order ${order.id}:`, JSON.stringify(data));

    if (res.ok && (data.status === "success" || data.status === true || data.success === true)) {
      await db.update(ordersTable)
        .set({
          details: {
            ...details,
            xpresportalReference: data.reference || data.transaction_id || reference,
            fulfillmentProvider: "xpresportal",
            fulfillmentStatus: "sent",
          },
        })
        .where(eq(ordersTable.id, order.id));

      return {
        success: true,
        providerRef: data.reference || data.transaction_id || reference,
        rawResponse: data,
      };
    }

    console.error(`[JessCo] Failed for order ${order.id}:`, data);

    await db.update(ordersTable)
      .set({
        details: {
          ...details,
          fulfillmentProvider: "xpresportal",
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

export async function handleXpresportalWebhook(payload: any): Promise<void> {
  console.log("[JessCo Webhook] Received:", JSON.stringify(payload, null, 2));

  const reference =
    payload.reference ??
    payload.transaction_id ??
    payload.order_id ??
    payload.ref ??
    null;

  const rawStatus: string = (
    payload.status ?? payload.delivery_status ?? payload.state ?? ""
  ).toString().toLowerCase();

  if (!reference) {
    console.warn("[JessCo Webhook] No reference found in payload");
    return;
  }

  let newStatus: "completed" | "failed" | null = null;
  if (["success", "successful", "delivered", "completed", "approved"].includes(rawStatus)) {
    newStatus = "completed";
  } else if (["failed", "failure", "error", "rejected", "declined"].includes(rawStatus)) {
    newStatus = "failed";
  }

  if (!newStatus) {
    console.log(`[JessCo Webhook] Unrecognised status "${rawStatus}" — no update`);
    return;
  }

  try {
    const allOrders = await db.select().from(ordersTable);
    const order = allOrders.find(
      (o) =>
        (o.details as any)?.xpresportalReference === String(reference) ||
        String(o.id) === String(reference)
    );

    if (!order) {
      console.warn(`[JessCo Webhook] No order found for reference "${reference}"`);
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
