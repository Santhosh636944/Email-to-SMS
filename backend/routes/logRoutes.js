
const express = require("express");
const router = express.Router();
const NotificationLog = require("../models/NotificationLog");

router.get("/", (req, res) => {
  try {
    const {
      channel,
      status,
      limit: rawLimit = "100",
      page: rawPage = "1",
    } = req.query;

    const limit = Math.min(
      500,
      Math.max(1, parseInt(rawLimit, 10) || 100)
    );
    const page = Math.max(1, parseInt(rawPage, 10) || 1);

    const filters = {};

    if (channel && channel !== "all") {
      filters.channel = channel;
    }

    if (status) {
      filters.status = status.toUpperCase();
    }

    const allLogs = NotificationLog.getLogs(filters)
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt).getTime() -
          new Date(a.date || a.createdAt).getTime()
      );

    const total = allLogs.length;
    const logs = allLogs.slice((page - 1) * limit, page * limit);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Log fetch error:", err.message);
    res.status(500).json({
      error: "Failed to fetch logs",
      detail: err.message,
    });
  }
});

module.exports = router;
