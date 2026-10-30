
const express = require("express");
const router = express.Router();

const EmailRecord = require("../models/EmailRecord");
const NotificationLog = require("../models/NotificationLog");

function getEmails() {
  if (typeof EmailRecord.getEmails === "function") {
    return EmailRecord.getEmails();
  }

  if (Array.isArray(EmailRecord.records)) {
    return EmailRecord.records;
  }

  return [];
}

function getLogs() {
  return NotificationLog.getLogs();
}

function count(items, filter) {
  return items.filter(filter).length;
}

function getDayKey(value) {
  const date = new Date(value || Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

router.get("/stats", (req, res) => {
  try {
    const emails = getEmails();
    const logs = getLogs();

    const categoryBreakdown = Object.entries(
      emails.reduce((result, email) => {
        const category = email.aiCategory || "Unclassified";
        result[category] = (result[category] || 0) + 1;
        return result;
      }, {})
    )
      .map(([category, total]) => ({
        _id: category,
        count: total,
      }))
      .sort((a, b) => b.count - a.count);

    const smsSent = count(
      logs,
      (log) => log.channel === "sms" && log.status === "SUCCESS"
    );

    const smsFailed = count(
      logs,
      (log) => log.channel === "sms" && log.status === "FAILED"
    );

    const voiceSuccess = count(
      logs,
      (log) => log.channel === "voice" && log.status === "SUCCESS"
    );

    const voiceFailed = count(
      logs,
      (log) => log.channel === "voice" && log.status === "FAILED"
    );

    const voiceInProgress = count(
      logs,
      (log) =>
        log.channel === "voice" &&
        ["PENDING", "IN_PROGRESS"].includes(log.status)
    );

    const totalDelivered = smsSent + voiceSuccess;
    const totalFailed = smsFailed + voiceFailed;

    const successRate =
      totalDelivered + totalFailed > 0
        ? Math.round(
            (totalDelivered / (totalDelivered + totalFailed)) * 100
          )
        : 0;

    res.json({
      totalEmails: emails.length,
      classifiedEmails: count(
        emails,
        (email) => (email.aiCategory || "Unclassified") !== "Unclassified"
      ),
      urgentEmails: count(
        emails,
        (email) =>
          email.priority === "URGENT" ||
          email.aiCategory === "Urgent"
      ),
      importantEmails: count(
        emails,
        (email) =>
          email.priority === "IMPORTANT" ||
          email.aiCategory === "Important"
      ),
      smsSent,
      smsFailed,
      voiceCalls: voiceSuccess + voiceInProgress,
      voiceSuccess,
      voiceFailed,
      voiceInProgress,
      totalFailed,
      totalDelivered,
      successRate,
      categoryBreakdown,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({
      error: "Failed to fetch dashboard stats",
      detail: err.message,
    });
  }
});

router.get("/chart-data", (req, res) => {
  try {
    const days = Math.min(
      30,
      Math.max(1, parseInt(req.query.days, 10) || 7)
    );

    const emails = getEmails();
    const logs = getLogs();
    const dailyData = [];
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dateKey = getDayKey(date);
      const dayEmails = emails.filter(
        (email) => getDayKey(email.date || email.createdAt) === dateKey
      );
      const dayLogs = logs.filter(
        (log) => getDayKey(log.date || log.createdAt) === dateKey
      );

      dailyData.push({
        date: dateKey,
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        emails: dayEmails.length,
        urgent: count(
          dayEmails,
          (email) =>
            email.priority === "URGENT" ||
            email.aiCategory === "Urgent"
        ),
        important: count(
          dayEmails,
          (email) =>
            email.priority === "IMPORTANT" ||
            email.aiCategory === "Important"
        ),
        sms: count(
          dayLogs,
          (log) => log.channel === "sms" && log.status === "SUCCESS"
        ),
        voice: count(
          dayLogs,
          (log) =>
            log.channel === "voice" &&
            ["SUCCESS", "IN_PROGRESS"].includes(log.status)
        ),
        failed: count(dayLogs, (log) => log.status === "FAILED"),
      });
    }

    res.json({ dailyData, days });
  } catch (err) {
    console.error("Chart data error:", err.message);
    res.status(500).json({
      error: "Failed to fetch chart data",
      detail: err.message,
    });
  }
});

module.exports = router;
