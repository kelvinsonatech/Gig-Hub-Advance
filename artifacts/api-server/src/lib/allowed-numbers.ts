import { db } from "@workspace/db";
import { allowedNumbersTable, ordersTable } from "@workspace/db";
import { eq, sql, isNotNull } from "drizzle-orm";
import { getSetting, setSetting, getFulfillmentMode, isNewNumberRestrictionEnabled } from "./settings";

export const NEW_NUMBER_DENIAL_MESSAGE =
  "Sorry — we are currently not accepting new numbers that are not on our system. Please use a number that has ordered with us before, or contact support for help.";

/**
 * Returns a denial message if the new-number restriction should block this
 * purchase, or null if the purchase may proceed.
 * The restriction only applies while JessCo ("api") fulfillment mode is active
 * and the admin toggle is enabled.
 */
export async function checkNewNumberRestriction(phone: string): Promise<string | null> {
  const mode = await getFulfillmentMode();
  if (mode !== "api") return null;
  const enabled = await isNewNumberRestrictionEnabled();
  if (!enabled) return null;
  const allowed = await isAllowedNumber(phone);
  return allowed ? null : NEW_NUMBER_DENIAL_MESSAGE;
}

/**
 * Normalize a Ghanaian phone number to the canonical local format: 0XXXXXXXXX (10 digits).
 * Handles: spaces/dashes, +233/233 international prefix, and bare 9-digit numbers.
 * Returns null if the number can't be normalized to a valid 10-digit Ghana number.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let local: string;
  if (digits.length === 12 && digits.startsWith("233")) {
    local = "0" + digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    local = digits;
  } else if (digits.length === 9 && !digits.startsWith("0")) {
    local = "0" + digits;
  } else {
    return null;
  }

  return /^0\d{9}$/.test(local) ? local : null;
}

/**
 * Check whether a phone number is on the allowed list.
 * Numbers that can't be normalized are treated as NOT allowed.
 */
export async function isAllowedNumber(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const [row] = await db
    .select({ id: allowedNumbersTable.id })
    .from(allowedNumbersTable)
    .where(eq(allowedNumbersTable.phoneNumber, normalized))
    .limit(1);
  return !!row;
}

/**
 * One-time seed: import every distinct phone number from historical orders
 * into the allowed_numbers table. Guarded by an app_settings flag so admin
 * removals are never resurrected by a restart.
 */
export async function seedAllowedNumbersFromOrders(): Promise<void> {
  try {
    const seeded = await getSetting("allowed_numbers_seeded");
    if (seeded === "true") return;

    const rows = await db
      .select({ phone: sql<string>`${ordersTable.details} ->> 'phoneNumber'` })
      .from(ordersTable)
      .where(isNotNull(sql`${ordersTable.details} ->> 'phoneNumber'`));

    const unique = new Set<string>();
    for (const r of rows) {
      const normalized = normalizePhone(r.phone);
      if (normalized) unique.add(normalized);
    }

    if (unique.size > 0) {
      const values = Array.from(unique).map((phoneNumber) => ({
        phoneNumber,
        addedBy: "system",
        note: "Imported from order history",
      }));
      // Chunk inserts to stay well under parameter limits
      const CHUNK = 500;
      for (let i = 0; i < values.length; i += CHUNK) {
        await db
          .insert(allowedNumbersTable)
          .values(values.slice(i, i + CHUNK))
          .onConflictDoNothing();
      }
    }

    await setSetting("allowed_numbers_seeded", "true");
    console.log(`[AllowedNumbers] Seeded ${unique.size} number(s) from order history`);
  } catch (err) {
    console.error("[AllowedNumbers] Seed failed:", err);
  }
}
