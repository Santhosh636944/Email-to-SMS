// ============================================================
// FULL-STACK SERVER — server.js (MailSense AI / Email to SMS)
// Active notification channels: SMS + AI Voice Call only.
// ============================================================

require("dotenv").config();

console.log("🚀 SERVER STARTING...");

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Services
const emailService = require("./services/emailService");
const { initAI } = require("./services/aiService");
const { getSmsStatus } = require("./services/smsService");
const { getVoiceStatus } = require("./services/voiceService");
const { getSystemStatus } = require("./services/systemStatusService");

// Routes
const emailRoutes = require("./routes/emailRoutes");
const logRoutes = require("./routes/logRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const smsRoutes = require("./routes/smsRoutes");
const voiceRoutes = require("./routes/voiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const exportRoutes = require("./routes/exportRoutes");
const systemRoutes = require("./routes/systemRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (non-fatal: the app keeps running if it's down)
connectDB();

// Initialize AI classification service
initAI();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/emails", emailRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/system", systemRoutes);

// Home & Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 MailSense AI — Email to SMS & AI Voice Notifier Backend Running",
    version: "2.1.0",
    channels: ["sms", "voice"],
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", port: PORT, time: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Global error handler — never crash on a bad request
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================
// AUTO CHECK EMAILS INTERVAL
// ============================================================

const intervalSeconds = parseInt(process.env.EMAIL_CHECK_INTERVAL) || 60;
let checkTimer = null;

if (emailService.checkEmails) {
  emailService.checkEmails().catch((err) => {
    console.log("Initial Email Check Failed:", err.message);
  });

  checkTimer = setInterval(() => {
    emailService.checkEmails().catch((err) => {
      console.log("Email Check Failed:", err.message);
    });
  }, intervalSeconds * 1000);
}

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  const sms = getSmsStatus();
  const voice = getVoiceStatus();

  console.log("================================================");
  console.log("🚀 SERVER RUNNING");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("================================================");
  console.log(`📧 EMAIL ACCOUNT : ${process.env.EMAIL_USER || "Not Set"}`);
  console.log(`📱 SMS GATEWAY   : ${sms.configured ? (sms.mock ? "Configured (MOCK MODE)" : "Configured") : "Not Configured"}`);
  console.log(`📞 VOICE PROVIDER: ${voice.configured ? (voice.mock ? "Configured (MOCK MODE)" : "Twilio") : "Not Configured"}`);
  console.log(`🤖 AI            : ${process.env.GEMINI_API_KEY ? "Gemini" : "Keyword fallback"}`);

  if (!voice.configured && !voice.mock) {
    console.log("⚠  Voice calls disabled — set TWILIO_* and ALERT_PHONE_NUMBER in .env");
  }
  console.log("Active channels: SMS + AI Voice Call");
  console.log("================================================");

  // Print a one-time status snapshot for diagnostics
  try {
    const status = getSystemStatus();
    status.services.forEach((s) => {
      console.log(`• ${s.label.padEnd(22)} ${s.state.padEnd(12)} ${s.detail}`);
    });
  } catch (e) {
    /* ignore */
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason?.message || reason);
});

module.exports = app;
