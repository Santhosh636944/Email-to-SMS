// ============================================================
// Desktop Notification Service — services/desktopNotificationService.js
// Uses Server-Sent Events (SSE) to push notifications to the browser
// ============================================================

const NotificationLog = require("../models/NotificationLog");

// Store connected SSE clients
let sseClients = [];

// ── Add an SSE client ─────────────────────────────────────────
function addClient(res) {
  sseClients.push(res);
  console.log(`[Desktop] 🖥 Client connected. Total: ${sseClients.length}`);

  // Remove client on disconnect
  res.on("close", () => {
    sseClients = sseClients.filter((c) => c !== res);
    console.log(`[Desktop] 🖥 Client disconnected. Total: ${sseClients.length}`);
  });
}

// ── Send desktop notification via SSE ─────────────────────────
async function sendDesktopNotification(email) {
  if (sseClients.length === 0) {
    console.log("[Desktop] ⚠ No connected clients for desktop notification");

    await NotificationLog.create({
      emailId: email._id,
      channel: "desktop",
      status: "FAILED",
      recipient: "browser",
      message: email.subject,
      error: "No connected clients",
      date: new Date(),
    });

    return { success: false, error: "No connected clients" };
  }

  const payload = {
    type: "email-notification",
    title: `📧 ${email.aiCategory || "Email"}: ${email.subject || "New Email"}`,
    body: `From: ${email.from || "Unknown"}\n${(email.body || "").substring(0, 100)}`,
    category: email.aiCategory || "Unclassified",
    confidence: email.aiConfidence || 0,
    emailId: email._id,
    timestamp: new Date().toISOString(),
  };

  const data = `data: ${JSON.stringify(payload)}\n\n`;

  let sentCount = 0;
  sseClients.forEach((client) => {
    try {
      client.write(data);
      sentCount++;
    } catch (err) {
      console.error("[Desktop] SSE write error:", err.message);
    }
  });

  console.log(`[Desktop] ✅ Notification sent to ${sentCount} client(s)`);

  await NotificationLog.create({
    emailId: email._id,
    channel: "desktop",
    status: "SUCCESS",
    recipient: `${sentCount} browser client(s)`,
    message: email.subject,
    date: new Date(),
  });

  return { success: true, sentCount };
}

// ── Send a manual/direct desktop notification ─────────────────
async function sendDirectDesktop(messageText) {
  if (sseClients.length === 0) {
    return { success: false, error: "No connected clients" };
  }

  const payload = {
    type: "direct-notification",
    title: "🔔 Notification",
    body: messageText,
    timestamp: new Date().toISOString(),
  };

  const data = `data: ${JSON.stringify(payload)}\n\n`;

  let sentCount = 0;
  sseClients.forEach((client) => {
    try {
      client.write(data);
      sentCount++;
    } catch (err) {
      // skip failed clients
    }
  });

  await NotificationLog.create({
    channel: "desktop",
    status: sentCount > 0 ? "SUCCESS" : "FAILED",
    recipient: `${sentCount} browser client(s)`,
    message: messageText,
    date: new Date(),
  });

  return { success: sentCount > 0, sentCount };
}

// ── Get connected client count ────────────────────────────────
function getClientCount() {
  return sseClients.length;
}

module.exports = {
  addClient,
  sendDesktopNotification,
  sendDirectDesktop,
  getClientCount,
};
