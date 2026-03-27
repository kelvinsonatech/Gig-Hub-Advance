import { db } from "@workspace/db";
import { networksTable, bundlesTable, servicesTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const existingNetworks = await db.select().from(networksTable);
  if (existingNetworks.length > 0) {
    console.log("Data already seeded, skipping...");
    process.exit(0);
  }

  const [mtn, airteltigo, telecel] = await db.insert(networksTable).values([
    { name: "MTN Ghana", code: "MTN", color: "#FFCC00" },
    { name: "AirtelTigo", code: "AT", color: "#E20074" },
    { name: "Telecel Ghana", code: "TELECEL", color: "#CC0000" },
  ]).returning();

  console.log("Networks seeded:", mtn.id, airteltigo.id, telecel.id);

  await db.insert(bundlesTable).values([
    // MTN bundles
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 1GB Daily", data: "1GB", validity: "1 Day", price: "2.00", type: "daily", popular: false },
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 2GB Daily", data: "2GB", validity: "1 Day", price: "3.50", type: "daily", popular: true },
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 5GB Weekly", data: "5GB", validity: "7 Days", price: "10.00", type: "weekly", popular: true },
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 10GB Weekly", data: "10GB", validity: "7 Days", price: "18.00", type: "weekly", popular: false },
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 15GB Monthly", data: "15GB", validity: "30 Days", price: "35.00", type: "monthly", popular: true },
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 30GB Monthly", data: "30GB", validity: "30 Days", price: "60.00", type: "monthly", popular: false },
    { networkId: mtn.id, networkName: "MTN Ghana", name: "MTN 50GB Special", data: "50GB", validity: "30 Days", price: "90.00", type: "special", popular: true },
    // AirtelTigo bundles
    { networkId: airteltigo.id, networkName: "AirtelTigo", name: "AT 1.5GB Daily", data: "1.5GB", validity: "1 Day", price: "2.50", type: "daily", popular: false },
    { networkId: airteltigo.id, networkName: "AirtelTigo", name: "AT 3GB Daily", data: "3GB", validity: "1 Day", price: "4.00", type: "daily", popular: true },
    { networkId: airteltigo.id, networkName: "AirtelTigo", name: "AT 8GB Weekly", data: "8GB", validity: "7 Days", price: "14.00", type: "weekly", popular: true },
    { networkId: airteltigo.id, networkName: "AirtelTigo", name: "AT 20GB Monthly", data: "20GB", validity: "30 Days", price: "40.00", type: "monthly", popular: true },
    { networkId: airteltigo.id, networkName: "AirtelTigo", name: "AT 40GB Monthly", data: "40GB", validity: "30 Days", price: "70.00", type: "monthly", popular: false },
    // Telecel bundles
    { networkId: telecel.id, networkName: "Telecel Ghana", name: "Telecel 1GB Daily", data: "1GB", validity: "1 Day", price: "1.80", type: "daily", popular: false },
    { networkId: telecel.id, networkName: "Telecel Ghana", name: "Telecel 5GB Weekly", data: "5GB", validity: "7 Days", price: "9.00", type: "weekly", popular: true },
    { networkId: telecel.id, networkName: "Telecel Ghana", name: "Telecel 15GB Monthly", data: "15GB", validity: "30 Days", price: "32.00", type: "monthly", popular: true },
    { networkId: telecel.id, networkName: "Telecel Ghana", name: "Telecel 30GB Special", data: "30GB", validity: "30 Days", price: "55.00", type: "special", popular: true },
  ]);

  await db.insert(servicesTable).values([
    { name: "AFA Registration", description: "Register your Ghana Card (NIA/AFA) quickly and securely", category: "registration", price: "20.00" },
    { name: "MTN AFA Registration", description: "Link your Ghana Card to your MTN number", category: "registration", price: "20.00" },
    { name: "AirtelTigo AFA Registration", description: "Link your Ghana Card to your AirtelTigo number", category: "registration", price: "20.00" },
    { name: "Telecel AFA Registration", description: "Link your Ghana Card to your Telecel number", category: "registration", price: "20.00" },
    { name: "Agent Registration", description: "Become a GigsHub agent and earn commissions", category: "agent", price: "50.00" },
    { name: "SIM Registration", description: "Register a new SIM card with your Ghana Card details", category: "registration", price: "15.00" },
    { name: "Data Bundle Transfer", description: "Transfer data bundles to another number", category: "transfer", price: "1.00" },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
