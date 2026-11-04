// /api/rsvps — host only (x-admin-password header must match ADMIN_PASSWORD).
// GET lists every reply; DELETE ?id=... removes one reply.
const { redis, isAdmin, KEY } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD is not set" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong password" });

  try {
    if (req.method === "DELETE") {
      const id = String((req.query && req.query.id) || "").replace(/[^A-Za-z0-9-]/g, "");
      if (!id) return res.status(400).json({ error: "Missing id" });
      await redis(["HDEL", KEY, id]);
      return res.status(200).json({ ok: true });
    }
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, DELETE");
      return res.status(405).json({ error: "Use GET or DELETE" });
    }
    const flat = (await redis(["HGETALL", KEY])) || [];
    const rsvps = [];
    for (let i = 1; i < flat.length; i += 2) {
      try { rsvps.push(JSON.parse(flat[i])); } catch (_) {}
    }
    return res.status(200).json({ rsvps });
  } catch (e) {
    return res.status(e.code === "NO_STORE" ? 503 : 500).json({ error: e.message, code: e.code || "" });
  }
};
