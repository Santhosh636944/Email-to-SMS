// ============================================================
// COMPLETE WORKING server.js
// ============================================================

require("dotenv").config();

console.log("SERVER STARTING...");

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const emailService = require("./emailService");
const smsService = require("./smsService");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());

// ============================================================
// HOME ROUTE
// ============================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "🚀 Email to SMS Backend Running",
  });

});

// ============================================================
// HEALTH ROUTE
// ============================================================

app.get("/health", (req, res) => {

  res.json({
    status: "ok",
    port: PORT,
    time: new Date().toISOString(),
  });

});

// ============================================================
// GET ALL EMAILS
// ============================================================

app.get("/api/emails", (req, res) => {

  const emails = emailService.getAllEmails();

  res.json(emails);

});

// ============================================================
// CHECK EMAILS
// ============================================================

app.post("/api/emails/check", async (req, res) => {

  try {

    const newEmails =
      await emailService.checkEmails();

    res.json({
      success: true,
      newEmails,
    });

  } catch (error) {

  console.log("============== ERROR ==============");

  if (error.response) {

    console.log(error.response.data);
    console.log(error.response.status);

  } else {

    console.log(error.message);

  }

  console.log("===================================");

  res.status(500).json({
    success: false,
    message: error.message,
  });

}

});

// ============================================================
// ADD MOCK EMAIL
// ============================================================

app.post("/api/emails/mock", (req, res) => {

  const { from, subject, body } = req.body;

  if (!subject) {

    return res.status(400).json({
      success: false,
      message: "Subject Required",
    });

  }

  const email =
    emailService.addMockEmail({
      from,
      subject,
      body,
    });

  res.json({
    success: true,
    email,
  });

});

// ============================================================
// SMS LOGS
// ============================================================

app.get("/api/logs", (req, res) => {

  res.json(
    smsService.getSmsLogs()
  );

});

// ============================================================
// SEND SMS
// ============================================================

app.post("/api/sms/send", async (req, res) => {

  try {

    const { message, to } = req.body;

    const apiUrl =
      process.env.SMS_API_URL;

    const apiKey =
      process.env.SMS_API_KEY;

    const from =
      process.env.SMS_FROM_PHONE;

    const toPhone =
      to || process.env.SMS_TO_PHONE;

    // Validation
    if (
      !apiUrl ||
      !apiKey ||
      !from ||
      !toPhone
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Missing SMS configuration",
      });

    }

    // Format phone numbers
    const fromFormatted =
      from.startsWith("+")
        ? from
        : `+91${from}`;

    const toFormatted =
      toPhone.startsWith("+")
        ? toPhone
        : `+91${toPhone}`;

    const smsText =
      message ||
      "Test SMS from Email to SMS App";

    console.log(
      `Sending SMS to ${toFormatted}`
    );

    // Send API request
    const response = await axios({
  method: "post",

  url: "https://api.httpsms.com/v1/messages/send",

 headers: {
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
},

  data: {
    content: smsText,
    from: fromFormatted,
    to: toFormatted,
  },

});
console.log("SMS RESPONSE:", response.data);

    // Save log
    smsService.getSmsLogs().unshift({
      id: Date.now(),
      status: "SUCCESS",
      to: toFormatted,
      message: smsText,
      date: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "SMS Sent",
      data: response.data,
    });

  } catch (error) {

    console.log(
      "SMS ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

});

// ============================================================
// SETTINGS
// ============================================================

app.get("/api/settings", (req, res) => {

  res.json({
    smsFromNumber:
      process.env.SMS_FROM_PHONE,

    smsToNumber:
      process.env.SMS_TO_PHONE,

    smsApiKey:
      process.env.SMS_API_KEY,

    filterKeywords:
      process.env.FILTER_KEYWORDS,
  });

});

// ============================================================
// EVENT LISTENER
// ============================================================

if (emailService.emailEvents) {

  emailService.emailEvents.on(
    "new-emails",
    async (newEmails) => {

      console.log(
        "New Emails:",
        newEmails.length
      );

      await smsService.processEmails(
        newEmails,
        emailService.updateEmailSmsStatus
      );

    }
  );

} else {

  console.log(
    "⚠ emailEvents not found"
  );

}

// ============================================================
// AUTO CHECK EMAILS
// ============================================================

const intervalSeconds =
  parseInt(
    process.env.EMAIL_CHECK_INTERVAL
  ) || 60;

if (emailService.checkEmails) {

  // First check
  emailService
    .checkEmails()
    .catch((err) => {
      console.log(
        "Initial Email Check Failed:",
        err.message
      );
    });

  // Repeat checking
  setInterval(() => {

    emailService
      .checkEmails()
      .catch((err) => {
        console.log(
          "Email Check Failed:",
          err.message
        );
      });

  }, intervalSeconds * 1000);

} else {

  console.log(
    "⚠ checkEmails function not found"
  );

}

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

  console.log("================================");
  console.log("🚀 SERVER RUNNING");
  console.log(
    `🌐 http://localhost:${PORT}`
  );
  console.log("================================");

  console.log(
    `📧 EMAIL : ${
      process.env.EMAIL_USER ||
      "Not Set"
    }`
  );

  console.log(
    `📱 FROM : ${
      process.env.SMS_FROM_PHONE ||
      "Not Set"
    }`
  );

  console.log(
    `📱 TO : ${
      process.env.SMS_TO_PHONE ||
      "Not Set"
    }`
  );

});