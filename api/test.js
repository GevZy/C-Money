import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  const results = {
    has_kv_url:    !!process.env.KV_REST_API_URL,
    has_kv_token:  !!process.env.KV_REST_API_TOKEN,
    has_secret:    !!process.env.FINFLOW_SECRET,
  };

  try {
    const redis = new Redis({
      url:   process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    results.redis_ping = await redis.ping();
  } catch (err) {
    results.redis_error = err.message;
  }

  return res.status(200).json(results);
}