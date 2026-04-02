/**
 * Resolves the base API URL.
 *
 * Priority:
 *  1. VITE_API_URL env var — set this in Vercel (or any external host) to point at the Replit API server
 *  2. BASE_URL — falls back to the same host (works on Replit where the Express API is collocated)
 */
export const API = (import.meta.env.VITE_API_URL ?? import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
