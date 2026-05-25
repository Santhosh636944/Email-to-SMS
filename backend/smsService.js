// smsService.js - FIXED with actual httpSMS API call
require("dotenv").config();
const axios = require("axios");

let smsLogs = [];
let settings = {
  smsFromNumber: "",
  smsToNumber: "",
  filterKeywords: [],
};

// Get SMS logs
function getSmsLogs() {
  return smsLogs;
}

// Check if email matches keywords
function matchesKeyword(email) {
  const keywords = (process.env.FILTER_KEYWORDS || "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  // No keywords = send all emails
  if (keywords.length === 0) return true;

  const text = `${email.subject} ${email.body || ""}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

// Actually send SMS via httpSMS API
async function sendSms(email) {
  const apiUrl  = process.env.SMS_API_URL;
  const apiKey  = process.env.SMS_API_KEY;
  const from    = process.env.SMS_FROM_PHONE || process.env.SMS_FROM_NUMBER;
  const to      = process.env.SMS_TO_PHONE   || process.env.SMS_TO_NUMBER;

  const fromFormatted = from?.startsWith("+") ? from : `+91${from}`;
  const toFormatted   = to?.startsWith("+")   ? to   : `+91${to}`;

  const message = `Alert: ${email.subject}\nFrom: ${email.from || "Unknown"}\nPreview: ${(email.body || "").substring(0, 100)}`;

  try {
    console.log(`[SMS] Sending to ${toFormatted} for: "${email.subject}"`);

    const response = await axios.post(
      apiUrl,
      { content: message, from: fromFormatted, to: toFormatted },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 15000,
      }
    );

    console.log(`[SMS] ✅ Sent successfully!`);

    // Save real SUCCESS log
    smsLogs.unshift({
      id: Date.now(),
      status: "SUCCESS",
      to: toFormatted,
      message: email.subject,
      date: new Date().toISOString(),
    });

    return { success: true };

  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`[SMS] ❌ Failed: ${errMsg}`);

    // Save FAILED log
    smsLogs.unshift({
      id: Date.now(),
      status: "FAILED",
      to: toFormatted,
      message: email.subject,
      error: errMsg,
      date: new Date().toISOString(),
    });

    return { success: false, error: errMsg };
  }
}

// Process emails - filter by keyword then send SMS
async function processEmails(newEmails, updateCallback) {
  console.log("📨 Processing Emails...");

  for (const email of newEmails) {
    if (matchesKeyword(email)) {
      console.log(`[SMS] Keyword matched: "${email.subject}"`);
      const result = await sendSms(email);
      if (updateCallback) updateCallback(email.id, result.success);
    } else {
      console.log(`[SMS] No keyword match: "${email.subject}" - skipped`);
    }
  }
}

// Get settings
function getSettings() {
  return {
    ...settings,
    smsFromNumber: process.env.SMS_FROM_PHONE || process.env.SMS_FROM_NUMBER || "",
    smsToNumber:   process.env.SMS_TO_PHONE   || process.env.SMS_TO_NUMBER   || "",
    filterKeywords: (process.env.FILTER_KEYWORDS || "")
      .split(",").map(k => k.trim()).filter(Boolean),
  };
}

function updateFilterKeywords(words) { settings.filterKeywords = words; }
function updateSmsToNumber(number)   { settings.smsToNumber = number; }

module.exports = {
  getSmsLogs,
  processEmails,
  sendSms,
  getSettings,
  updateFilterKeywords,
  updateSmsToNumber,
};