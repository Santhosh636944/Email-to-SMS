// ============================================================
// Notification Manager — services/notificationManager.js
// Central orchestrator for the TWO active channels:
//   1. SMS          (services/smsService.js)
//   2. AI Voice Call(services/voiceService.js)
//
// WhatsApp and Desktop notifications are intentionally NOT part of
// this workflow (see whatsappService.js / desktopNotificationService.js
// which are kept but obsolete).
// ============================================================

const { isMongoConnected } = require("../config/db");
const NotificationSettings = require("../models/NotificationSettings");
const EmailRecord = require("../models/EmailRecord");
const NotificationLog = require("../models/NotificationLog");
const { sendSms } = require("./smsService");
const { makeCall } = require("./voiceService");
const { getPriority, getChannelsForCategory } = require("./priorityService");

async function hasSuccessfulLog(emailId, channel) {
  if (!emailId || !isMongoConnected()) return false;

  try {
    const existing = await NotificationLog.findOne({
      emailId,
      channel,
      status: "SUCCESS",
    }).lean();
    return !!existing;
  } catch (error) {
    console.warn("[NotifMgr] Duplicate log check failed:", error.message);
    return false;
  }
}

async function countAttempts(emailId, channel) {
  if (!emailId || !isMongoConnected()) return 0;

  try {
    return await NotificationLog.countDocuments({ emailId, channel });
  } catch (error) {
    console.warn("[NotifMgr] Attempt count check failed:", error.message);
    return 0;
  }
}

async function lastAttemptAt(emailId, channel) {
  if (!emailId || !isMongoConnected()) return null;

  try {
    const last = await NotificationLog.findOne({ emailId, channel })
      .sort({ date: -1 })
      .lean();
    return last ? new Date(last.date) : null;
  } catch (error) {
    console.warn("[NotifMgr] Last-attempt check failed:", error.message);
    return null;
  }
}

