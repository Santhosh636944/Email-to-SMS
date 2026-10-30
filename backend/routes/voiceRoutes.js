// ============================================================
// Voice Call Routes — routes/voiceRoutes.js
// AI Voice Call is one of the two active channels.
// ============================================================

const express = require("express");
const router = express.Router();
const NotificationLog = require("../models/NotificationLog");
const { makeCall, getVoiceStatus, fetchCallStatus } = require("../services/voiceService");

// GET /api/voice/status — provider configuration status (no secrets)
router.get("/status", (req, res) => {
  res.json(getVoiceStatus());
});

// GET /api/voice/calls — recent voice call history
router.get("/calls", async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const calls = await NotificationLog.find({ channel: "voice" })
      .sort({ date: -1 })
      .limit(limit)
      .populate("emailId", "subject from aiCategory priority");
    res.json({ calls, total: calls.length });
  } catch (err) {
    console.error("Voice calls fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch voice calls", detail: err.message });
  }
});

// POST /api/voice/test — place a test call (or a clearly-flagged mock)
router.post("/test", async (req, res) => {
  try {
    const { message, to } = req.body || {};
    if (message && String(message).length > 500) {
      return res.status(400).json({ success: false, error: "Message too long (max 500 chars)" });
    }

    const testEmail = {
      subject: "MailSense AI test call",
      from: "MailSense AI",
      body: message || "This is a test call from the MailSense AI notification system.",
      aiCategory: "Urgent",
      priority: "URGENT",
    };

    const result = await makeCall(testEmail, { to });
    if (result.success) {
      return res.json({
        success: true,
        mock: !!result.mock,
        providerCallId: result.providerCallId,
        status: result.status,
      });
    }
    const status = result.configured === false ? 400 : 500;
    return res.status(status).json({ success: false, error: result.error, configured: result.configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/voice/:id/refresh — refresh provider call status
router.post("/:id/refresh", async (req, res) => {
  try {
    const status = await fetchCallStatus(req.params.id);
    if (!status) {
      return res.status(400).json({ success: false, error: "No provider status available" });
    }
    const mapped =
      status.status === "completed" ? "SUCCESS"
      : ["failed", "busy", "no-answer", "canceled"].includes(status.status) ? "FAILED"
      : "IN_PROGRESS";

    await NotificationLog.findOneAndUpdate(
      { providerId: req.params.id },
      { status: mapped, meta: { providerStatus: status.status } }
    );

    res.json({ success: true, providerStatus: status.status, status: mapped, duration: status.duration });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
