// ============================================================
// Email Service — services/emailService.js
// IMAP fetching (with retry/reconnect) + MongoDB + AI + Notifications
// Channels: SMS + AI Voice Call only.
// ============================================================

require("dotenv").config();
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const EventEmitter = require("events");
const { isMongoConnected } = require("../config/db");
const EmailRecord = require("../models/EmailRecord");
const NotificationSettings = require("../models/NotificationSettings");
const { classifyEmail, isAIReady } = require("./aiService");
const { dispatch } = require("./notificationManager");
const { getPriority } = require("./priorityService");

const emailEvents = new EventEmitter();

// Runtime diagnostics surfaced through /api/system/status
const imapState = {
  lastCheckAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastFound: 0,
  consecutiveFailures: 0,
};

const TRANSIENT_CODES = new Set([
  "ETIMEDOUT",
  "ETIMEOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createMemoryEmailRecord(data = {}) {
  const record = {
    ...data,
    _id: data._id || `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    __memory: true,
  };

  record.save = async function save() {
    return record;
  };

  record.toObject = function toObject() {
    const clone = { ...record };
    delete clone.save;
    delete clone.toObject;
    return clone;
  };

  return record;
}

async function safeFindOneEmail(query = {}) {
  if (!isMongoConnected()) {
    return null;
  }

  try {
    return await EmailRecord.findOne(query).lean();
  } catch (error) {
    console.warn("[Email] Duplicate check fallback:", error.message);
    return null;
  }
}

async function safeCreateEmail(payload) {
  if (!isMongoConnected()) {
    return createMemoryEmailRecord(payload);
  }

  try {
    return await EmailRecord.create(payload);
  } catch (error) {
    if (error.code === 11000) throw error;
    console.warn("[Email] Mongo create failed; using in-memory record:", error.message);
    return createMemoryEmailRecord(payload);
  }
}

async function safeSaveEmail(record) {
  if (!record || typeof record.save !== "function") {
    return record;
  }

  if (!isMongoConnected()) {
    return record;
  }

  try {
    return await record.save();
  } catch (error) {
    console.warn("[Email] Save failed; keeping in-memory record:", error.message);
    return record;
  }
}

// ── Single IMAP connection attempt ────────────────────────────
function attemptFetchUnseen() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.IMAP_HOST || "imap.gmail.com",
      port: parseInt(process.env.IMAP_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 15000,
      keepalive: false,
    });

    const fetchedEmails = [];
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    imap.once("error", (err) => {
      console.error("[Email] IMAP error:", err.message || err);
      // Map to a helpful diagnostic
      if (TRANSIENT_CODES.has(err.code)) {
        err.diagnostic =
          `Network timeout/refusal reaching ${process.env.IMAP_HOST || "imap.gmail.com"}:${process.env.IMAP_PORT || 993}. ` +
          `Check internet access, firewall/VPN, and that IMAP is enabled for the Gmail account.`;
      }
      done(reject, err);
    });

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          imap.end();
          return done(reject, err);
        }
        imap.search(["UNSEEN"], (err, results) => {
          if (err) {
            imap.end();
            return done(reject, err);
          }
          if (!results || results.length === 0) {
            imap.end();
            return done(resolve, []);
          }

          console.log(`[Email] Found ${results.length} new email(s)`);
          const fetch = imap.fetch(results, { bodies: "", markSeen: true });

          fetch.on("message", (msg) => {
            let raw = "";
            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
                raw += chunk.toString("utf8");
              });
            });
            msg.once("end", async () => {
              try {
                const parsed = await simpleParser(raw);
                fetchedEmails.push(parsed);
              } catch (e) {
                console.error("[Email] Parse error:", e.message);
              }
            });
          });

          fetch.once("end", () => {
            imap.end();
            done(resolve, fetchedEmails);
          });
        });
      });
    });

    imap.connect();
  });
}

// ── Fetch unseen emails with automatic retry/backoff ─────────
async function fetchUnseenEmails(maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptFetchUnseen();
    } catch (err) {
      lastErr = err;
      const transient = TRANSIENT_CODES.has(err.code) || /timeout|timed out|ECONN/i.test(err.message || "");
      if (!transient || attempt === maxAttempts) break;

      const backoff = Math.min(30000, 2000 * Math.pow(2, attempt - 1));
      console.warn(
        `[Email] IMAP attempt ${attempt}/${maxAttempts} failed (${err.code || err.message}). Retrying in ${backoff}ms...`
      );
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// ── Check Emails — fetch, dedup, classify, notify, save ──────
async function checkEmails() {
  console.log("📧 Checking Emails...");
  imapState.lastCheckAt = new Date();

  try {
    const rawEmails = await fetchUnseenEmails();
    imapState.lastSuccessAt = new Date();
    imapState.consecutiveFailures = 0;
    imapState.lastError = null;

    if (rawEmails.length === 0) {
      console.log("[Email] No new emails.");
      imapState.lastFound = 0;
      return [];
    }

    const settings = await NotificationSettings.getSettings();
    const newEmailRecords = [];

    for (const parsed of rawEmails) {
      try {
        const messageId = parsed.messageId || null;

        // Duplicate prevention
        if (messageId) {
          const exists = await safeFindOneEmail({ messageId });
          if (exists) {
            console.log(`[Email] Duplicate skipped: "${parsed.subject}" (${messageId})`);
            continue;
          }
        }

        const bodyText = parsed.text
          ? parsed.text.substring(0, 500)
          : (parsed.html || "").replace(/<[^>]*>/g, " ").trim().substring(0, 500);

        const emailRecord = await safeCreateEmail({
          messageId,
          from: parsed.from?.text || "Unknown",
          subject: parsed.subject || "(No Subject)",
          body: bodyText,
          date: parsed.date || new Date(),
          receivedAt: parsed.date || new Date(),
          smsSent: false,
        });

        // AI Classification
        if (settings.aiClassificationEnabled) {
          try {
            const classification = await classifyEmail(emailRecord);
            emailRecord.aiCategory = classification.category;
            emailRecord.aiConfidence = classification.confidence;
            emailRecord.priority = getPriority(classification.category);
            emailRecord.classifiedAt = new Date();
            await safeSaveEmail(emailRecord);
          } catch (aiErr) {
            console.error("[Email] AI classification failed:", aiErr.message);
          }
        }

        // Dispatch notifications (SMS + Voice only, per priority rules)
        try {
          await dispatch(emailRecord);
        } catch (notifErr) {
          console.error("[Email] Notification dispatch failed:", notifErr.message);
        }

        newEmailRecords.push(emailRecord);
      } catch (perEmailErr) {
        // Duplicate key (race) or malformed email — never crash the loop
        if (perEmailErr.code === 11000) {
          console.log("[Email] Duplicate skipped (unique index)");
        } else {
          console.error("[Email] Failed to process one email:", perEmailErr.message);
        }
      }
    }

    console.log(`✅ Processed ${newEmailRecords.length} new email(s)`);
    imapState.lastFound = newEmailRecords.length;
    emailEvents.emit("new-emails", newEmailRecords);
    return newEmailRecords;
  } catch (err) {
    imapState.consecutiveFailures += 1;
    imapState.lastError = err.diagnostic || err.message || String(err);
    console.error("[Email] FULL CHECK ERROR:", imapState.lastError);
    console.log("[Email] Tip: Check EMAIL_USER / EMAIL_PASSWORD and that IMAP is enabled in Gmail.");
    return [];
  }
}

// ── Reads ─────────────────────────────────────────────────────
async function getAllEmails(limit = 100) {
  if (!isMongoConnected()) {
    return [];
  }

  return await EmailRecord.find().sort({ date: -1 }).limit(limit);
}

async function getEmailById(id) {
  if (!isMongoConnected()) {
    return null;
  }

  return await EmailRecord.findById(id);
}

// ── Add a mock email (for testing) ────────────────────────────
async function addMockEmail({ from, subject, body }) {
  const settings = await NotificationSettings.getSettings();

  const emailRecord = await safeCreateEmail({
    messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    from: from || "test@gmail.com",
    subject: subject || "Test Email",
    body: body || "This is a test email body.",
    date: new Date(),
    receivedAt: new Date(),
    smsSent: false,
  });

  if (settings.aiClassificationEnabled) {
    try {
      const classification = await classifyEmail(emailRecord);
      emailRecord.aiCategory = classification.category;
      emailRecord.aiConfidence = classification.confidence;
      emailRecord.priority = getPriority(classification.category);
      emailRecord.classifiedAt = new Date();
      await safeSaveEmail(emailRecord);
    } catch (aiErr) {
      console.error("[Mock] AI classification failed:", aiErr.message);
    }
  }

  try {
    await dispatch(emailRecord);
  } catch (notifErr) {
    console.error("[Mock] Notification dispatch failed:", notifErr.message);
  }

  emailEvents.emit("new-emails", [emailRecord]);
  return emailRecord;
}

function getImapState() {
  return { ...imapState, aiReady: isAIReady() };
}

module.exports = {
  emailEvents,
  checkEmails,
  getAllEmails,
  getEmailById,
  addMockEmail,
  getImapState,
};
