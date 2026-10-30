
const notificationLogs = [];

function createLog(data = {}) {
  const log = {
    _id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    emailId: data.emailId || null,
    channel: data.channel || "sms",
    status: data.status || "PENDING",
    recipient: data.recipient || "",
    message: data.message || "",
    error: data.error || "",
    providerId: data.providerId || "",
    attempts: data.attempts || 1,
    meta: data.meta || {},
    date: data.date ? new Date(data.date) : new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  notificationLogs.unshift(log);
  return log;
}

function getLogs(filters = {}) {
  let result = [...notificationLogs];

  if (filters.channel) {
    result = result.filter(
      (log) => log.channel === filters.channel
    );
  }

  if (filters.status) {
    result = result.filter(
      (log) => log.status === filters.status
    );
  }

  if (filters.emailId) {
    result = result.filter(
      (log) => String(log.emailId) === String(filters.emailId)
    );
  }

  return result;
}

function updateLog(id, updates = {}) {
  const log = notificationLogs.find(
    (item) => item._id === id
  );

  if (!log) return null;

  Object.assign(log, updates, {
    updatedAt: new Date(),
  });

  return log;
}

function clearLogs() {
  notificationLogs.length = 0;
}

const NotificationLog = {
  create: createLog,
  find: getLogs,
  findByIdAndUpdate: updateLog,
  deleteMany: clearLogs,
  getLogs,
  createLog,
  updateLog,
  clearLogs,
};

module.exports = NotificationLog;
