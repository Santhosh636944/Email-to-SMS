/**
 * storageService.js — Local JSON Storage
 * =======================================
 * Uses node-persist to store settings, emails, and SMS logs locally
 * without needing a full database setup.
 */

const storage = require('node-persist');

const defaultSettings = {
  smsFromNumber: process.env.SMS_FROM_NUMBER || '',
  smsToNumber: process.env.SMS_TO_NUMBER || '',
  smsApiKey: process.env.SMS_API_KEY || '',
  filterKeywords: process.env.FILTER_KEYWORDS ? process.env.FILTER_KEYWORDS.split(',').map(k => k.trim().toLowerCase()) : ['urgent', 'alert', 'assignment']
};

async function initStorage() {
  await storage.init({
    dir: './db',
    stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8',
    logging: false,  // can also be custom logging function
    ttl: false // ttl* [NEW], can be true for 24h default or a number in MILLISECONDS or a valid Javascript Date object
  });

  // Initialize arrays if they don't exist
  if (!await storage.getItem('emails')) await storage.setItem('emails', []);
  if (!await storage.getItem('logs')) await storage.setItem('logs', []);
  
  // Load settings (merge with default if empty)
  const currentSettings = await storage.getItem('settings');
  if (!currentSettings) {
    await storage.setItem('settings', defaultSettings);
  } else {
    // Merge new defaults if missing
    await storage.setItem('settings', { ...defaultSettings, ...currentSettings });
  }
}

// Settings methods
async function getSettings() {
  return await storage.getItem('settings') || defaultSettings;
}

async function updateSettings(newSettings) {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  await storage.setItem('settings', updatedSettings);
  return updatedSettings;
}

// Emails methods
async function saveEmail(emailData) {
  const emails = await storage.getItem('emails') || [];
  // Keep only the last 100 emails
  emails.unshift(emailData);
  if (emails.length > 100) emails.pop();
  await storage.setItem('emails', emails);
}

async function getEmails() {
  return await storage.getItem('emails') || [];
}

// Logs methods
async function saveLog(logData) {
  const logs = await storage.getItem('logs') || [];
  // Keep only the last 100 logs
  logs.unshift(logData);
  if (logs.length > 100) logs.pop();
  await storage.setItem('logs', logs);
}

async function getLogs() {
  return await storage.getItem('logs') || [];
}

module.exports = {
  initStorage,
  getSettings,
  updateSettings,
  saveEmail,
  getEmails,
  saveLog,
  getLogs
};
