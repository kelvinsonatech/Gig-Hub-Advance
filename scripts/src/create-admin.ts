import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const email = "admin@gigshub.store";
const password = "Admin@GigsHub2025";

console.log("Creating admin user...");

const hash = await bcrypt.hash(password, 10);

const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

if (existing.length > 0) {
  await db.update(usersTable)
    .set({ role: "admin", passwordHash: hash })
    .where(eq(usersTable.email, email));
  console.log("✓ Existing user promoted to admin");
} else {
  const [user] = await db.insert(usersTable).values({
    name: "Admin",
    email,
    phone: "0200000000",
    passwordHash: hash,
    role: "admin",
  }).returning();
  await db.insert(walletsTable).values({ userId: user.id, balance: "0", currency: "GHS" });
  console.log("✓ Admin user created");
}

console.log("\nAdmin login credentials:");
console.log("  Email:    admin@gigshub.store");
console.log("  Password: Admin@GigsHub2025");

process.exit(0);
