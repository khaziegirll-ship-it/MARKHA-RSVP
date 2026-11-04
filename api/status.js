// GET /api/status — setup check for the admin dashboard. Never returns secret values.
const { redis, config } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { url, token } = config();
  const out = {
    storageConnected: !!(url && token),
    storageReachable: false,
    storageError: "",
    adminPasswordSet: !!process.env.ADMIN_PASSWORD
  };
  if (out.storageConnected) {
    try {
      await redis(["PING"]);
      out.storageReachable = true;
    } catch (e) {
      out.storageError = e.message;
    }
  }
  return res.status(200).json(out);
};
