import { Router } from "express";

const router = Router();

/**
 * GET /api/utils/image-proxy?url=<encoded-image-url>
 * Fetches a remote image server-side and returns it with permissive CORS headers
 * so the browser canvas can read pixel data (avoids cross-origin taint).
 */
router.get("/image-proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).json({ message: "Missing url query parameter" });
    return;
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "GigsHub/1.0 (color-extractor)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      res.status(502).json({ message: `Upstream returned ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    const buffer = await upstream.arrayBuffer();

    res.set({
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    });
    res.send(Buffer.from(buffer));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch image";
    res.status(502).json({ message: msg });
  }
});

export default router;
