// ============================================================
// Email Routes — routes/emailRoutes.js
// ============================================================

const express = require("express");
const router = express.Router();
const EmailRecord = require("../models/EmailRecord");
const emailService = require("../services/emailService");

// GET /api/emails — List emails with optional filters (backward compatible)
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const { category, priority, search, sort } = req.query;

    // Fast path: no filters -> exactly the original behaviour
    if (!category && !priority && !search) {
      const emails = await emailService.getAllEmails(limit);
      return res.json(emails);
    }

    const query = {};
    if (category && category !== "all") query.aiCategory = category;
    if (priority && priority !== "all") query.priority = priority;
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ subject: rx }, { from: rx }, { body: rx }];
    }

    const order = sort === "oldest" ? { date: 1 } : { date: -1 };
    const emails = await EmailRecord.find(query).sort(order).limit(limit);
    res.json(emails);
  } catch (err) {
    console.error("Email fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch emails", detail: err.message });
  }
});

// GET /api/emails/:id — Get single email
router.get("/:id", async (req, res) => {
  try {
    const email = await emailService.getEmailById(req.params.id);
    if (!email) return res.status(404).json({ error: "Email not found" });
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email", detail: err.message });
  }
});

// POST /api/emails/check — Trigger manual email check
router.post("/check", async (req, res) => {
  try {
    const newEmails = await emailService.checkEmails();
    res.json({ success: true, newEmails });
  } catch (error) {
    console.error("Email check error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/emails/mock — Add a mock email for testing
router.post("/mock", async (req, res) => {
  try {
    const { from, subject, body } = req.body || {};
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ success: false, message: "Subject is required" });
    }
    if (String(subject).length > 300) {
      return res.status(400).json({ success: false, message: "Subject is too long (max 300 chars)" });
    }
    const email = await emailService.addMockEmail({
      from: from ? String(from).slice(0, 200) : undefined,
      subject: String(subject).trim(),
      body: body ? String(body).slice(0, 2000) : undefined,
    });
    res.json({ success: true, email });
  } catch (err) {
    console.error("Mock email error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
