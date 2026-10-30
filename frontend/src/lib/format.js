// Shared formatting + palette helpers

export const PRIORITY_META = {
  URGENT: { label: 'Urgent', color: '#F87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.35)' },
  IMPORTANT: { label: 'Important', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.35)' },
  NORMAL: { label: 'Normal', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  PROMOTIONS: { label: 'Promotions', color: '#22D3EE', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
  SPAM: { label: 'Spam', color: '#64748B', bg: 'rgba(100,116,139,0.14)', border: 'rgba(100,116,139,0.3)' },
  UNCLASSIFIED: { label: 'Unclassified', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
};

export const CATEGORY_META = {
  Urgent: { label: 'Urgent', color: '#F87171' },
  Important: { label: 'Important', color: '#F59E0B' },
  Normal: { label: 'Normal', color: '#8B5CF6' },
  Promotions: { label: 'Promotions', color: '#22D3EE' },
  Spam: { label: 'Spam', color: '#64748B' },
  Unclassified: { label: 'Unclassified', color: '#94A3B8' },
  // legacy
  Personal: { label: 'Personal', color: '#8B5CF6' },
  Work: { label: 'Work', color: '#F59E0B' },
};

export const STATUS_META = {
  SUCCESS: { label: 'Success', color: '#22C55E', bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.35)' },
  FAILED: { label: 'Failed', color: '#F87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.35)' },
  PENDING: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.35)' },
  IN_PROGRESS: { label: 'In Progress', color: '#22D3EE', bg: 'rgba(34,211,238,0.14)', border: 'rgba(34,211,238,0.35)' },
  SKIPPED: { label: 'Skipped', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.28)' },
};

export const CONNECTION_META = {
  connected: { label: 'Connected', color: '#22C55E' },
  disconnected: { label: 'Disconnected', color: '#F87171' },
  connecting: { label: 'Connecting', color: '#F59E0B' },
  unconfigured: { label: 'Unconfigured', color: '#64748B' },
  fallback: { label: 'Fallback', color: '#F59E0B' },
  mock: { label: 'Mock', color: '#22D3EE' },
  unknown: { label: 'Unknown', color: '#94A3B8' },
};

export function priorityMeta(priority) {
  return PRIORITY_META[priority] || PRIORITY_META.UNCLASSIFIED;
}

export function categoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.Unclassified;
}

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.PENDING;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  if (!value) return '—';
  const d = new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDateTime(value);
}

export function truncate(str, n = 80) {
  if (!str) return '';
  return str.length > n ? `${str.slice(0, n)}…` : str;
}
