// ============================================================
// AI Classification Service — services/aiService.js
// Uses Google Gemini API for email classification.
// Categories: Urgent | Important | Normal | Promotions | Spam
// Falls back to a keyword classifier when Gemini is unavailable.
// ============================================================

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const AIClassification = require("../models/AIClassification");

const MODEL_NAME = "gemini-2.0-flash";
const VALID_CATEGORIES = ["Urgent", "Important", "Normal", "Promotions", "Spam"];

let genAI = null;
let model = null;
let aiReady = false;

function initAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠ GEMINI_API_KEY not set — AI classification will use fallback keyword method");
    aiReady = false;
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    aiReady = true;
    console.log("🤖 Gemini AI initialized successfully");
    return true;
  } catch (err) {
    console.error("🤖 Gemini init failed:", err.message);
    aiReady = false;
    return false;
  }
}

function isAIReady() {
  return aiReady && !!model;
}

// ── Classify a single email using Gemini ──────────────────────
async function classifyEmail(emailRecord) {
  if (!isAIReady()) {
    return keywordFallback(emailRecord);
  }

  const prompt = `You are an email triage classifier. Classify the following email into EXACTLY ONE of these categories:
- Urgent (critical, requires immediate action NOW: emergencies, deadlines today, security/account alerts, payment failures, exam immediately)
- Important (meaningful matter needing attention soon: deadlines this week, results, official notices, work tasks, assignments)
- Normal (routine personal or general messages: friends, family, casual updates)
- Promotions (marketing, offers, newsletters, subscriptions)
- Spam (junk, scams, phishing, unwanted solicitations)

Respond with ONLY a JSON object in this exact format, no extra text:
{"category": "Urgent", "confidence": 0.95}

The confidence must be a number between 0.0 and 1.0.

Email Details:
From: ${emailRecord.from || "Unknown"}
Subject: ${emailRecord.subject || "(No Subject)"}
Body Preview: ${(emailRecord.body || "").substring(0, 500)}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let jsonStr = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "Important";
    const confidence = Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5));

    await AIClassification.create({
      emailId: emailRecord._id,
      category,
      confidence,
      rawResponse: responseText,
      model: MODEL_NAME,
      classifiedAt: new Date(),
    });

    console.log(`🤖 AI Classified: "${emailRecord.subject}" → ${category} (${(confidence * 100).toFixed(0)}%)`);
    return { category, confidence, provider: "gemini" };
  } catch (error) {
    console.error("🤖 AI Classification error:", error.message);
    return keywordFallback(emailRecord);
  }
}

// ── Keyword-based fallback classifier ─────────────────────────
function keywordFallback(emailRecord) {
  const text = `${emailRecord.subject || ""} ${emailRecord.body || ""}`.toLowerCase();

  const rules = [
    {
      category: "Spam",
      keywords: ["winner", "lottery", "click here", "free money", "nigerian", "viagra", "casino", "phishing"],
      confidence: 0.7,
    },
    {
      category: "Urgent",
      keywords: [
        "urgent", "critical", "emergency", "asap", "immediately", "deadline today",
        "alert", "security alert", "suspended", "account locked", "payment failed",
      ],
      confidence: 0.8,
    },
    {
      category: "Important",
      keywords: ["deadline", "exam", "result", "assignment", "invoice", "interview", "notice", "due"],
      confidence: 0.7,
    },
    {
      category: "Promotions",
      keywords: ["offer", "discount", "sale", "deal", "promo", "subscribe", "unsubscribe", "newsletter", "coupon"],
      confidence: 0.65,
    },
    {
      category: "Normal",
      keywords: ["hey", "hi there", "miss you", "birthday", "party", "dinner", "weekend", "vacation", "family"],
      confidence: 0.55,
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      console.log(`🔑 Keyword classified: "${emailRecord.subject}" → ${rule.category}`);
      return { category: rule.category, confidence: rule.confidence, provider: "keyword" };
    }
  }

  // Default: routine message
  return { category: "Normal", confidence: 0.4, provider: "keyword" };
}

// ── Batch classify ────────────────────────────────────────────
async function classifyEmails(emailRecords) {
  const results = [];
  for (const email of emailRecords) {
    const result = await classifyEmail(email);
    results.push({ emailId: email._id, ...result });
  }
  return results;
}

module.exports = {
  initAI,
  isAIReady,
  classifyEmail,
  classifyEmails,
  keywordFallback,
  VALID_CATEGORIES,
};
