import { pgTable, text, serial, numeric, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bundleTypeEnum = pgEnum("bundle_type", ["daily", "weekly", "monthly", "special"]);

export const bundlesTable = pgTable("bundles", {
  id: serial("id").primaryKey(),
  networkId: integer("network_id").notNull(),
  networkName: text("network_name").notNull(),
  name: text("name").notNull(),
  data: text("data").notNull(),
  validity: text("validity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  type: bundleTypeEnum("type").notNull(),
  popular: boolean("popular").notNull().default(false),
});

export const insertBundleSchema = createInsertSchema(bundlesTable).omit({ id: true });
export type InsertBundle = z.infer<typeof insertBundleSchema>;
export type Bundle = typeof bundlesTable.$inferSelect;
