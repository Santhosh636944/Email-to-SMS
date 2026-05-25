// emailService.js - FIXED with Real Gmail IMAP Connection
require("dotenv").config();
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASSWORD);
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const EventEmitter = require("events");

const emailEvents = new EventEmitter();
let emails = [];

// ── Real Gmail IMAP Connection ────────────────────────────────
function fetchUnseenEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.IMAP_HOST || "imap.gmail.com",
      port: parseInt(process.env.IMAP_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    });

    const fetchedEmails = [];

    imap.once("error", (err) => {
     console.error("[Email] FULL IMAP ERROR:", err);
      reject(err);
    });

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) { imap.end(); return reject(err); }

        // Search UNSEEN (unread) emails only
        imap.search(["UNSEEN"], (err, results) => {
          if (err) { imap.end(); return reject(err); }

          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          console.log(`[Email] Found ${results.length} new email(s)`);

          const fetch = imap.fetch(results, {
            bodies: "",
            markSeen: true, // Mark as read after fetching
          });

          fetch.on("message", (msg) => {
            let raw = "";
            msg.on("body", (stream) => {
              stream.on("data", (chunk) => { raw += chunk.toString("utf8"); });
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

          fetch.once("end", () => { imap.end(); resolve(fetchedEmails); });
        });
      });
    });

    imap.connect();
  });
}

// ── Check Emails — called every 60 seconds ────────────────────
async function checkEmails() {
  console.log("📧 Checking Emails...");

  try {
    const rawEmails = await fetchUnseenEmails();

    if (rawEmails.length === 0) {
      console.log("[Email] No new emails.");
      return [];
    }

    const newEmails = rawEmails.map((parsed) => ({
      id: Date.now() + Math.random(),
      from: parsed.from?.text || "Unknown",
      subject: parsed.subject || "(No Subject)",
      body: parsed.text
        ? parsed.text.substring(0, 300)
        : (parsed.html || "").replace(/<[^>]*>/g, " ").trim().substring(0, 300),
      smsSent: false,
      date: parsed.date?.toISOString() || new Date().toISOString(),
    }));

    // Add to store
    newEmails.forEach((email) => emails.unshift(email));

    console.log(`✅ New Email Found`);
    console.log(`New Emails: ${newEmails.length}`);

    // Emit event → triggers SMS sending
    emailEvents.emit("new-emails", newEmails);

    // Keep max 100 emails
    if (emails.length > 100) emails = emails.slice(0, 100);

    return newEmails;

  } catch (err) {
console.error("[Email] FULL CHECK ERROR:", err);
    console.log("[Email] Tip: Check EMAIL_USER and EMAIL_PASSWORD in .env");
    return [];
  }
}

function getAllEmails() { return emails; }

function addMockEmail({ from, subject, body }) {
  const email = {
    id: Date.now(),
    from: from || "test@gmail.com",
    subject: subject || "Test Email",
    body: body || "Test body",
    smsSent: false,
    date: new Date().toISOString(),
  };
  emails.unshift(email);
  emailEvents.emit("new-emails", [email]);
  return email;
}

function updateEmailSmsStatus(id, status) {
  emails = emails.map((email) => {
    if (email.id === id) email.smsSent = status;
    return email;
  });
}

module.exports = {
  emailEvents,
  checkEmails,
  getAllEmails,
  addMockEmail,
  updateEmailSmsStatus,
};
