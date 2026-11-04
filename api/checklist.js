// /api/checklist — host only (x-admin-password header must match ADMIN_PASSWORD).
// GET returns the guest checklist (seeded with the starting list the first time).
// PUT saves the whole checklist: { groups: [{ name, note, items: [{ name, checked }] }] }.
const { redis, isAdmin } = require("./_store");

const CHECKLIST_KEY = "markha:checklist";

const g = (name, names, slots, note) => ({
  name,
  note: note || "",
  items: Array.from({ length: Math.max(slots, names.length) }, (_, i) => ({ name: names[i] || "", checked: false }))
});

const DEFAULT_GROUPS = [
  g("Office", ["Nora De Leon", "Wilmer Medina", "Cha Cha Babagay", "Faith Asher", "Dexter Castro", "Jasmin"], 7),
  g("Bahay", ["Albaniel", "Pau", "Christian"], 8),
  g("Trucking", ["Jun", "Gurang", "Roybee"], 3),
  g("Tindahan", ["Edward"], 1),
  g("Hardware", ["Emerson Balayo", "Corazon Pantig", "Nonoy"], 3),
  g("Funeraria", [], 8),
  g("Bahay – Dra Auds", ["Cristina Dabu", "Ana"], 16, "16 persons"),
  g("Others", ["Leni Balayo", "Sony", "Sidol"], 13)
];

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

function clean(groups) {
  if (!Array.isArray(groups)) return null;
  return groups.slice(0, 30).map((grp) => ({
    name: clip(grp && grp.name, 60) || "Group",
    note: clip(grp && grp.note, 60),
    items: (Array.isArray(grp && grp.items) ? grp.items : []).slice(0, 80).map((it) => ({
      name: String(it && it.name == null ? "" : it.name).slice(0, 80),
      checked: !!(it && it.checked)
    }))
  }));
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD is not set" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong password" });

  try {
    if (req.method === "GET") {
      const raw = await redis(["GET", CHECKLIST_KEY]);
      let saved = null;
      try { saved = raw ? JSON.parse(raw) : null; } catch (_) {}
      if (saved && Array.isArray(saved.groups)) return res.status(200).json(saved);
      return res.status(200).json({ groups: DEFAULT_GROUPS, updatedAt: "" });
    }
    if (req.method === "PUT" || req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
      const groups = clean(body && body.groups);
      if (!groups) return res.status(400).json({ error: "Missing checklist" });
      const doc = { groups, updatedAt: new Date().toISOString() };
      await redis(["SET", CHECKLIST_KEY, JSON.stringify(doc)]);
      return res.status(200).json({ ok: true, updatedAt: doc.updatedAt });
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Use GET or PUT" });
  } catch (e) {
    return res.status(e.code === "NO_STORE" ? 503 : 500).json({ error: e.message });
  }
};
