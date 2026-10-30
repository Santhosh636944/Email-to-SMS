// ============================================================
// System Status Routes — routes/systemRoutes.js
// ============================================================

const express = require("express");
const router = express.Router();
const { getSystemStatus } = require("../services/systemStatusService");

// GET /api/system/status — connection status for every integration
router.get("/status", (req, res) => {
  try {
    res.json(getSystemStatus());
  } catch (err) {
    console.error("System status error:", err.message);
    res.status(500).json({ error: "Failed to compute system status", detail: err.message });
  }
});

module.exports = router;
