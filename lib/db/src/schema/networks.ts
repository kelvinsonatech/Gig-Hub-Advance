import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const networksTable = pgTable("networks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  color: text("color").notNull(),
  logoUrl: text("logo_url"),
  tagline: text("tagline"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertNetworkSchema = createInsertSchema(networksTable).omit({ id: true });
export type InsertNetwork = z.infer<typeof insertNetworkSchema>;
export type Network = typeof networksTable.$inferSelect;
