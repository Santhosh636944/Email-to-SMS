// ============================================================
// WhatsApp Service — services/whatsappService.js
// Uses CallMeBot free API for demo WhatsApp notifications
// ============================================================

require("dotenv").config();
const axios = require("axios");
const NotificationLog = require("../models/NotificationLog");

// ── Send WhatsApp message via CallMeBot ───────────────────────
// Sign up: https://www.callmebot.com/blog/free-api-whatsapp-messages/
// Send "I allow callmebot to send me messages" to +34 644 51 95 23
// You'll receive an API key
async function sendWhatsApp(email, config = {}) {
  const apiKey = config.apiKey || process.env.WHATSAPP_API_KEY;
  const phone = config.phoneNumber || process.env.WHATSAPP_PHONE;

  if (!apiKey || !phone) {
    console.warn("[WhatsApp] ⚠ Missing WhatsApp configuration");
    return { success: false, error: "Missing WhatsApp configuration" };
  }

  const message = `📧 *Email Alert*\n*From:* ${email.from || "Unknown"}\n*Subject:* ${email.subject || "No Subject"}\n*Category:* ${email.aiCategory || "N/A"}\n*Preview:* ${(email.body || "").substring(0, 100)}`;

  try {
    console.log(`[WhatsApp] Sending to ${phone} for: "${email.subject}"`);

    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMsg}&apikey=${apiKey}`;

    const response = await axios.get(url, { timeout: 15000 });

    console.log(`[WhatsApp] ✅ Sent successfully!`);

    await NotificationLog.create({
      emailId: email._id,
      channel: "whatsapp",
      status: "SUCCESS",
      recipient: phone,
      message: email.subject,
      date: new Date(),
    });

    return { success: true, data: response.data };
  } catch (err) {
    const errMsg = err.response?.data || err.message;
    console.error(`[WhatsApp] ❌ Failed: ${errMsg}`);

    await NotificationLog.create({
      emailId: email._id,
      channel: "whatsapp",
      status: "FAILED",
      recipient: phone,
      message: email.subject,
      error: String(errMsg),
      date: new Date(),
    });

    return { success: false, error: String(errMsg) };
  }
}

// ── Send a direct/manual WhatsApp ─────────────────────────────
async function sendDirectWhatsApp(messageText) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phone = process.env.WHATSAPP_PHONE;

  if (!apiKey || !phone) {
    return { success: false, error: "Missing WhatsApp configuration" };
  }

  try {
    const encodedMsg = encodeURIComponent(messageText);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMsg}&apikey=${apiKey}`;

    const response = await axios.get(url, { timeout: 15000 });

    await NotificationLog.create({
      channel: "whatsapp",
      status: "SUCCESS",
      recipient: phone,
      message: messageText,
      date: new Date(),
    });

    return { success: true, data: response.data };
  } catch (err) {
    const errMsg = err.response?.data || err.message;

    await NotificationLog.create({
      channel: "whatsapp",
      status: "FAILED",
      recipient: phone,
      message: messageText,
      error: String(errMsg),
      date: new Date(),
    });

    return { success: false, error: String(errMsg) };
  }
}

module.exports = {
  sendWhatsApp,
  sendDirectWhatsApp,
};
