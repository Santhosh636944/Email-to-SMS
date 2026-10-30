// ============================================================
// System Status Service — services/systemStatusService.js
// Aggregates the health of every integration without ever exposing
// credentials. Used by GET /api/system/status.
// ============================================================

const mongoose = require("mongoose");
const { getSmsStatus } = require("./smsService");
const { getVoiceStatus } = require("./voiceService");
const { isAIReady } = require("./aiService");
const { getImapState } = require("./emailService");

const READY_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function mongoStatus() {
  const state = mongoose.connection.readyState;
  return {
    key: "mongodb",
    label: "MongoDB",
    state: READY_STATES[state] || "unknown",
    connected: state === 1,
    detail: state === 1 ? mongoose.connection.host || "localhost" : "Database not connected",
  };
}

function imapStatus() {
  const configured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  const imap = getImapState();
  let state = "unknown";
  if (!configured) state = "unconfigured";
  else if (imap.lastError) state = "disconnected";
  else if (imap.lastSuccessAt) state = "connected";
  else state = "unknown";

  return {
    key: "imap",
    label: "Gmail / IMAP",
    state,
    connected: state === "connected",
    detail: imap.lastError || (configured ? (process.env.IMAP_HOST || "imap.gmail.com") : "Credentials not set"),
    lastCheckAt: imap.lastCheckAt,
    lastSuccessAt: imap.lastSuccessAt,
    consecutiveFailures: imap.consecutiveFailures,
  };
}

function smsStatus() {
  const s = getSmsStatus();
  return {
    key: "sms",
    label: "SMS Gateway",
    state: s.mock ? "mock" : (s.configured ? "connected" : "unconfigured"),
    connected: s.configured,
    detail: s.mock ? "Mock mode active (no real SMS)" : (s.configured ? "httpSMS" : "Not configured"),
  };
}

function aiStatus() {
  const ready = isAIReady();
  const hasKey = !!process.env.GEMINI_API_KEY;
  return {
    key: "ai",
    label: "AI Classification",
    state: ready ? "connected" : (hasKey ? "unknown" : "fallback"),
    connected: ready,
    detail: ready ? "Gemini active" : (hasKey ? "Gemini key present, not initialised" : "Using keyword fallback"),
  };
}

function voiceStatus() {
  const v = getVoiceStatus();
  return {
    key: "voice",
    label: "Voice Call Provider",
    state: v.mock ? "mock" : (v.configured ? "connected" : "unconfigured"),
    connected: v.configured,
    detail: v.mock
      ? "Mock mode active (no real calls)"
      : (v.configured ? `Twilio • ${v.recipient}` : `Not configured (${v.missingVars.join(", ")})`),
    missingVars: v.missingVars,
  };
}

function getSystemStatus() {
  return {
    services: [imapStatus(), mongoStatus(), smsStatus(), aiStatus(), voiceStatus()],
    mockMode:
      String(process.env.NOTIFICATION_MOCK_MODE || "").toLowerCase() === "true" ||
      String(process.env.MOCK_MODE || "").toLowerCase() === "true",
    time: new Date().toISOString(),
  };
}

module.exports = { getSystemStatus };
