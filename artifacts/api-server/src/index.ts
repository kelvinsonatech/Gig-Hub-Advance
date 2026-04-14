import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";
import { startJesscoPoller } from "./lib/jessco";
import { startPaymentRecovery } from "./lib/payment-recovery";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Verify Telegram configuration at startup
const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
console.log(`[Telegram] Config: ${hasTelegram ? "✓ BOT_TOKEN + CHAT_ID present" : "✗ MISSING env vars — notifications disabled"}`);

// Seed database first, then start listening
seedDatabase().finally(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    startJesscoPoller(30_000);
    startPaymentRecovery(60_000);
  });
});
