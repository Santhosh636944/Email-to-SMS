const mongoose = require("mongoose");

const notificationSettingsSchema = new mongoose.Schema(
  {
    keywords: {
      type: [String],
      default: ["URGENT", "Assignment", "Alert", "Deadline"],
    },
    urgentKeywords: {
      type: [String],
      default: ["URGENT"],
    },
    importantKeywords: {
      type: [String],
      default: ["Assignment", "Alert", "Deadline"],
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    smsEnabled: {
      type: Boolean,
      default: true,
    },
    voiceEnabled: {
      type: Boolean,
      default: true,
    },
    voiceCallEnabled: {
      type: Boolean,
      default: true,
    },
    aiClassificationEnabled: {
      type: Boolean,
      default: true,
    },
    smsConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    voiceConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priorityRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        Urgent: ["sms", "voice"],
        Important: ["sms"],
        Normal: [],
        Promotions: [],
        Spam: [],
      },
    },
    filterKeywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

const NotificationSettings =
  mongoose.models.NotificationSettings ||
  mongoose.model("NotificationSettings", notificationSettingsSchema);

const defaultSettings = {
  keywords: ["URGENT", "Assignment", "Alert", "Deadline"],
  urgentKeywords: ["URGENT"],
  importantKeywords: ["Assignment", "Alert", "Deadline"],
  phoneNumber: process.env.ALERT_PHONE_NUMBER || "",
  smsEnabled: true,
  voiceEnabled: true,
  voiceCallEnabled: true,
  aiClassificationEnabled: true,
  smsConfig: {},
  voiceConfig: {},
  priorityRules: {
    Urgent: ["sms", "voice"],
    Important: ["sms"],
    Normal: [],
    Promotions: [],
    Spam: [],
  },
  filterKeywords: [],
};

let memorySettings = { ...defaultSettings };

function normalizeSettings(input = {}) {
  const next = { ...defaultSettings, ...memorySettings, ...input };
  next.voiceEnabled = next.voiceEnabled ?? next.voiceCallEnabled ?? true;
  next.voiceCallEnabled = next.voiceCallEnabled ?? next.voiceEnabled ?? true;
  return next;
}

function createMemorySettingsObject(input = {}) {
  const settings = normalizeSettings(input);

  settings.toObject = function toObject() {
    return { ...settings };
  };

  settings.save = async function save() {
    memorySettings = normalizeSettings(settings);
    return settings;
  };

  return settings;
}

async function getSettings() {
  if (mongoose.connection.readyState !== 1) {
    return createMemorySettingsObject(memorySettings);
  }

  try {
    let settingsDoc = await NotificationSettings.findOne().lean();
    if (!settingsDoc) {
      const created = await NotificationSettings.create(normalizeSettings(memorySettings));
      settingsDoc = created.toObject ? created.toObject() : created;
    }

    memorySettings = normalizeSettings(settingsDoc);
    return createMemorySettingsObject(memorySettings);
  } catch (error) {
    console.warn("[Settings] Using in-memory settings:", error.message);
    return createMemorySettingsObject(memorySettings);
  }
}

async function setSettings(newSettings = {}) {
  const next = normalizeSettings({ ...memorySettings, ...newSettings });
  memorySettings = next;

  if (mongoose.connection.readyState === 1) {
    try {
      const existing = await NotificationSettings.findOne();
      if (existing) {
        Object.assign(existing, next);
        await existing.save();
        memorySettings = normalizeSettings(existing.toObject ? existing.toObject() : existing);
        return createMemorySettingsObject(memorySettings);
      }

      const created = await NotificationSettings.create(next);
      memorySettings = normalizeSettings(created.toObject ? created.toObject() : created);
      return createMemorySettingsObject(memorySettings);
    } catch (error) {
      console.warn("[Settings] Mongo write failed; keeping in-memory settings:", error.message);
    }
  }

  return createMemorySettingsObject(memorySettings);
}

function updateMemorySettings(newSettings) {
  memorySettings = normalizeSettings({ ...memorySettings, ...newSettings });
  return createMemorySettingsObject(memorySettings);
}

NotificationSettings.getSettings = getSettings;
NotificationSettings.setSettings = setSettings;
NotificationSettings.updateMemorySettings = updateMemorySettings;

module.exports = NotificationSettings;
module.exports.getSettings = getSettings;
module.exports.setSettings = setSettings;
module.exports.updateMemorySettings = updateMemorySettings;