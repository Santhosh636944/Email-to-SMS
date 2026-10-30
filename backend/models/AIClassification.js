// ============================================================
// AIClassification Model — models/AIClassification.js
// ============================================================

const mongoose = require("mongoose");

const aiClassificationSchema = new mongoose.Schema(
  {
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailRecord",
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Urgent", "Important", "Normal", "Promotions", "Spam"],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    rawResponse: {
      type: String,
      default: "",
    },
    model: {
      type: String,
      default: "gemini-2.0-flash",
    },
    classifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

aiClassificationSchema.index({ emailId: 1 });
aiClassificationSchema.index({ category: 1 });

module.exports = mongoose.model("AIClassification", aiClassificationSchema);
