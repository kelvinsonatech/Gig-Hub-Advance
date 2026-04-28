import { db } from "@workspace/db";
import {
  paymentIntentsTable,
  ordersTable,
  bundlesTable,
  walletsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import { fulfillBundle } from "./jessco";
import { getFulfillmentMode } from "./settings";
import { pushEventToAdmins, pushEventToUser } from "./sse";
import { sendOrderNotification, sendFulfillmentAlert } from "./telegram";

export type VerifySource = "webhook" | "frontend_callback" | "reconciler" | "manual";

export interface VerifyResult {
  ok: boolean;
  status:
    | "order_created"
    | "order_already_exists"
    | "wallet_credited"
    | "wallet_already_credited"
    | "intent_not_found"
    | "intent_expired"
    | "intent_failed"
    | "payment_pending"
    | "payment_failed"
    | "payment_cancelled"
    | "amount_mismatch"
    | "bundle_not_found"
    | "paystack_error"
    | "internal_error";
  message: string;
  orderId?: number;
  paystackStatus?: string;
}

const PAYSTACK_BASE = "https://api.paystack.co";

function envSecret(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

async function findOrderByReference(
  userId: number,
  reference: string
): Promise<typeof ordersTable.$inferSelect | undefined> {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId));
  return orders.find(
    (o) => (o.details as any)?.paystackReference === reference
  );
}

async function notifyAdminsNewOrder(
  order: typeof ordersTable.$inferSelect
): Promise<void> {
  try {
    const [user] = await db
      .select({
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
      })
      .from(usersTable)
      .where(eq(usersTable.id, order.userId))
      .limit(1);

    const userPayload = user
      ? { name: user.name, email: user.email, phone: user.phone ?? "" }
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

    await sendOrderNotification({
      id: String(order.id),
      amount: parseFloat(order.amount),
      status: order.status,
      type: order.type,
      details: (order.details ?? {}) as Record<string, any>,
      user: userPayload,
    });
  } catch (err) {
    console.error("[PaymentReconciler] notifyAdminsNewOrder error:", err);
  }
}

async function tryAutoFulfill(
  order: typeof ordersTable.$inferSelect
): Promise<void> {
  try {
    if (order.type !== "bundle") return;
    const mode = await getFulfillmentMode();
    if (mode !== "api") return;

    console.log(
      `[PaymentReconciler] Auto-fulfilling order ${order.id} via JessCo`
    );
    const result = await fulfillBundle({
      id: order.id,
      userId: order.userId,
      details: order.details,
      amount: order.amount,
    });

    if (!result.success) {
      console.warn(
        `[PaymentReconciler] Order ${order.id} could not auto-fulfill: ${result.message}`
      );
      sendFulfillmentAlert(order, result.message || "Unknown error").catch(
        () => {}
      );
    }
  } catch (err) {
    console.error(
      `[PaymentReconciler] Auto-fulfill error for order ${order.id}:`,
      err
    );
  }
}

/**
 * The single authoritative function for "given a Paystack reference, verify
 * with Paystack and process whatever needs to happen". Used by:
 *   - the Paystack webhook
 *   - the frontend post-redirect callback (POST /api/orders with reference)
 *   - the wallet topup verify endpoint
 *   - the background reconciler poller (this file)
 *   - the admin manual reconcile endpoint
 *
 * Idempotent: safe to call repeatedly with the same reference.
 */
