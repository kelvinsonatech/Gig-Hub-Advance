import { db } from "@workspace/db";
import { paymentIntentsTable, ordersTable, bundlesTable, usersTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import { pushEventToAdmins, pushEventToUser } from "./sse";
import { sendOrderNotification, sendFulfillmentAlert } from "./telegram";
import { getFulfillmentMode } from "./settings";
import { fulfillBundle } from "./jessco";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

async function recoverPendingPayments(): Promise<void> {
  if (!PAYSTACK_SECRET) return;

  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000);
    const maxAge = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const staleIntents = await db
      .select()
      .from(paymentIntentsTable)
      .where(
        and(
          eq(paymentIntentsTable.status, "pending"),
          lt(paymentIntentsTable.expiresAt, cutoff),
          // Don't check intents older than 24h
        )
      )
      .limit(10);

    const filtered = staleIntents.filter(i => i.createdAt > maxAge);
    if (filtered.length === 0) return;

    console.log(`[Payment Recovery] Checking ${filtered.length} expired pending intent(s)...`);

    for (const intent of filtered) {
      try {
        const psRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(intent.reference)}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
        );
        const psData = await psRes.json() as any;

        if (!psData.status || psData.data?.status !== "success") {
          const txStatus = psData.data?.status;
          if (txStatus === "abandoned" || txStatus === "failed") {
            await db.update(paymentIntentsTable)
              .set({ status: txStatus === "abandoned" ? "cancelled" : "failed" })
              .where(eq(paymentIntentsTable.reference, intent.reference));
            console.log(`[Payment Recovery] Intent ${intent.reference} → ${txStatus}`);
          }
          continue;
        }

        const paidGHS = psData.data.amount / 100;
        const expectedGHS = parseFloat(intent.amountGHS);
        if (Math.abs(paidGHS - expectedGHS) > 1) {
          console.warn(`[Payment Recovery] Amount mismatch for ${intent.reference}: paid ${paidGHS}, expected ${expectedGHS}`);
          await db.update(paymentIntentsTable)
            .set({ status: "failed" })
            .where(eq(paymentIntentsTable.reference, intent.reference));
          continue;
        }

        if (intent.type === "bundle_purchase" && intent.bundleId) {
          const [bundle] = await db
            .select()
            .from(bundlesTable)
            .where(eq(bundlesTable.id, intent.bundleId))
            .limit(1);

          if (!bundle) {
            console.warn(`[Payment Recovery] Bundle ${intent.bundleId} not found for ${intent.reference}`);
            continue;
          }

          const mode = await getFulfillmentMode();
          const initialStatus = mode === "api" ? "processing" : "pending";

          const orderDetails = {
            phoneNumber: intent.phoneNumber,
            paymentMethod: "momo",
            paystackReference: intent.reference,
            bundleId: String(intent.bundleId),
            bundleName: bundle.name,
            data: bundle.data,
            networkName: bundle.networkName,
            fulfillmentMode: mode,
            createdVia: "payment_recovery",
          };

          const [order] = await db.insert(ordersTable).values({
            userId: intent.userId,
            type: "bundle",
            status: initialStatus,
            amount: expectedGHS.toFixed(2),
            details: orderDetails,
          }).returning();

          await db.update(paymentIntentsTable)
            .set({ status: "processed", processedAt: new Date() })
            .where(eq(paymentIntentsTable.reference, intent.reference));

          console.log(`[Payment Recovery] Created order ${order.id} from expired intent ${intent.reference}`);

          notifyAdminsNewOrder(order);
          tryAutoFulfill(order);
        } else if (intent.type === "wallet_topup") {
          console.log(`[Payment Recovery] Wallet topup ${intent.reference} paid but not processed — needs manual handling`);
        }
      } catch (err: any) {
        console.error(`[Payment Recovery] Error checking intent ${intent.reference}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[Payment Recovery] Error:", err);
  }
}

async function notifyAdminsNewOrder(order: typeof ordersTable.$inferSelect) {
  try {
    const [user] = await db
      .select({ name: usersTable.name, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable)
      .where(eq(usersTable.id, order.userId))
      .limit(1);

    const userPayload = user
      ? { name: user.name, email: user.email, phone: user.phone }
      : { name: "Unknown", email: "", phone: "" };

    pushEventToAdmins("new_order", {
      id: String(order.id),
      userId: String(order.userId),
      type: order.type,
      status: order.status,
      amount: parseFloat(order.amount),
      details: order.details,
      user: userPayload,
      createdAt: order.createdAt.toISOString(),
    });

    sendOrderNotification(order, userPayload).catch(() => {});
  } catch (err) {
    console.error("[Payment Recovery] Error notifying admins:", err);
  }
}

async function tryAutoFulfill(order: typeof ordersTable.$inferSelect) {
  try {
    if (order.type !== "bundle") return;
    const mode = await getFulfillmentMode();
    if (mode !== "api") return;

    console.log(`[AutoFulfill] API mode active — sending order ${order.id} to JessCo (via recovery)`);
    const result = await fulfillBundle({
      id: order.id,
      userId: order.userId,
      details: order.details,
      amount: order.amount,
    });

    if (result.success) {
      console.log(`[AutoFulfill] Order ${order.id} sent successfully, ref: ${result.providerRef}`);
    } else {
      console.warn(`[AutoFulfill] Order ${order.id} could not auto-fulfill: ${result.message}`);
      sendFulfillmentAlert(order, result.message || "Unknown error").catch(() => {});
    }
  } catch (err) {
    console.error(`[AutoFulfill] Error for order ${order.id}:`, err);
    sendFulfillmentAlert(order, "Unexpected error during auto-fulfillment").catch(() => {});
  }
}

let recoveryInterval: ReturnType<typeof setInterval> | null = null;

export function startPaymentRecovery(intervalMs = 60_000): void {
  if (recoveryInterval) return;
  console.log(`[Payment Recovery] Started — checking every ${intervalMs / 1000}s`);
  recoveryInterval = setInterval(recoverPendingPayments, intervalMs);
  setTimeout(recoverPendingPayments, 10_000);
}

export function stopPaymentRecovery(): void {
  if (recoveryInterval) {
    clearInterval(recoveryInterval);
    recoveryInterval = null;
    console.log("[Payment Recovery] Stopped");
  }
}
