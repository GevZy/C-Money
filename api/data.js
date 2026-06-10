// api/data.js — Vercel Serverless Function
// GET  → load finflow data from Upstash Redis
// POST → save finflow data to Upstash Redis
//
// Required env vars (auto-filled when you connect Upstash in Vercel Storage):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// You add this one manually in Vercel → Settings → Environment Variables:
//   FINFLOW_SECRET   ← the password you put in app.js

import { Redis } from "@upstash/redis";

const redis    = Redis.fromEnv();
const DATA_KEY = "finflow_data";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-finflow-secret");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Auth check ──────────────────────────────────────────────────
  const secret = process.env.FINFLOW_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "FINFLOW_SECRET env var not set on server." });
  }
  if (req.headers["x-finflow-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── GET — load data ─────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const data = await redis.get(DATA_KEY);
      return res.status(200).json({ data: data ?? null });
    } catch (err) {
      console.error("[FinFlow] Redis GET error:", err);
      return res.status(500).json({ error: "Failed to load data." });
    }
  }

  // ── POST — save data ────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Request body must be a JSON object." });
      }
      await redis.set(DATA_KEY, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[FinFlow] Redis SET error:", err);
      return res.status(500).json({ error: "Failed to save data." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}