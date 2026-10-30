// ============================================================
// EmailRecord Model — models/EmailRecord.js
// ============================================================

const mongoose = require("mongoose");

// Categories used by the AI/normalizer. Legacy values are kept so that
// previously stored documents remain readable.
const CATEGORIES = [
  "Urgent",
  "Important",
  "Normal",
  "Promotions",
  "Spam",
  "Unclassified",
  // Legacy (pre-v2.1) values
  "Personal",
  "Work",
];

const emailRecordSchema = new mongoose.Schema(
  {
    // Stable identifier from the mail server (Message-ID header) used to
    // prevent the same email from being processed twice.
    messageId: {
      type: String,
      default: null,
    },
    from: {
      type: String,
      required: true,
      default: "Unknown",
    },
    subject: {
      type: String,
      required: true,
      default: "(No Subject)",
    },
    body: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    smsSent: {
      type: Boolean,
      default: false,
    },

    // AI Classification fields
    aiCategory: {
      type: String,
      enum: CATEGORIES,
      default: "Unclassified",
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    priority: {
      type: String,
      enum: ["URGENT", "IMPORTANT", "NORMAL", "PROMOTIONS", "SPAM", "UNCLASSIFIED"],
      default: "UNCLASSIFIED",
    },
    classifiedAt: {
      type: Date,
    },

    // Voice call tracking
    voiceCall: {
      status: {
        type: String,
        enum: ["NotStarted", "Pending", "In Progress", "Success", "Failed", "Skipped"],
        default: "NotStarted",
      },
      providerCallId: { type: String, default: "" },
      attempts: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      error: { type: String, default: "" },
      attemptedAt: { type: Date },
    },

    // Notifications tracking
    notificationsSent: [
      {
        channel: {
          type: String,
          enum: ["sms", "voice", "whatsapp", "desktop"],
        },
        status: {
          type: String,
          enum: ["SUCCESS", "FAILED", "PENDING", "IN_PROGRESS", "SKIPPED"],
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for date-based queries and dashboard stats
emailRecordSchema.index({ date: -1 });
emailRecordSchema.index({ aiCategory: 1 });
emailRecordSchema.index({ priority: 1 });
emailRecordSchema.index({ createdAt: -1 });
// Unique, sparse so nulls (emails without a Message-ID) don't collide.
emailRecordSchema.index(
  { messageId: 1 },
  { unique: true, partialFilterExpression: { messageId: { $type: "string" } } }
);

module.exports = mongoose.model("EmailRecord", emailRecordSchema);
module.exports.CATEGORIES = CATEGORIES;
