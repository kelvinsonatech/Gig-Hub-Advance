---
name: Fulfillment poller idempotency
description: Why fulfillment pollers must exclude terminal states and why failure-alert branches must be idempotent
---

# Fulfillment pollers must stop at terminal states + alerts must be idempotent

**Rule:** Any background poller that re-checks provider order status (JessCo, Xpress-gh, future providers) must filter to orders still genuinely in flight — only `details.fulfillmentStatus === "sent"`. Do NOT also include `order.status === "processing"`, because a failed order is intentionally left at `status: "processing"` (admin handles it manually) while `fulfillmentStatus` becomes `"pending_manual"`. The failure/refund branch of the status handler must also be idempotent: if the order is already `pending_manual` with the same `webhookStatus`, return early before re-updating or re-alerting.

**Why:** Without both guards the poller re-processed terminal-failed orders every cycle (~30s) and the failure branch called `sendFulfillmentAlert` each time, spamming the Telegram bot indefinitely for the same orders. Reported by user as "bot is fooling."

**How to apply:** When adding a new fulfillment provider, mirror this: poll only `fulfillmentStatus === "sent"`, and short-circuit the failure handler when the stored state already matches. Terminal states are `delivered` (success) and `pending_manual` (failure/refund).
