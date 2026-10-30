// Email API service — talks to the existing backend endpoint GET /api/emails.
// The backend answers with a plain JSON array of email documents, but the
// payload is normalised here so the UI keeps working if the response is
// wrapped (e.g. { emails: [] } / { data: [] } / { items: [] }).

import api from './api';

export const EMAILS_ENDPOINT = '/emails';

const LIST_KEYS = ['emails', 'data', 'items', 'results', 'records'];

export const CHANNEL_LABELS = {
  sms: 'SMS',
  voice: 'Voice',
  whatsapp: 'WhatsApp',
  desktop: 'Desktop',
};

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

// Accepts every list container the endpoint may use and returns a plain array.
export function normalizeEmailList(payload) {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];

  for (const key of LIST_KEYS) {
    if (Array.isArray(payload[key])) return payload[key].filter(isObject);
  }

  for (const key of LIST_KEYS) {
    if (isObject(payload[key])) {
      const nested = normalizeEmailList(payload[key]);
      if (nested.length) return nested;
    }
  }

  return [];
}

// Stable identity for an email record (falls back to content when no id exists).
export function emailKey(email, index = 0) {
  if (!isObject(email)) return `email-${index}`;
  return String(
    email._id || email.id || email.messageId || `${email.subject || ''}|${email.date || email.receivedAt || ''}|${index}`
  );
}

// Removes repeated records so a record is never listed twice.
export function dedupeEmails(list) {
  const seen = new Set();
  const result = [];
  (Array.isArray(list) ? list : []).forEach((email, index) => {
    const key = emailKey(email, index);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(email);
  });
  return result;
}

export function sortByDateDesc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const toTime = (item) => {
      const raw = item?.date || item?.receivedAt || item?.createdAt;
      const value = new Date(raw || 0).getTime();
      return Number.isNaN(value) ? 0 : value;
    };
    return toTime(b) - toTime(a);
  });
}

export function normalizeStatus(status) {
  if (!status) return '';
  return String(status).trim().toUpperCase().replace(/\s+/g, '_');
}

// Notification state attached to an email record (SMS / voice / other channels).
export function getEmailNotificationStatuses(email) {
  const result = [];
  const seen = new Set();

  const push = (channel, status) => {
    if (!channel || seen.has(channel)) return;
    seen.add(channel);
    result.push({ channel, status: normalizeStatus(status) });
  };

  const sent = Array.isArray(email?.notificationsSent) ? email.notificationsSent : [];
  sent.forEach((entry) => push(entry?.channel, entry?.status));

  const voiceStatus = email?.voiceCall?.status;
  if (voiceStatus && voiceStatus !== 'NotStarted') push('voice', voiceStatus);

  if (email?.smsSent && !seen.has('sms')) push('sms', 'SUCCESS');

  return result;
}

// Fetches emails from the existing backend endpoint.
export async function fetchEmails({ limit = 100, params } = {}) {
  const response = await api.get(EMAILS_ENDPOINT, {
    params: { limit, ...(params || {}) },
  });
  return sortByDateDesc(dedupeEmails(normalizeEmailList(response?.data)));
}

export default {
  EMAILS_ENDPOINT,
  CHANNEL_LABELS,
  normalizeEmailList,
  normalizeStatus,
  emailKey,
  dedupeEmails,
  sortByDateDesc,
  getEmailNotificationStatuses,
  fetchEmails,
};
