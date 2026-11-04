// GET /api/rsvps — host only. Needs the x-admin-password header to match ADMIN_PASSWORD.
const { redis } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ error: "ADMIN_PASSWORD is not set" });
  if (req.headers["x-admin-password"] !== expected) return res.status(401).json({ error: "Wrong password" });

  try {
    const flat = (await redis(["HGETALL", "markha:rsvps"])) || [];
    const rsvps = [];
    for (let i = 1; i < flat.length; i += 2) {
      try { rsvps.push(JSON.parse(flat[i])); } catch (_) {}
    }
    return res.status(200).json({ rsvps });
  } catch (e) {
    return res.status(e.code === "NO_STORE" ? 503 : 500).json({ error: e.message });
  }
};
