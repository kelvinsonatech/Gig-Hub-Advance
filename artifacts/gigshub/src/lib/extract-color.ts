/**
 * Extracts the dominant non-white, non-transparent color from an image URL.
 * Uses the Canvas API to sample pixels. Returns null on CORS failure or error.
 */
export async function extractDominantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 60;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          if (r > 235 && g > 235 && b > 235) continue;
          if (r < 25 && g < 25 && b < 25) continue;
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;
          buckets[key] = (buckets[key] ?? 0) + 1;
        }

        const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
        if (!top) { resolve(null); return; }
        const [r, g, b] = top[0].split(",").map(Number);
        resolve(
          "#" +
          r.toString(16).padStart(2, "0") +
          g.toString(16).padStart(2, "0") +
          b.toString(16).padStart(2, "0")
        );
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