export async function verifyAndProcessIntent(
  reference: string,
  source: VerifySource
): Promise<VerifyResult> {
  const secretKey = envSecret();
  if (!secretKey) {
    return { ok: false, status: "internal_error", message: "Payment provider not configured" };
  }

  // ── Load intent ────────────────────────────────────────────────────────
  const [intent] = await db
    .select()
    .from(paymentIntentsTable)
    .where(eq(paymentIntentsTable.reference, reference))
    .limit(1);

  if (!intent) {
    return { ok: false, status: "intent_not_found", message: "Payment intent not found" };
  }

  // Already processed → return existing record (idempotency)
  if (intent.status === "processed") {
    if (intent.type === "bundle_purchase") {
      const existing = await findOrderByReference(intent.userId, reference);
      return {
        ok: true,
        status: "order_already_exists",
        message: "Order already created for this payment",
        orderId: existing?.id,
      };
    }
    return {
      ok: true,
      status: "wallet_already_credited",
      message: "Wallet topup already processed",
    };
  }

  if (intent.status === "failed") {
    return { ok: false, status: "intent_failed", message: "Payment was previously marked failed" };
  }
  if (intent.status === "cancelled") {
    return { ok: false, status: "payment_cancelled", message: "Payment was cancelled" };
  }

  // ── Verify with Paystack ──────────────────────────────────────────────
  let psData: any;
  try {
    const psRes = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    psData = await psRes.json();
  } catch (err) {
    console.error(`[PaymentReconciler] Paystack verify network error for ${reference}:`, err);
    return { ok: false, status: "paystack_error", message: "Could not reach payment provider" };
  }

  if (!psData?.status) {
    return {
      ok: false,
      status: "paystack_error",
      message: psData?.message || "Paystack verify failed",
    };
  }

  const txStatus: string = psData.data?.status || "unknown";

  // Paystack tx not yet successful
  if (txStatus !== "success") {
    // Abandoned / failed → mark intent as such
    if (txStatus === "abandoned") {
      // Paystack reports "abandoned" both for users who never submit and for
      // users still on the payment page. To avoid premature cancellation when
      // the user just left the tab open, we only finalize once the intent is
      // older than 3 minutes — that's plenty of time to complete a MoMo prompt.
      const ageMs = Date.now() - intent.createdAt.getTime();
      if (ageMs > 3 * 60 * 1000 || new Date() > intent.expiresAt) {
        await db.update(paymentIntentsTable)
          .set({ status: "cancelled" })
          .where(eq(paymentIntentsTable.reference, reference));
      }
      return {
        ok: false,
        status: "payment_cancelled",
        message: "Payment was abandoned by the customer",
        paystackStatus: txStatus,
      };
    }
    if (txStatus === "failed") {
      await db.update(paymentIntentsTable)
        .set({ status: "failed" })
        .where(eq(paymentIntentsTable.reference, reference));
      return {
        ok: false,
        status: "payment_failed",
        message: "Paystack reported the payment failed",
        paystackStatus: txStatus,
      };
    }
    // pending / ongoing — stays pending; expire if past expiry
    if (new Date() > intent.expiresAt && txStatus !== "success") {
      await db.update(paymentIntentsTable)
        .set({ status: "cancelled" })
        .where(eq(paymentIntentsTable.reference, reference));
      return {
        ok: false,
        status: "intent_expired",
        message: "Payment session expired without completion",
        paystackStatus: txStatus,
      };
    }
    return {
      ok: false,
      status: "payment_pending",
      message: `Paystack reports status "${txStatus}"`,
      paystackStatus: txStatus,
    };
  }

  // ── Amount integrity check ───────────────────────────────────────────
  const paidGHS = (psData.data?.amount ?? 0) / 100;
  const expectedGHS = parseFloat(intent.amountGHS);
  const maxOverpay = expectedGHS * 0.05;
  if (paidGHS < expectedGHS - 0.5 || paidGHS > expectedGHS + maxOverpay + 1) {
    console.warn(
      `[PaymentReconciler] Amount mismatch for ${reference}: paid=${paidGHS} expected=${expectedGHS}`
    );
    await db.update(paymentIntentsTable)
      .set({ status: "failed" })
      .where(eq(paymentIntentsTable.reference, reference));
    return {
      ok: false,
      status: "amount_mismatch",
      message: `Paid amount (GHS ${paidGHS}) does not match expected (GHS ${expectedGHS})`,
      paystackStatus: txStatus,
    };
  }

  // ── Process based on intent type ─────────────────────────────────────
  if (intent.type === "bundle_purchase") {
    if (!intent.bundleId) {
      return { ok: false, status: "internal_error", message: "Intent has no bundleId" };
    }

    const [bundle] = await db
      .select()
      .from(bundlesTable)
      .where(eq(bundlesTable.id, intent.bundleId))
      .limit(1);
    if (!bundle) {
      return { ok: false, status: "bundle_not_found", message: "Bundle no longer exists" };
    }

    const fulfillmentMode = await getFulfillmentMode();
    const initialStatus = fulfillmentMode === "api" ? "processing" : "pending";

    const orderDetails: Record<string, any> = {
      phoneNumber: intent.phoneNumber,
      paymentMethod: "momo",
      paystackReference: reference,
      bundleId: String(intent.bundleId),
      bundleName: bundle.name,
      data: bundle.data,
      networkName: bundle.networkName,
      fulfillmentMode,
      createdVia: source,
      verifiedAt: new Date().toISOString(),
    };

    // ── Atomic claim + insert ───────────────────────────────────────────
    // The `UPDATE … WHERE status='pending' RETURNING` is the gate: Postgres
    // takes a row lock on matching rows, and only ONE concurrent caller can
    // flip pending→processed. The other caller's UPDATE matches zero rows.
    // If the subsequent INSERT throws, the whole transaction rolls back and
    // the claim is released, so a later retry can succeed.
    let createdOrder: typeof ordersTable.$inferSelect | null = null;
    let alreadyProcessed = false;

    try {
      await db.transaction(async (tx) => {
        const claimed = await tx
          .update(paymentIntentsTable)
          .set({ status: "processed", processedAt: new Date() })
          .where(
            and(
              eq(paymentIntentsTable.reference, reference),
              eq(paymentIntentsTable.status, "pending")
            )
          )
          .returning();

        if (claimed.length === 0) {
          alreadyProcessed = true;
          return;
        }

        const [order] = await tx
          .insert(ordersTable)
          .values({
            userId: intent.userId,
            type: "bundle",
            status: initialStatus,
            amount: expectedGHS.toFixed(2),
            details: orderDetails,
          })
          .returning();
        createdOrder = order;
      });
    } catch (err) {
      console.error(`[PaymentReconciler] Tx error for ${reference}:`, err);
      return { ok: false, status: "internal_error", message: "Database error while creating order" };
    }

    if (alreadyProcessed) {
      const existing = await findOrderByReference(intent.userId, reference);
      return {
        ok: true,
        status: "order_already_exists",
        message: "Order already created (concurrent verify)",
        orderId: existing?.id,
      };
    }

    if (!createdOrder) {
      return { ok: false, status: "internal_error", message: "Order creation failed" };
    }

    const orderForCallbacks = createdOrder as typeof ordersTable.$inferSelect;

    console.log(
      `[PaymentReconciler] (${source}) Created order ${orderForCallbacks.id} for ref ${reference}`
    );

    // Fire-and-forget admin notification + auto-fulfill
    notifyAdminsNewOrder(orderForCallbacks);
    tryAutoFulfill(orderForCallbacks);

    return {
      ok: true,
      status: "order_created",
      message: "Payment verified and order created",
      orderId: orderForCallbacks.id,
      paystackStatus: txStatus,
    };
  }

  // ── Wallet topup ───────────────────────────────────────────────────────
  if (intent.type === "wallet_topup") {
    let creditedAmount = expectedGHS;
    let alreadyProcessed = false;

    try {
      await db.transaction(async (tx) => {
        // Atomic claim — same pattern as the bundle branch.
        const claimed = await tx
          .update(paymentIntentsTable)
          .set({ status: "processed", processedAt: new Date() })
          .where(
            and(
              eq(paymentIntentsTable.reference, reference),
              eq(paymentIntentsTable.status, "pending")
            )
          )
          .returning();

        if (claimed.length === 0) {
          alreadyProcessed = true;
          return;
        }

        // Find or create wallet
        const [existingWallet] = await tx
          .select()
          .from(walletsTable)
          .where(eq(walletsTable.userId, intent.userId))
          .limit(1);

        const wallet =
          existingWallet ??
          (await tx
            .insert(walletsTable)
            .values({ userId: intent.userId, balance: "0" })
            .returning())[0];

        await tx
          .update(walletsTable)
          .set({
            balance: sql`${walletsTable.balance} + ${creditedAmount}`,
          })
          .where(eq(walletsTable.id, wallet.id));

        await tx.insert(transactionsTable).values({
          walletId: wallet.id,
          type: "credit",
          amount: String(creditedAmount),
          description: `Wallet top-up via Paystack (${source})`,
        });
      });
    } catch (err) {
      console.error(`[PaymentReconciler] Wallet tx error for ${reference}:`, err);
      return { ok: false, status: "internal_error", message: "Database error while crediting wallet" };
    }

    if (alreadyProcessed) {
      return {
        ok: true,
        status: "wallet_already_credited",
        message: "Wallet was already credited (concurrent verify)",
      };
    }

    console.log(
      `[PaymentReconciler] (${source}) Credited wallet for user ${intent.userId} ref ${reference} amount GHS ${creditedAmount}`
    );

    pushEventToUser(intent.userId, "wallet_topup", {
      amount: creditedAmount,
      reference,
    });

    return {
      ok: true,
      status: "wallet_credited",
      message: `Wallet credited GHS ${creditedAmount.toFixed(2)}`,
      paystackStatus: txStatus,
    };
  }

  return { ok: false, status: "internal_error", message: "Unknown intent type" };
}

