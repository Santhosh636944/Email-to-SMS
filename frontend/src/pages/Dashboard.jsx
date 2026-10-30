import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Star,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Activity,
  ArrowRight,
  Sparkles,
  Brain,
  AlertCircle,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import StatCard from '../components/StatCard';
import { PriorityBadge, CategoryBadge, StatusBadge } from '../components/ui/Badges';
import { SkeletonCard, SkeletonRow, EmptyState, ErrorState } from '../components/ui/States';
import { toast } from '../components/ui/Toast';
import { categoryMeta, statusMeta, timeAgo, truncate, formatDateTime, CONNECTION_META } from '../lib/format';
import useSystemStatus from '../lib/useSystemStatus';
import useEmails from '../lib/useEmails';
import { getEmailNotificationStatuses, CHANNEL_LABELS } from '../lib/emailApi';

const RECENT_EMAIL_LIMIT = 6;

const dayKey = (value) => {
  const d = new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};

// Fills the email series of the activity chart from the loaded emails when the
// chart endpoint has no email data of its own.
const withEmailCounts = (dailyData, emails) => {
  if (!Array.isArray(dailyData) || !dailyData.length) return Array.isArray(dailyData) ? dailyData : [];
  const hasApiEmails = dailyData.some((day) => Number(day?.emails) > 0);
  if (hasApiEmails || !emails?.length) return dailyData;

  const counts = {};
  emails.forEach((email) => {
    const key = dayKey(email.date || email.receivedAt || email.createdAt);
    if (!counts[key]) counts[key] = { emails: 0, urgent: 0, important: 0 };
    counts[key].emails += 1;
    if (email.priority === 'URGENT' || email.aiCategory === 'Urgent') counts[key].urgent += 1;
    if (email.priority === 'IMPORTANT' || email.aiCategory === 'Important') counts[key].important += 1;
  });

  return dailyData.map((day) => {
    const found = counts[day.date];
    if (!found) return day;
    return { ...day, emails: found.emails, urgent: found.urgent, important: found.important };
  });
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-[11px]">
      <div className="text-slate-300 font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}</span>
          <span className="ml-auto text-slate-100 font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const VoiceAssistant = ({ active }) => (
  <div className="flex items-center gap-4">
    <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#8B5CF6]/25 to-[#22D3EE]/10 border border-[#8B5CF6]/30">
      <PhoneCall size={22} className="text-[#A78BFA]" />
      {active && (
        <span className="absolute inset-0 rounded-2xl border border-[#A78BFA]/40 animate-pulse-soft" />
      )}
    </div>
    <div className="flex items-end gap-[3px] h-10" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className="wave-bar"
          style={{ height: `${18 + ((i * 7) % 22)}px`, animationDelay: `${i * 0.09}s` }}
        />
      ))}
    </div>
  </div>
);

const NotificationStates = ({ email }) => {
  const states = getEmailNotificationStatuses(email);
  if (!states.length) return null;

  return (
    <div className="flex items-center gap-2.5 mt-1 flex-wrap text-[10px] text-slate-500">
      {states.map((state) => (
        <span key={state.channel} className="flex items-center gap-1">
          {state.channel === 'sms' ? (
            <MessageSquare size={10} />
          ) : state.channel === 'voice' ? (
            <PhoneCall size={10} />
          ) : (
            <Bell size={10} />
          )}
          {CHANNEL_LABELS[state.channel] || state.channel}: {statusMeta(state.status).label}
        </span>
      ))}
    </div>
  );
};

