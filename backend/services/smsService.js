// ============================================================
// SMS Service — services/smsService.js
// Sends SMS through the existing httpSMS gateway (unchanged gateway).
// Adds: mock mode, structured statuses, provider id.
// ============================================================

require("dotenv").config();
const axios = require("axios");
const { isMongoConnected } = require("../config/db");
const NotificationLog = require("../models/NotificationLog");

function envFlag(name) {
  return String(process.env[name] || "").toLowerCase() === "true";
}

function isMockMode() {
  return (
    envFlag("SMS_MOCK_MODE") ||
    envFlag("NOTIFICATION_MOCK_MODE") ||
    envFlag("MOCK_MODE")
  );
}

function getSmsStatus() {
  const configured = !!(
    (process.env.SMS_API_URL) &&
    (process.env.SMS_API_KEY) &&
    (process.env.SMS_FROM_PHONE || process.env.SMS_FROM_NUMBER) &&
    (process.env.SMS_TO_PHONE || process.env.SMS_TO_NUMBER)
  );
  return { configured, mock: isMockMode(), gateway: "httpSMS" };
}

function normalizePhone(phone) {
  const s = String(phone || "").trim().replace(/[\s()-]/g, "");
  if (!s) return "";
  return s.startsWith("+") ? s : `+91${s}`;
}

// ── Send SMS for an email record ──────────────────────────────
async function sendSms(email, config = {}) {
  const apiUrl = config.apiUrl || process.env.SMS_API_URL;
  const apiKey = config.apiKey || process.env.SMS_API_KEY;
  const from = config.fromPhone || process.env.SMS_FROM_PHONE || process.env.SMS_FROM_NUMBER;
  const to = config.toPhone || process.env.SMS_TO_PHONE || process.env.SMS_TO_NUMBER;

  if (!apiUrl || !apiKey || !from || !to) {
    console.warn("[SMS] ⚠ Missing SMS configuration");
    await safeLog({
      emailId: email?._id,
      channel: "sms",
      status: "SKIPPED",
      recipient: normalizePhone(to) || "unconfigured",
      message: email?.subject,
      error: "Missing SMS configuration",
      attempts: 0,
    });
    return { success: false, configured: false, error: "Missing SMS configuration" };
  }

  const fromFormatted = normalizePhone(from);
  const toFormatted = normalizePhone(to);

  const message =
    `Alert: ${email.subject || "New Email"}\n` +
    `From: ${email.from || "Unknown"}\n` +
    `Priority: ${email.priority || email.aiCategory || "N/A"}\n` +
    `Preview: ${(email.body || "").substring(0, 100)}`;

  // Mock mode: no network call, but clearly flagged.
  if (isMockMode()) {
    console.log(`[SMS] 🧪 MOCK send (no real SMS) → ${toFormatted}`);
    await safeLog({
      emailId: email?._id,
      channel: "sms",
      status: "SUCCESS",
      recipient: toFormatted,
      message: email?.subject,
      attempts: 1,
      meta: { mock: true, preview: message },
    });
    return { success: true, mock: true, data: { content: message } };
  }

  try {
    console.log(`[SMS] Sending to ${toFormatted} for: "${email.subject}"`);
    const response = await axios.post(
      apiUrl,
      { content: message, from: fromFormatted, to: toFormatted },
      {
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        timeout: 15000,
      }
    );

    await safeLog({
      emailId: email?._id,
      channel: "sms",
      status: "SUCCESS",
      recipient: toFormatted,
      message: email?.subject,
      providerId: response.data?.data?.id || response.data?.id || "",
      attempts: 1,
      meta: { preview: message },
    });

    console.log(`[SMS] ✅ Sent successfully!`);
    return { success: true, data: response.data };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`[SMS] ❌ Failed: ${errMsg}`);

    await safeLog({
      emailId: email?._id,
      channel: "sms",
      status: "FAILED",
      recipient: toFormatted,
      message: email?.subject,
      error: errMsg,
      attempts: 1,
      meta: { preview: message },
    });

    return { success: false, error: errMsg };
  }
}

// ── Send a direct/manual SMS ──────────────────────────────────
async function sendDirectSms(messageText, toNumber) {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const from = process.env.SMS_FROM_PHONE || process.env.SMS_FROM_NUMBER;
  const to = toNumber || process.env.SMS_TO_PHONE || process.env.SMS_TO_NUMBER;

  if (!to) return { success: false, error: "No recipient number provided" };

  const fromFormatted = normalizePhone(from);
  const toFormatted = normalizePhone(to);
  const text = messageText || "Test SMS from Email to SMS App";

  if (isMockMode()) {
    await safeLog({
      channel: "sms",
      status: "SUCCESS",
      recipient: toFormatted,
      message: text,
      attempts: 1,
      meta: { mock: true },
    });
    return { success: true, mock: true, data: { content: text } };
  }

  if (!apiUrl || !apiKey || !from) {
    return { success: false, configured: false, error: "Missing SMS configuration" };
  }

  try {
    const response = await axios.post(
      apiUrl,
      { content: text, from: fromFormatted, to: toFormatted },
      {
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        timeout: 15000,
      }
    );

    await safeLog({
      channel: "sms",
      status: "SUCCESS",
      recipient: toFormatted,
      message: text,
      providerId: response.data?.data?.id || response.data?.id || "",
      attempts: 1,
    });

    return { success: true, data: response.data };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    await safeLog({
      channel: "sms",
      status: "FAILED",
      recipient: toFormatted,
      message: text,
      error: errMsg,
      attempts: 1,
    });
    return { success: false, error: errMsg };
  }
}

async function safeLog(data) {
  if (!isMongoConnected()) {
    return null;
  }

  try {
    await NotificationLog.create(data);
  } catch (err) {
    console.error("[SMS] Failed to write notification log:", err.message);
  }
}

module.exports = {
  sendSms,
  sendDirectSms,
  getSmsStatus,
  isMockMode,
};
