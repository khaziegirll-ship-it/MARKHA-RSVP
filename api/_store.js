// Shared helper: talks to the Upstash Redis store connected to this Vercel project.
// Vercel may add a custom prefix to the variable names (e.g. STORAGE_KV_REST_API_URL),
// so look for any variable that ends with the expected name.
function findEnv(suffixes, exclude) {
  for (const suffix of suffixes) {
    if (process.env[suffix]) return process.env[suffix];
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (!val) continue;
    if (exclude && exclude.test(key)) continue;
    if (suffixes.some((s) => key.endsWith("_" + s))) return val;
  }
  return "";
}

function config() {
  return {
    url: findEnv(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]),
    token: findEnv(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"], /READ_ONLY/)
  };
}

async function redis(command) {
  const { url, token } = config();
  if (!url || !token) {
    const err = new Error("Storage is not connected");
    err.code = "NO_STORE";
    throw err;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok || data.error) throw new Error(data.error || "Storage error " + res.status);
  return data.result;
}

const KEY = "markha:rsvps";

function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && req.headers["x-admin-password"] === expected;
}

module.exports = { redis, config, isAdmin, KEY };
