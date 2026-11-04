// POST /api/rsvp — saves or updates one guest's reply.
const { redis, KEY } = require("./_store");

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  const id = clip(body.id, 64).replace(/[^A-Za-z0-9-]/g, "");
  const name = clip(body.name, 80);
  const attending = body.attending === "yes" ? "yes" : body.attending === "no" ? "no" : "";
  if (!id || !name || !attending) return res.status(400).json({ error: "Name and attendance are required" });

  const partySize = attending === "yes" ? Math.max(1, Math.min(3, parseInt(body.partySize, 10) || 1)) : 0;
  const reply = {
    id, name, attending, partySize,
    monito: body.monito === "yes" || body.monito === true ? "yes" : body.monito === "no" || body.monito === false ? "no" : "",
    contact: clip(body.contact, 80),
    message: clip(body.message, 600),
    updatedAt: new Date().toISOString()
  };

  try {
    await redis(["HSET", KEY, id, JSON.stringify(reply)]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.code === "NO_STORE" ? 503 : 500).json({ error: e.message });
  }
};
