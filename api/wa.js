/**
 * Vercel / Node: sequência global com Redis (Upstash) + INCR.
 * Hosting só PHP: usa wa.php na raiz (contador em ficheiro + flock).
 */
const LINKS = [
  "https://wa.me/5547997551198?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20em%20ATACADO!%20",
  "https://wa.me/5547997027389?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!",
  "https://wa.me/554799926812?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!",
];

const COUNTER_KEY = "wa_rr_counter";

function redisEnv() {
  const base =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "";
  return {
    base: String(base).replace(/\/$/, ""),
    token: String(token),
  };
}

async function incrRedis() {
  const { base, token } = redisEnv();
  if (!base || !token) throw new Error("missing redis env");

  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["INCR", COUNTER_KEY]),
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const n = Number(body.result);
  if (!Number.isFinite(n)) throw new Error("invalid INCR result");
  return n;
}

function parseFormat(req) {
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "https";
    return new URL(req.url || "/", `${proto}://${host}`).searchParams.get("format");
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");

  const wantJson = parseFormat(req) === "json";

  let index = 0;
  let pool = "client";

  try {
    const m = Number(await incrRedis());
    if (!Number.isFinite(m) || m < 1) throw new Error("invalid INCR");
    index = (m - 1) % LINKS.length;
    pool = "redis";
  } catch {
    index = 0;
    pool = "client";
  }

  const target = LINKS[index];

  if (wantJson) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const payload =
      pool === "client"
        ? { pool, url: target, links: LINKS }
        : { pool, url: target };
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
    return;
  }

  res.setHeader("X-WA-Pool", pool);
  if (pool === "redis") {
    res.setHeader("X-WA-Sequence", String(index + 1));
  }
  res.writeHead(302, { Location: target });
  res.end();
}
