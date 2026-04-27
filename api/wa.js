/**
 * Rodízio global 1 → 2 → 3 → 1… (cada lead = próximo número).
 *
 * Produção na Vercel: liga **Vercel KV** ou **Upstash Redis** ao projeto — as variáveis
 * `KV_REST_*` ou `UPSTASH_REDIS_*` são injetadas automaticamente ao criar o storage.
 * Sem credenciais, cai em sorteio uniforme (só para dev local).
 */
import { randomInt } from "node:crypto";
import { Redis } from "@upstash/redis";

const LINKS = [
  "https://wa.me/5547997551198?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20em%20ATACADO!%20",
  "https://wa.me/5547997027389?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!",
  "https://wa.me/554799926812?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!",
];

const COUNTER_KEY = "wa_rr_counter";

/** Upstash (console) ou Vercel KV — mesma API REST. */
function createRedis() {
  const url = String(
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ""
  ).replace(/\/$/, "");
  const token = String(
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ""
  );
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function incrRedis() {
  const redis = createRedis();
  if (!redis) throw new Error("missing redis env");
  const n = await redis.incr(COUNTER_KEY);
  if (!Number.isFinite(n) || n < 1) throw new Error("invalid INCR");
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
  let pool = "random";

  try {
    const m = Number(await incrRedis());
    index = (m - 1) % LINKS.length;
    pool = "redis";
  } catch {
    index = randomInt(0, LINKS.length);
    pool = "random";
  }

  const target = LINKS[index];

  if (wantJson) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 200;
    res.end(JSON.stringify({ pool, url: target }));
    return;
  }

  res.setHeader("X-WA-Pool", pool);
  if (pool === "redis") {
    res.setHeader("X-WA-Sequence", String(index + 1));
  } else {
    res.setHeader("X-WA-Index", String(index + 1));
  }
  res.writeHead(302, { Location: target });
  res.end();
}
