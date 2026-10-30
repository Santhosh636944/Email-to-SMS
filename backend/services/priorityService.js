
const CATEGORY_PRIORITY = {
  Urgent: "URGENT",
  Important: "IMPORTANT",
  Normal: "NORMAL",
  Promotions: "PROMOTIONS",
  Spam: "SPAM",
  Unclassified: "UNCLASSIFIED",
  Personal: "NORMAL",
  Work: "IMPORTANT",
};

const DEFAULT_RULES = {
  Urgent: ["sms", "voice"],
  Important: ["sms"],
  Normal: [],
  Promotions: [],
  Spam: [],
  Unclassified: [],
};

const PRIORITY_LABEL = {
  URGENT: "Urgent",
  IMPORTANT: "Important",
  NORMAL: "Normal",
  PROMOTIONS: "Promotions",
  SPAM: "Spam",
  UNCLASSIFIED: "Unclassified",
};

function normalizeCategory(category) {
  const value = String(category || "Unclassified")
    .trim()
    .toLowerCase();

  const categories = {
    urgent: "Urgent",
    important: "Important",
    normal: "Normal",
    promotions: "Promotions",
    spam: "Spam",
    unclassified: "Unclassified",
    personal: "Personal",
    work: "Work",
  };

  return categories[value] || "Unclassified";
}

function getPriority(category) {
  return CATEGORY_PRIORITY[normalizeCategory(category)] || "UNCLASSIFIED";
}

function getChannelsForCategory(category, priorityRules = {}) {
  const normalized = normalizeCategory(category);
  const rules = { ...DEFAULT_RULES, ...(priorityRules || {}) };

  return Array.isArray(rules[normalized])
    ? rules[normalized]
    : [];
}

function buildVoiceSummary(email) {
  const sender = String(email.from || "unknown sender")
    .replace(/<[^>]*>/g, "")
    .trim();

  const subject = email.subject || "No subject";
  const preview = String(email.body || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return (
    `You have an urgent email. From ${sender}. ` +
    `Subject: ${subject}. ${preview} Please check your inbox.`
  ).slice(0, 500);
}

module.exports = {
  CATEGORY_PRIORITY,
  DEFAULT_RULES,
  PRIORITY_LABEL,
  getPriority,
  getChannelsForCategory,
  buildVoiceSummary,
};
