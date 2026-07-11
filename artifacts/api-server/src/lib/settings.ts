import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export type FulfillmentMode = "manual" | "api" | "xpress_gh";

export async function getSetting(key: string): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, key))
      .limit(1);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getFulfillmentMode(): Promise<FulfillmentMode> {
  const mode = await getSetting("fulfillment_mode");
  if (mode === "api") return "api";
  if (mode === "xpress_gh") return "xpress_gh";
  return "manual";
}

export async function setFulfillmentMode(mode: FulfillmentMode): Promise<void> {
  await setSetting("fulfillment_mode", mode);
}

/**
 * New-number restriction: when enabled, bundle purchases in JessCo ("api")
 * fulfillment mode are only accepted for phone numbers already on the
 * allowed_numbers list. Defaults to enabled.
 */
export async function isNewNumberRestrictionEnabled(): Promise<boolean> {
  const value = await getSetting("restrict_new_numbers");
  return value !== "off";
}

export async function setNewNumberRestriction(enabled: boolean): Promise<void> {
  await setSetting("restrict_new_numbers", enabled ? "on" : "off");
}

/**
 * Which networks the new-number restriction applies to.
 * Stored as a JSON array of canonical network keys: "mtn" | "airteltigo" | "telecel".
 * Defaults to ["mtn"] — JessCo only rejects new numbers on MTN.
 */
export const NETWORK_KEYS = ["mtn", "airteltigo", "telecel"] as const;
export type NetworkKey = (typeof NETWORK_KEYS)[number];

export async function getRestrictedNetworks(): Promise<NetworkKey[]> {
  const raw = await getSetting("restrict_new_numbers_networks");
  if (!raw) return ["mtn"];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((n): n is NetworkKey => NETWORK_KEYS.includes(n));
    }
  } catch {
    // fall through to default
  }
  return ["mtn"];
}

export async function setRestrictedNetworks(networks: NetworkKey[]): Promise<void> {
  const clean = Array.from(new Set(networks.filter((n) => NETWORK_KEYS.includes(n))));
  await setSetting("restrict_new_numbers_networks", JSON.stringify(clean));
}
