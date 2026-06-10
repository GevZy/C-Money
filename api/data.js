import { Redis } from "@upstash/redis";

const redis    = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const DATA_KEY = "finflow_data";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-finflow-secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  const secret = process.env.FINFLOW_SECRET;
  if (!secret || req.headers["x-finflow-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const data = await redis.get(DATA_KEY);
      return res.status(200).json({ data: data ?? null });
    } catch (err) {
      console.error("[FinFlow] Redis GET error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Invalid body" });
      }
      await redis.set(DATA_KEY, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[FinFlow] Redis SET error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}