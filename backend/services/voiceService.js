
require("dotenv").config();

const axios = require("axios");
const NotificationLog = require("../models/NotificationLog");
const { buildVoiceSummary } = require("./priorityService");

function envFlag(name) {
  return String(process.env[name] || "").toLowerCase() === "true";
}

function isMockMode() {
  return (
    envFlag("VOICE_MOCK_MODE") ||
    envFlag("NOTIFICATION_MOCK_MODE") ||
    envFlag("MOCK_MODE")
  );
}

function normalizePhone(phone) {
  const value = String(phone || "").trim().replace(/[\s()-]/g, "");

  if (!value) return "";
  if (value.startsWith("+")) return value;

  // Assume an Indian number if no country code is supplied.
  return `+91${value}`;
}

function maskPhone(phone) {
  const value = String(phone || "");
  return value.length >= 7
    ? `${value.slice(0, 3)}****${value.slice(-3)}`
    : "****";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getVoiceStatus() {
  const missingVars = [];

  for (const key of [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "ALERT_PHONE_NUMBER",
  ]) {
    if (!process.env[key]) missingVars.push(key);
  }

  return {
    provider: "twilio",
    configured: missingVars.length === 0,
    mock: isMockMode(),
    recipient: maskPhone(
      normalizePhone(process.env.ALERT_PHONE_NUMBER)
    ),
    missingVars,
  };
}

// Supports both the in-memory model and the previous create() interface.
async function safeLog(data) {
  try {
    if (typeof NotificationLog.createLog === "function") {
      return NotificationLog.createLog(data);
    }

    if (typeof NotificationLog.create === "function") {
      return await NotificationLog.create(data);
    }

    console.warn("[Voice] Notification logging is unavailable.");
  } catch (error) {
    console.error("[Voice] Log error:", error.message);
  }

  return null;
}

async function makeCall(email, options = {}) {
  const config = getVoiceStatus();

  const to = normalizePhone(
    options.to || process.env.ALERT_PHONE_NUMBER
  );

  const summary =
    options.summary ||
    (email
      ? buildVoiceSummary(email)
      : "You have a new email alert.");

  const logData = {
    emailId: email?._id || null,
    channel: "voice",
    recipient: to,
    message: email?.subject || summary.slice(0, 80),
    attempts: 1,
  };

  if (!to) {
    const error = "Missing recipient phone number.";

    await safeLog({
      ...logData,
      status: "FAILED",
      error,
    });

    return { success: false, error };
  }

  if (!config.configured && !config.mock) {
    const error =
      `Twilio configuration missing: ${config.missingVars.join(", ")}`;

    console.error("[Voice]", error);

    await safeLog({
      ...logData,
      status: "FAILED",
      error,
    });

    return {
      success: false,
      configured: false,
      error,
    };
  }

  // Explicitly simulate calls only when mock mode is enabled.
  if (config.mock) {
    const mockId = `MOCK-${Date.now()}`;

    console.log(
      `[Voice] MOCK MODE: no real call placed to ${maskPhone(to)}`
    );

    await safeLog({
      ...logData,
      status: "SKIPPED",
      providerId: mockId,
      attempts: 0,
      error: "Mock mode enabled; no real call was placed.",
      meta: { mock: true },
    });

    return {
      success: true,
      mock: true,
      providerCallId: mockId,
      status: "mock",
    };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID.trim();
  const token = process.env.TWILIO_AUTH_TOKEN.trim();
  const from = normalizePhone(process.env.TWILIO_PHONE_NUMBER);

  if (!from) {
    return {
      success: false,
      error: "Invalid TWILIO_PHONE_NUMBER.",
    };
  }

  // TwiML tells Twilio what to say when the recipient answers.
  const twiml =
    `<Response>` +
    `<Say>${escapeXml(summary)}</Say>` +
    `<Say>Goodbye.</Say>` +
    `</Response>`;

  const url =
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;

  const body = new URLSearchParams({
    To: to,
    From: from,
    Twiml: twiml,
  }).toString();

  try {
    console.log(
      `[Voice] Placing call to ${maskPhone(to)}`
    );

    const response = await axios.post(url, body, {
      auth: {
        username: sid,
        password: token,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 20000,
    });

    const callId = response.data?.sid || "";
    const callStatus = response.data?.status || "queued";

    console.log(
      `[Voice] Twilio accepted call request. Status: ${callStatus}`
    );

    await safeLog({
      ...logData,
      status: "IN_PROGRESS",
      providerId: callId,
      meta: {
        providerStatus: callStatus,
        summary,
      },
    });

    return {
      success: true,
      mock: false,
      providerCallId: callId,
      status: callStatus,
      summary,
    };
  } catch (error) {
    const responseData = error.response?.data;
    const errorMessage =
      responseData?.message ||
      error.message ||
      "Unknown Twilio error";

    const errorCode = responseData?.code || null;

    console.error("[Voice] Call request failed:", {
      message: errorMessage,
      code: errorCode,
      httpStatus: error.response?.status,
    });

    await safeLog({
      ...logData,
      status: "FAILED",
      error: errorCode
        ? `${errorMessage} (Twilio code: ${errorCode})`
        : errorMessage,
      meta: {
        errorCode,
        httpStatus: error.response?.status || null,
      },
    });

    return {
      success: false,
      configured: true,
      error: errorMessage,
      errorCode,
    };
  }
}

async function fetchCallStatus(providerCallId) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (
    !sid ||
    !token ||
    !providerCallId ||
    String(providerCallId).startsWith("MOCK-")
  ) {
    return null;
  }

  const url =
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${providerCallId}.json`;

  try {
    const response = await axios.get(url, {
      auth: {
        username: sid,
        password: token,
      },
      timeout: 15000,
    });

    const call = response.data;

    return {
      status: call.status,
      duration: Number.parseInt(call.duration, 10) || 0,
      errorCode: call.error_code || null,
      errorMessage: call.error_message || null,
    };
  } catch (error) {
    console.error(
      "[Voice] Status fetch failed:",
      error.response?.data?.message || error.message
    );

    return null;
  }
}
module.exports = {
  makeCall,
  getVoiceStatus,
  fetchCallStatus,
  isMockMode,
};