/**
 * Background poller — every N seconds, finds payment intents that are still
 * "pending" but were created more than `minAgeSeconds` ago, and asks Paystack
 * directly whether they actually paid. This is the safety net for:
 *   - Paystack webhooks that never arrived (network blip, Replit cold start)
 *   - Customers who paid but closed their browser before being redirected back
 *   - Frontend verify calls that crashed mid-request
 */
async function reconcilePendingIntents(
  minAgeSeconds = 60,
  maxAgeMinutes = 60
): Promise<void> {
  if (!envSecret()) return;

  const cutoffNew = new Date(Date.now() - minAgeSeconds * 1000);
  const cutoffOld = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  try {
    const stale = await db
      .select()
      .from(paymentIntentsTable)
      .where(
        and(
          eq(paymentIntentsTable.status, "pending"),
          lt(paymentIntentsTable.createdAt, cutoffNew),
          gt(paymentIntentsTable.createdAt, cutoffOld)
        )
      );

    if (stale.length === 0) return;

    console.log(`[PaymentReconciler] Checking ${stale.length} pending intent(s)...`);

    for (const intent of stale) {
      try {
        const result = await verifyAndProcessIntent(intent.reference, "reconciler");

        if (result.status === "order_created" || result.status === "wallet_credited") {
          // Recovered a missed payment — alert admins
          console.log(
            `[PaymentReconciler] ✓ RECOVERED missed payment ${intent.reference} (${result.status})`
          );
          notifyRecoveredPayment(intent, result).catch(() => {});
        } else if (
          result.status === "order_already_exists" ||
          result.status === "wallet_already_credited"
        ) {
          // Race with webhook — fine
        } else if (
          result.status === "payment_pending" ||
          result.status === "paystack_error"
        ) {
          // Will retry next tick — no action
        } else {
          // intent_expired / payment_failed / amount_mismatch / etc — already
          // marked in the DB by verifyAndProcessIntent
          console.log(
            `[PaymentReconciler] Intent ${intent.reference} resolved: ${result.status} — ${result.message}`
          );
        }
      } catch (err) {
        console.error(
          `[PaymentReconciler] Error reconciling ${intent.reference}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[PaymentReconciler] Poller error:", err);
  }

  // Also: expire ancient pending intents (>maxAgeMinutes) so the queue stays clean.
  try {
    const expired = await db
      .update(paymentIntentsTable)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(paymentIntentsTable.status, "pending"),
          lt(paymentIntentsTable.expiresAt, new Date())
        )
      )
      .returning();
    if (expired.length > 0) {
      console.log(`[PaymentReconciler] Expired ${expired.length} ancient intent(s)`);
    }
  } catch (err) {
    console.error("[PaymentReconciler] Expiry sweep error:", err);
  }
}

async function notifyRecoveredPayment(
  intent: typeof paymentIntentsTable.$inferSelect,
  result: VerifyResult
): Promise<void> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return;

  const lines = [
    `🛟 <b>Missed Payment Recovered</b>`,
    ``,
    `The Paystack webhook didn't fire (or was delayed) but our reconciler caught the payment.`,
    ``,
    `🔖 Ref: <code>${intent.reference}</code>`,
    `👤 User ID: ${intent.userId}`,
    `💵 Amount: GHS ${parseFloat(intent.amountGHS).toFixed(2)}`,
    `📦 Type: ${intent.type}`,
    `✅ Result: ${result.status}`,
    result.orderId ? `🧾 Order ID: ${result.orderId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: lines, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[PaymentReconciler] Telegram alert failed:", err);
  }
}

let reconcilerInterval: ReturnType<typeof setInterval> | null = null;

export function startPaymentReconciler(intervalMs = 45_000): void {
  if (reconcilerInterval) return;
  console.log(
    `[PaymentReconciler] Started — checking pending intents every ${intervalMs / 1000}s`
  );
  reconcilerInterval = setInterval(() => reconcilePendingIntents(), intervalMs);
  // First sweep after 10s so the server has time to fully boot
  setTimeout(() => reconcilePendingIntents(), 10_000);
}

export function stopPaymentReconciler(): void {
  if (reconcilerInterval) {
    clearInterval(reconcilerInterval);
    reconcilerInterval = null;
    console.log("[PaymentReconciler] Stopped");
  }
}

/**
 * Snapshot of payment-system health for the admin dashboard.
 */
export async function getPaymentHealth(): Promise<{
  pendingIntents: number;
  stalePendingIntents: number;
  intentsLast24h: number;
  processedLast24h: number;
  failedLast24h: number;
  ordersAwaitingManualLast24h: number;
  reconcilerActive: boolean;
}> {
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const fiveMinAgo = new Date(now - 5 * 60 * 1000);

  const allRecent = await db
    .select()
    .from(paymentIntentsTable)
    .where(gt(paymentIntentsTable.createdAt, oneDayAgo));

  const allPending = await db
    .select()
    .from(paymentIntentsTable)
    .where(eq(paymentIntentsTable.status, "pending"));

  const stalePending = allPending.filter((i) => i.createdAt < fiveMinAgo);

  const recentOrders = await db
    .select()
    .from(ordersTable)
    .where(gt(ordersTable.createdAt, oneDayAgo));

  const awaitingManual = recentOrders.filter(
    (o) => (o.details as any)?.fulfillmentStatus === "pending_manual"
  );

  return {
    pendingIntents: allPending.length,
    stalePendingIntents: stalePending.length,
    intentsLast24h: allRecent.length,
    processedLast24h: allRecent.filter((i) => i.status === "processed").length,
    failedLast24h: allRecent.filter(
      (i) => i.status === "failed" || i.status === "cancelled"
    ).length,
    ordersAwaitingManualLast24h: awaitingManual.length,
    reconcilerActive: reconcilerInterval !== null,
  };
}

/**
 * List recent stuck intents (pending for >5min) — for the admin "force verify" UI.
 */
export async function listStuckIntents(): Promise<
  Array<{
    reference: string;
    userId: number;
    type: string;
    amountGHS: string;
    phoneNumber: string | null;
    bundleId: number | null;
    createdAt: string;
    minutesOld: number;
  }>
> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const stuck = await db
    .select()
    .from(paymentIntentsTable)
    .where(
      and(
        eq(paymentIntentsTable.status, "pending"),
        lt(paymentIntentsTable.createdAt, fiveMinAgo)
      )
    );

  return stuck.map((i) => ({
    reference: i.reference,
    userId: i.userId,
    type: i.type,
    amountGHS: i.amountGHS,
    phoneNumber: i.phoneNumber,
    bundleId: i.bundleId,
    createdAt: i.createdAt.toISOString(),
    minutesOld: Math.round((Date.now() - i.createdAt.getTime()) / 60000),
  }));
}
