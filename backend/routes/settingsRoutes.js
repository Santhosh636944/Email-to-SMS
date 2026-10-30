// ============================================================
// Settings Routes — routes/settingsRoutes.js
// Active channels: SMS + AI Voice Call only.
// Secrets (API keys / tokens) are never returned to the frontend.
// ============================================================

const express = require("express");
const router = express.Router();
const NotificationSettings = require("../models/NotificationSettings");

// Fields the frontend is allowed to update.
const UPDATE_FIELDS = [
  "smsEnabled",
  "voiceEnabled",
  "aiClassificationEnabled",
  "smsConfig",
  "voiceConfig",
  "priorityRules",
  "filterKeywords",
];

const MASK = "••••••••";

function sanitize(settings) {
  const obj = settings.toObject ? settings.toObject() : { ...settings };
  if (obj.smsConfig) {
    obj.smsConfig = {
      ...obj.smsConfig,
      apiKey: obj.smsConfig.apiKey ? MASK : "",
      hasApiKey: !!obj.smsConfig.apiKey,
    };
  }
  return obj;
}

// GET /api/settings — Get notification settings (secrets masked)
router.get("/", async (req, res) => {
  try {
    const settings = await NotificationSettings.getSettings();
    res.json(sanitize(settings));
  } catch (err) {
    console.error("Settings fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch settings", detail: err.message });
  }
});

// PUT /api/settings — Update notification settings
router.put("/", async (req, res) => {
  try {
    let settings = await NotificationSettings.getSettings();

    for (const field of UPDATE_FIELDS) {
      if (req.body[field] === undefined) continue;

      if (field === "smsConfig") {
        const incoming = { ...(req.body.smsConfig || {}) };
        // Ignore the masked placeholder so we never overwrite a real key.
        if (incoming.apiKey === MASK) delete incoming.apiKey;
        if (incoming.hasApiKey !== undefined) delete incoming.hasApiKey;
        settings.smsConfig = { ...settings.smsConfig.toObject?.() ?? settings.smsConfig, ...incoming };
      } else {
        settings[field] = req.body[field];
      }
    }

    await settings.save();
    res.json({ success: true, settings: sanitize(settings) });
  } catch (err) {
    console.error("Settings update error:", err.message);
    res.status(500).json({ error: "Failed to update settings", detail: err.message });
  }
});

module.exports = router;
