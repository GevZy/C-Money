// api/data.js — Vercel Serverless Function
// GET  → load finflow data from KV
// POST → save finflow data to KV
//
// Required env vars (set in Vercel dashboard):
//   KV_REST_API_URL     ← auto-filled when you connect a KV store
//   KV_REST_API_TOKEN   ← auto-filled when you connect a KV store
//   FINFLOW_SECRET      ← a password you choose yourself (any string)

import { kv } from "@vercel/kv";

const DATA_KEY = "finflow_data";

export default async function handler(req, res) {
  // Allow requests from any origin (it's your private app anyway)
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
      const data = await kv.get(DATA_KEY);
      return res.status(200).json({ data: data ?? null });
    } catch (err) {
      console.error("[FinFlow] KV GET error:", err);
      return res.status(500).json({ error: "Failed to load data from KV." });
    }
  }

  // ── POST — save data ────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "Request body must be a JSON object." });
      }
      await kv.set(DATA_KEY, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[FinFlow] KV SET error:", err);
      return res.status(500).json({ error: "Failed to save data to KV." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}
