import React, { useCallback, useEffect, useState } from 'react';
import { Bell, MessageSquare, PhoneCall, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge } from '../components/ui/Badges';
import { SkeletonRow, EmptyState, ErrorState } from '../components/ui/States';
import { toast } from '../components/ui/Toast';
import { formatDateTime, truncate } from '../lib/format';

const CHANNELS = [
  { v: 'all', l: 'All' },
  { v: 'sms', l: 'SMS' },
  { v: 'voice', l: 'AI Voice' },
];
const STATUSES = [
  { v: '', l: 'All' },
  { v: 'SUCCESS', l: 'Success' },
  { v: 'PENDING', l: 'Pending' },
  { v: 'IN_PROGRESS', l: 'In Progress' },
  { v: 'FAILED', l: 'Failed' },
  { v: 'SKIPPED', l: 'Skipped' },
];

const NotificationsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 15 });
      if (channel !== 'all') params.append('channel', channel);
      if (status) params.append('status', status);
      const res = await api.get(`/logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channel, status, page]);

  useEffect(() => {
    fetchLogs();
    const onRefresh = () => fetchLogs();
    window.addEventListener('mailsense:refresh', onRefresh);
    return () => window.removeEventListener('mailsense:refresh', onRefresh);
  }, [fetchLogs]);

  const testSms = async () => {
    try {
      const res = await api.post('/sms/send', { message: 'Manual SMS test from MailSense AI' });
      toast(res.data?.mock ? 'SMS simulated (mock mode — no real message sent)' : 'SMS dispatch triggered', res.data?.mock ? 'warning' : 'success');
      fetchLogs();
    } catch (err) {
      toast(`SMS failed: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const testVoice = async () => {
    try {
      const res = await api.post('/voice/test', { message: 'This is a test voice call from MailSense AI.' });
      toast(res.data?.mock ? 'Voice call simulated (mock mode — no real call placed)' : 'Voice call initiated', res.data?.mock ? 'warning' : 'success');
      fetchLogs();
    } catch (err) {
      toast(`Voice call failed: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const ChannelIcon = ({ channel }) =>
    channel === 'voice'
      ? <PhoneCall size={14} className="text-[#22D3EE]" />
      : <MessageSquare size={14} className="text-[#22C55E]" />;

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} className="text-[#A78BFA]" /> Notification Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">Audit trail for SMS and AI voice call notifications · {total} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={testSms} className="btn-ghost px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <MessageSquare size={14} className="text-[#22C55E]" /> Test SMS
          </button>
          <button onClick={testVoice} className="btn-ghost px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <PhoneCall size={14} className="text-[#22D3EE]" /> Test Voice Call
          </button>
          <button onClick={fetchLogs} className="btn-ghost p-2.5 rounded-xl"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Channel</span>
          {CHANNELS.map((c) => (
            <button
              key={c.v}
              onClick={() => { setChannel(c.v); if (c.v !== 'all') setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition border ${
                channel === c.v
                  ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {c.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
          {STATUSES.map((s) => (
            <button
              key={s.v || 'all'}
              onClick={() => { setStatus(s.v); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                status === s.v
                  ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={5} />)}
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={fetchLogs} />
        ) : logs.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications recorded" description="SMS and voice call activity will appear here once emails are processed or tests are run." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Email / Message</th>
                  <th className="px-4 py-3">Error / Provider ID</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/[0.025] transition">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-bold uppercase text-slate-200">
                        <ChannelIcon channel={log.channel} />
                        {log.channel === 'voice' ? 'AI Voice' : 'SMS'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{log.recipient || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[220px] truncate" title={log.message}>
                      {log.message ? truncate(log.message, 60) : truncate(log.emailId?.subject || '—', 60)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={log.error || log.providerId}>
                      {log.error ? <span className="text-[#F87171]">{truncate(log.error, 60)}</span> : (log.providerId ? <code className="text-[#22D3EE] text-[10px]">{truncate(log.providerId, 34)}</code> : '—')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-right whitespace-nowrap">{formatDateTime(log.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06] text-xs text-slate-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1.5 rounded-lg disabled:opacity-40 flex items-center gap-1">
                <ChevronLeft size={13} /> Prev
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1.5 rounded-lg disabled:opacity-40 flex items-center gap-1">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;