const EmailRow = ({ email }) => (
  <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
    <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
      <Mail size={14} className="text-slate-400" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs font-semibold text-slate-200 truncate">{email.subject || '(No Subject)'}</div>
      <div className="text-[11px] text-slate-500 truncate">{truncate(email.from || 'Unknown sender', 60)}</div>
      {email.body && <div className="text-[11px] text-slate-600 truncate mt-0.5">{truncate(email.body, 90)}</div>}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <PriorityBadge priority={email.priority} />
        <CategoryBadge category={email.aiCategory} />
      </div>
      <NotificationStates email={email} />
    </div>
    <div className="text-right shrink-0">
      <div className="text-[10px] text-slate-500 whitespace-nowrap">{timeAgo(email.date || email.receivedAt)}</div>
      <div className="text-[10px] text-slate-600 whitespace-nowrap">{formatDateTime(email.date || email.receivedAt)}</div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { status } = useSystemStatus(30000);
  const {
    emails,
    loading: emailsLoading,
    refreshing: emailsRefreshing,
    error: emailsError,
    reload: reloadEmails,
  } = useEmails({ limit: 100, pollMs: 15000 });

  // Stats / chart / logs are loaded independently so a failing endpoint can
  // never hide the incoming emails.
  const fetchData = useCallback(async () => {
    const [statsRes, chartRes, logsRes] = await Promise.allSettled([
      api.get('/dashboard/stats'),
      api.get('/dashboard/chart-data?days=7'),
      api.get('/logs?limit=6'),
    ]);

    if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data || null);
    if (chartRes.status === 'fulfilled') setChartData(chartRes.value?.data?.dailyData || []);
    if (logsRes.status === 'fulfilled') setRecentLogs(logsRes.value?.data?.logs || []);

    const failure = [statsRes, chartRes, logsRes].find((r) => r.status === 'rejected');
    setError(failure ? failure.reason?.message || 'Request failed' : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const onRefresh = () => fetchData();
    window.addEventListener('mailsense:refresh', onRefresh);
    const interval = setInterval(fetchData, 15000);
    return () => {
      window.removeEventListener('mailsense:refresh', onRefresh);
      clearInterval(interval);
    };
  }, [fetchData]);

  const triggerCheck = async () => {
    try {
      await api.post('/emails/check');
      toast('Inbox checked for new emails', 'success');
      await reloadEmails();
      fetchData();
    } catch (err) {
      toast(`Email check failed: ${err.message}`, 'error');
    }
  };

  // Derived email data (used for the cards and the pie chart when the
  // dashboard stats endpoint has no email counts of its own).
  const emailSummary = useMemo(() => {
    const list = emails || [];
    const byCategory = {};
    let urgent = 0;
    let important = 0;

    list.forEach((email) => {
      const category = email.aiCategory || 'Unclassified';
      byCategory[category] = (byCategory[category] || 0) + 1;
      if (email.priority === 'URGENT' || email.aiCategory === 'Urgent') urgent += 1;
      if (email.priority === 'IMPORTANT' || email.aiCategory === 'Important') important += 1;
    });

    return { total: list.length, urgent, important, byCategory };
  }, [emails]);

  const recentEmails = useMemo(() => (emails || []).slice(0, RECENT_EMAIL_LIMIT), [emails]);

  const totalEmails = stats?.totalEmails > 0 ? stats.totalEmails : emailSummary.total;
  const urgentEmails = stats?.urgentEmails > 0 ? stats.urgentEmails : emailSummary.urgent;
  const importantEmails =
    (stats?.importantEmails || 0) + (stats?.urgentEmails || 0) > 0
      ? (stats.importantEmails || 0) + (stats.urgentEmails || 0)
      : emailSummary.important + emailSummary.urgent;

  const chartSeries = useMemo(() => withEmailCounts(chartData, emails), [chartData, emails]);

  const pieData = useMemo(() => {
    const fromApi = Array.isArray(stats?.categoryBreakdown) ? stats.categoryBreakdown : [];
    if (fromApi.length) {
      return fromApi.map((item) => ({
        name: item._id,
        value: item.count,
        color: (categoryMeta(item._id) || {}).color || '#8B5CF6',
      }));
    }
    return Object.entries(emailSummary.byCategory).map(([name, value]) => ({
      name,
      value,
      color: (categoryMeta(name) || {}).color || '#8B5CF6',
    }));
  }, [stats, emailSummary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-24 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} height={40} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonCard height={230} /></div>
          <SkeletonCard height={230} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade">
      {/* Welcome header */}
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#8B5CF6]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">
              Your Inbox, Intelligently Connected
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Monitor important emails and manage your notifications in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={triggerCheck} className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <RefreshCw size={14} /> Check Emails Now
            </button>
            <Link to="/settings" className="btn-ghost px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              Configure
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 flex items-center gap-3 border-[#F87171]/30">
          <AlertCircle size={18} className="text-[#F87171]" />
          <span className="text-xs text-slate-300">Could not load dashboard data: {error}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Emails" value={totalEmails} icon={<Mail size={19} />} accent="#8B5CF6" subtitle="Processed by system" />
        <StatCard title="Important Emails" value={importantEmails} icon={<Star size={19} />} accent="#F59E0B" subtitle={`${urgentEmails} urgent`} />
        <StatCard title="SMS Sent" value={stats?.smsSent ?? 0} icon={<MessageSquare size={19} />} accent="#22C55E" subtitle="httpSMS gateway" />
        <StatCard title="AI Voice Calls" value={stats?.voiceCalls ?? 0} icon={<PhoneCall size={19} />} accent="#22D3EE" subtitle={`${stats?.voiceSuccess ?? 0} connected`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={15} className="text-[#A78BFA]" /> Email Activity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Volume and notifications over the last 7 days</p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
              7-Day View
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEmail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gVoice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="emails" name="Emails" stroke="#8B5CF6" strokeWidth={2} fill="url(#gEmail)" />
                <Area type="monotone" dataKey="sms" name="SMS" stroke="#22C55E" strokeWidth={2} fill="url(#gSms)" />
                <Area type="monotone" dataKey="voice" name="Voice" stroke="#22D3EE" strokeWidth={2} fill="url(#gVoice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
            <Brain size={15} className="text-[#A78BFA]" /> Classification
          </h3>
          <p className="text-xs text-slate-500 mb-2">Emails by AI category</p>
          <div className="h-48">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No classifications yet
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-white/[0.06]">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-slate-400 truncate">{item.name}</span>
                <span className="ml-auto text-slate-200 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice + system status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Voice Assistant</h3>
            <Link to="/voice" className="text-[11px] text-[#A78BFA] hover:underline flex items-center gap-1">
              Details <ArrowRight size={12} />
            </Link>
          </div>
          <VoiceAssistant active={(stats?.voiceCalls ?? 0) > 0} />
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div>
              <div className="text-lg font-bold text-white">{stats?.voiceCalls ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Calls</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#22C55E]">{stats?.voiceSuccess ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Connected</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#F87171]">{stats?.voiceFailed ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Failed</div>
            </div>
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">System Connection Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(status?.services || []).map((s) => {
              const m = CONNECTION_META[s.state] || CONNECTION_META.unknown;
              return (
                <div key={s.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 truncate">{s.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{s.detail}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide shrink-0" style={{ color: m.color }}>
                    {m.label}
                  </span>
                </div>
              );
            })}
            {!status && <div className="text-xs text-slate-500">Loading service status…</div>}
          </div>
          {status?.mockMode && (
            <div className="mt-3 text-[11px] text-[#22D3EE] flex items-center gap-2">
              <AlertCircle size={13} /> Mock mode is active — notifications are simulated.
            </div>
          )}
        </div>
      </div>

      {/* Recent emails + notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mail size={15} className="text-[#A78BFA]" /> Recent Emails
              {emailsRefreshing && <RefreshCw size={12} className="text-slate-500 animate-spin" />}
            </h3>
            <Link to="/emails" className="text-[11px] text-[#A78BFA] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {emailsLoading ? (
            <div className="space-y-1">
              {[0, 1, 2].map((i) => <SkeletonRow key={i} cols={2} />)}
            </div>
          ) : emailsError && recentEmails.length === 0 ? (
            <ErrorState
              title="Could not load emails"
              description={emailsError}
              onRetry={() => reloadEmails()}
            />
          ) : recentEmails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No emails received yet"
              description="Incoming emails will appear here automatically as soon as the mailbox is checked."
            />
          ) : (
            <>
              {emailsError && (
                <div className="text-[11px] text-[#F59E0B] mb-2 flex items-center gap-1.5">
                  <AlertCircle size={12} /> Could not refresh emails: {emailsError}
                </div>
              )}
              <div className="space-y-1">
                {recentEmails.map((email) => (
                  <EmailRow key={email._id || email.messageId || email.subject} email={email} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={15} className="text-[#22D3EE]" /> Recent Notification Activity
            </h3>
            <Link to="/notifications" className="text-[11px] text-[#A78BFA] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No notifications yet" description="SMS and voice call activity will show up here." />
          ) : (
            <div className="space-y-1">
              {recentLogs.map((log) => (
                <div key={log._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                    {log.channel === 'voice'
                      ? <PhoneCall size={14} className="text-[#22D3EE]" />
                      : <MessageSquare size={14} className="text-[#22C55E]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 truncate">{log.message || log.emailId?.subject || '—'}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {log.channel}{log.error ? ` · ${truncate(log.error, 40)}` : ''}
                    </div>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
