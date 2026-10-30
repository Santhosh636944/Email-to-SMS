// ============================================================
// SMS Routes — routes/smsRoutes.js
// SMS is one of the two active channels (httpSMS gateway).
// ============================================================

const express = require("express");
const router = express.Router();
const { sendDirectSms, getSmsStatus } = require("../services/smsService");

// GET /api/sms/status — configuration status (no secrets)
router.get("/status", (req, res) => {
  res.json(getSmsStatus());
});

// POST /api/sms/send — Send a direct/test SMS (respects mock mode)
router.post("/send", async (req, res) => {
  try {
    const { message, to } = req.body || {};
    if (message && String(message).length > 500) {
      return res.status(400).json({ success: false, error: "Message too long (max 500 chars)" });
    }

    const smsText = message || "Test SMS from Email to SMS App";
    const result = await sendDirectSms(smsText, to);

    if (result.success) {
      return res.json({ success: true, mock: !!result.mock, message: "SMS sent", data: result.data });
    }
    const status = result.configured === false ? 400 : 500;
    return res.status(status).json({ success: false, error: result.error, configured: result.configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
