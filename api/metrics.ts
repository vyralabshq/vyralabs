// Server-side metrics proxy (Vercel function). The browser fetches these from our own
// origin (/api/metrics/<file>), so the collector box's URL, IP, and the shared secret
// never reach the client. This function fetches the box server-to-server, adding the
// secret header the box requires, and returns the JSON. Direct hits to the box (without
// the header) are refused by Caddy, so the endpoint is only usable through this proxy.

const ALLOWED = new Set(["latest.json", "history-1h.json", "history-24h.json"]);

interface Req {
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  send(body: string): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: Req, res: Res) {
  const raw = req.query?.file;
  const file = String(Array.isArray(raw) ? raw[0] : (raw ?? ""));
  if (!ALLOWED.has(file)) {
    res.status(404).json({ error: "not found" });
    return;
  }

  const origin = process.env.METRICS_ORIGIN || "https://metrics.vyralabs.fun";
  const key = process.env.METRICS_KEY || "";

  try {
    const upstream = await fetch(`${origin}/${file}`, {
      headers: key ? { "X-Vyra-Key": key } : {},
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `upstream ${upstream.status}` });
      return;
    }
    const body = await upstream.text();
    res.setHeader("Content-Type", "application/json");
    // Match the box's short TTL; s-maxage lets Vercel's edge absorb bursts.
    res.setHeader("Cache-Control", "public, max-age=5, s-maxage=5");
    res.status(200).send(body);
  } catch {
    res.status(502).json({ error: "fetch failed" });
  }
}
