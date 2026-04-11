import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export type FulfillmentMode = "manual" | "api";

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
  return mode === "api" ? "api" : "manual";
}

export async function setFulfillmentMode(mode: FulfillmentMode): Promise<void> {
  await setSetting("fulfillment_mode", mode);
}
