// Shared helper: talks to the Upstash Redis store connected to this Vercel project.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!URL_ || !TOKEN) {
    const err = new Error("Storage is not connected");
    err.code = "NO_STORE";
    throw err;
  }
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Redis error " + res.status);
  return data.result;
}

module.exports = { redis };