// ── Dispatch notifications for a classified email ─────────────
async function dispatch(emailRecord, options = {}) {
  const settings = await NotificationSettings.getSettings();
  const category = emailRecord.aiCategory || "Unclassified";
  const priority = getPriority(category);
  const channels = getChannelsForCategory(category, settings.priorityRules);
  const force = options.force === true;

  const results = { sms: null, voice: null, skipped: null };
  const notificationsSent = [];

  console.log(
    `[NotifMgr] "${emailRecord.subject}" → ${category} (${priority}); channels=[${channels.join(", ") || "none"}]`
  );

  // ── SMS Channel ─────────────────────────────────────────────
  if (settings.smsEnabled && channels.includes("sms")) {
    try {
      const already = !force && (await hasSuccessfulLog(emailRecord._id, "sms"));
      if (already) {
        console.log("[NotifMgr] SMS already delivered for this email — skipping duplicate");
        results.sms = { success: true, duplicate: true };
        notificationsSent.push({ channel: "sms", status: "SUCCESS", sentAt: new Date() });
      } else {
        results.sms = await sendSms(emailRecord, {
          apiUrl: settings.smsConfig?.apiUrl || process.env.SMS_API_URL,
          apiKey: settings.smsConfig?.apiKey || process.env.SMS_API_KEY,
          fromPhone: settings.smsConfig?.fromPhone || process.env.SMS_FROM_PHONE,
          toPhone: settings.smsConfig?.toPhone || process.env.SMS_TO_PHONE,
        });
        notificationsSent.push({
          channel: "sms",
          status: results.sms?.success ? "SUCCESS" : (results.sms?.configured === false ? "SKIPPED" : "FAILED"),
          sentAt: new Date(),
        });
      }
    } catch (err) {
      console.error("[NotifMgr] SMS dispatch error:", err.message);
      notificationsSent.push({ channel: "sms", status: "FAILED", sentAt: new Date() });
    }
  } else if (channels.includes("sms") && !settings.smsEnabled) {
    notificationsSent.push({ channel: "sms", status: "SKIPPED", sentAt: new Date() });
    results.sms = { success: false, skipped: true, reason: "SMS channel disabled" };
  }

  // ── AI Voice Call Channel ───────────────────────────────────
  if (settings.voiceEnabled && channels.includes("voice")) {
    try {
      const retryLimit =
        settings.voiceConfig?.retryLimit ?? (parseInt(process.env.VOICE_RETRY_LIMIT) || 2);
      const cooldownSeconds =
        settings.voiceConfig?.cooldownSeconds ?? (parseInt(process.env.VOICE_COOLDOWN_SECONDS) || 300);

      const attempts = await countAttempts(emailRecord._id, "voice");
      const last = await lastAttemptAt(emailRecord._id, "voice");
      const withinCooldown =
        last && (Date.now() - last.getTime()) < cooldownSeconds * 1000;

      if (!force && (attempts >= retryLimit || withinCooldown)) {
        console.log(
          `[NotifMgr] Voice call skipped (attempts=${attempts}/${retryLimit}, cooldown=${withinCooldown})`
        );
        results.voice = { success: false, skipped: true, reason: "Retry/cooldown limit reached" };
        notificationsSent.push({ channel: "voice", status: "SKIPPED", sentAt: new Date() });
      } else {
        results.voice = await makeCall(emailRecord, {
          to: settings.voiceConfig?.toPhone || process.env.ALERT_PHONE_NUMBER,
          retryLimit,
          cooldownSeconds,
        });
        const voiceStatus = results.voice?.success
          ? "IN_PROGRESS"
          : (results.voice?.configured === false ? "SKIPPED" : "FAILED");
        notificationsSent.push({ channel: "voice", status: voiceStatus, sentAt: new Date() });

        emailRecord.voiceCall = {
          status:
            results.voice?.success
              ? (results.voice?.mock ? "Success" : "In Progress")
              : (results.voice?.configured === false ? "Skipped" : "Failed"),
          providerCallId: results.voice?.providerCallId || "",
          attempts: attempts + 1,
          error: results.voice?.error || "",
          attemptedAt: new Date(),
        };
      }
    } catch (err) {
      console.error("[NotifMgr] Voice dispatch error:", err.message);
      notificationsSent.push({ channel: "voice", status: "FAILED", sentAt: new Date() });
    }
  } else if (channels.includes("voice") && !settings.voiceEnabled) {
    notificationsSent.push({ channel: "voice", status: "SKIPPED", sentAt: new Date() });
    results.voice = { success: false, skipped: true, reason: "Voice channel disabled" };
  }

  // ── Persist results on the email record ──────────────────────
  const update = {
    priority,
    smsSent: results.sms?.success === true,
    notificationsSent,
  };
  if (emailRecord.voiceCall) update.voiceCall = emailRecord.voiceCall;

  if (isMongoConnected()) {
    try {
      await EmailRecord.findByIdAndUpdate(emailRecord._id, update);
    } catch (error) {
      console.warn("[NotifMgr] Mongo update failed; keeping in-memory state:", error.message);
      emailRecord.priority = priority;
      emailRecord.smsSent = results.sms?.success === true;
      emailRecord.notificationsSent = notificationsSent;
      if (emailRecord.voiceCall) emailRecord.voiceCall = emailRecord.voiceCall;
    }
  } else {
    emailRecord.priority = priority;
    emailRecord.smsSent = results.sms?.success === true;
    emailRecord.notificationsSent = notificationsSent;
    if (emailRecord.voiceCall) emailRecord.voiceCall = emailRecord.voiceCall;
  }

  console.log(`[NotifMgr] ✅ Dispatch complete for: "${emailRecord.subject}"`);
  return results;
}

// ── Dispatch for a batch of emails ────────────────────────────
async function dispatchBatch(emailRecords) {
  const allResults = [];
  for (const email of emailRecords) {
    const result = await dispatch(email);
    allResults.push({ emailId: email._id, ...result });
  }
  return allResults;
}

module.exports = {
  dispatch,
  dispatchBatch,
};
