// ============================================================
// Export Routes — routes/exportRoutes.js
// ============================================================

const express = require("express");
const router = express.Router();
const exportService = require("../services/exportService");

// GET /api/export/pdf — Export notification logs as PDF
router.get("/pdf", async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.from,
      dateTo: req.query.to,
      channel: req.query.type || req.query.channel,
    };
    await exportService.generatePDF(filters, res);
  } catch (err) {
    console.error("PDF export error:", err.message);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// GET /api/export/excel — Export notification logs as Excel
router.get("/excel", async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.from,
      dateTo: req.query.to,
      channel: req.query.type || req.query.channel,
    };
    await exportService.generateExcel(filters, res);
  } catch (err) {
    console.error("Excel export error:", err.message);
    res.status(500).json({ error: "Failed to generate Excel" });
  }
});

// GET /api/export/csv — Export notification logs as CSV
router.get("/csv", async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.from,
      dateTo: req.query.to,
      channel: req.query.type || req.query.channel,
    };
    await exportService.generateCSV(filters, res);
  } catch (err) {
    console.error("CSV export error:", err.message);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
});

// GET /api/export/preview — Preview filtered data before export
router.get("/preview", async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.from,
      dateTo: req.query.to,
      channel: req.query.type || req.query.channel,
    };
    const logs = await exportService.getFilteredLogs(filters);
    res.json({ total: logs.length, logs: logs.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: "Failed to preview data" });
  }
});

module.exports = router;
