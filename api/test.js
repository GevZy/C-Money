// api/test.js — temporary debug endpoint
// Visit yoursite.vercel.app/api/test to see what's wrong
// Delete this file once sync is working.

import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  const results = {};

  // Check env vars exist
  results.has_url   = !!process.env.UPSTASH_REDIS_REST_URL;
  results.has_token = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  results.has_secret = !!process.env.FINFLOW_SECRET;

  // Try a live Redis ping
  try {
    const redis = Redis.fromEnv();
    const ping  = await redis.ping();
    results.redis_ping = ping; // should say "PONG"
  } catch (err) {
    results.redis_error = err.message;
  }

  return res.status(200).json(results);
}
