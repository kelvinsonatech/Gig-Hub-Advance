import type { Response } from "express";

// ── Per-user SSE streams (order status updates → customers) ──────────────────
const userClients = new Map<number, Set<Response>>();

export function addSseClient(userId: number, res: Response) {
  if (!userClients.has(userId)) userClients.set(userId, new Set());
  userClients.get(userId)!.add(res);
}

export function removeSseClient(userId: number, res: Response) {
  userClients.get(userId)?.delete(res);
  if (userClients.get(userId)?.size === 0) userClients.delete(userId);
}

export function pushEventToUser(userId: number, event: string, data: unknown) {
  const clients = userClients.get(userId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// ── Admin SSE streams (new orders + status changes → admin panel) ─────────────
const adminClients = new Set<Response>();

export function addAdminSseClient(res: Response) {
  adminClients.add(res);
}

export function removeAdminSseClient(res: Response) {
  adminClients.delete(res);
}

export function pushEventToAdmins(event: string, data: unknown) {
  if (adminClients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of adminClients) {
    try { res.write(payload); } catch { adminClients.delete(res); }
  }
}
