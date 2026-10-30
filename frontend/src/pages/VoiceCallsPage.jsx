import React, { useCallback, useEffect, useState } from 'react';
import { PhoneCall, RefreshCw, PhoneOff, CheckCircle2, AlertTriangle, Info, PlayCircle } from 'lucide-react';
import api from '../lib/api';
import StatCard from '../components/StatCard';
import { StatusBadge } from '../components/ui/Badges';
import { SkeletonRow, EmptyState, ErrorState } from '../components/ui/States';
import { toast } from '../components/ui/Toast';
import { formatDateTime, truncate } from '../lib/format';

const VoiceWaves = () => (
  <div className="flex items-end justify-center gap-1.5 h-16" aria-hidden="true">
    {Array.from({ length: 24 }).map((_, i) => (
      <span
        key={i}
        className="wave-bar"
        style={{ height: `${14 + ((i * 13) % 34)}px`, animationDelay: `${(i % 8) * 0.08}s`, opacity: 0.5 + (Math.sin(i) + 1) / 2 / 2 }}
      />
    ))}
  </div>
);

const VoiceCallsPage = () => {
  const [calls, setCalls] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calling, setCalling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [callsRes, statusRes, statsRes] = await Promise.all([
        api.get('/voice/calls?limit=50'),
        api.get('/voice/status'),
        api.get('/dashboard/stats'),
      ]);
      setCalls(callsRes.data.calls || []);
      setVoiceStatus(statusRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const onRefresh = () => fetchData();
    window.addEventListener('mailsense:refresh', onRefresh);
    return () => window.removeEventListener('mailsense:refresh', onRefresh);
  }, [fetchData]);

  const testCall = async () => {
    setCalling(true);
    try {
      const res = await api.post('/voice/test', { message: 'This is a test voice call from MailSense AI.' });
      if (res.data?.mock) toast('Voice call simulated — no real call placed (mock mode)', 'warning');
      else toast(`Voice call initiated (ref ${res.data.providerCallId})`, 'success');
      fetchData();
    } catch (err) {
      toast(`Voice call failed: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setCalling(false);
    }
  };

  const unconfigured = voiceStatus && !voiceStatus.configured && !voiceStatus.mock;

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PhoneCall size={20} className="text-[#22D3EE]" /> AI Voice Calls
          </h2>
          <p className="text-xs text-slate-500 mt-1">Text-to-speech phone alerts for urgent emails · provider: Twilio Voice</p>
        </div>
        <button onClick={testCall} disabled={calling} className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50">
          <PlayCircle size={15} className={calling ? 'animate-pulse' : ''} /> {calling ? 'Calling…' : 'Place Test Call'}
        </button>
      </div>

      {/* Config warning */}
      {unconfigured && (
        <div className="card p-4 flex items-start gap-3 border-[#F59E0B]/30">
          <AlertTriangle size={18} className="text-[#F59E0B] mt-0.5 shrink-0" />
          <div className="text-xs text-slate-300">
            <div className="font-semibold text-[#F59E0B] mb-0.5">Voice provider is not configured</div>
            Add <code className="text-[#F59E0B]">TWILIO_ACCOUNT_SID</code>,{' '}
            <code className="text-[#F59E0B]">TWILIO_AUTH_TOKEN</code>,{' '}
            <code className="text-[#F59E0B]">TWILIO_PHONE_NUMBER</code> and{' '}
            <code className="text-[#F59E0B]">ALERT_PHONE_NUMBER</code> to <code>backend/.env</code> to enable real calls.
          </div>
        </div>
      )}
      {voiceStatus?.mock && (
        <div className="card p-4 flex items-center gap-3 border-[#22D3EE]/30">
          <Info size={18} className="text-[#22D3EE] shrink-0" />
          <span className="text-xs text-slate-300">Mock mode active — calls are simulated and no real phone will ring.</span>
        </div>
      )}

      {/* Provider hero */}
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-[#22D3EE]/10 blur-3xl pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/30 to-[#22D3EE]/15 border border-[#8B5CF6]/30 flex items-center justify-center">
                <PhoneCall size={22} className="text-[#22D3EE]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">AI Voice Assistant</div>
                <div className="text-[11px] text-slate-500">Polly.Joanna · concise summaries</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Reads sender, subject and key action aloud
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" /> Retries &amp; cooldown via settings
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Only Urgent emails trigger calls
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 order-1 lg:order-2">
            <VoiceWaves />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={stats?.voiceCalls ?? calls.length} icon={<PhoneCall size={19} />} accent="#22D3EE" subtitle="Initiated" />
        <StatCard title="Successful" value={stats?.voiceSuccess ?? 0} icon={<CheckCircle2 size={19} />} accent="#22C55E" subtitle="Connected / delivered" />
        <StatCard title="Failed" value={stats?.voiceFailed ?? 0} icon={<PhoneOff size={19} />} accent="#F87171" subtitle="Busy, no-answer, errors" />
        <StatCard title="In Progress" value={stats?.voiceInProgress ?? 0} icon={<RefreshCw size={19} />} accent="#F59E0B" subtitle="Pending provider status" />
      </div>

      {/* History */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Call History</h3>
          <button onClick={fetchData} className="btn-ghost p-2 rounded-lg"><RefreshCw size={14} /></button>
        </div>

        {loading ? (
          <div>{[0, 1, 2].map((i) => <SkeletonRow key={i} cols={4} />)}</div>
        ) : error ? (
          <ErrorState description={error} onRetry={fetchData} />
        ) : calls.length === 0 ? (
          <EmptyState icon={PhoneCall} title="No calls yet" description="Urgent emails trigger calls automatically. Use the test button to try one." />
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <div key={call._id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition">
                <div className="w-8 h-8 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/25 flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall size={14} className="text-[#22D3EE]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {call.emailId?.subject || call.message || 'Test call'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    From {call.emailId?.from || 'MailSense AI'} {call.emailId?.priority ? `· ${call.emailId.priority}` : ''}
                  </div>
                  {call.providerId && (
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">Ref: {call.providerId}</div>
                  )}
                  {call.error && (
                    <div className="text-[10px] text-[#F87171] mt-0.5 truncate">{truncate(call.error, 90)}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={call.status} />
                  <div className="text-[10px] text-slate-500 mt-1.5">{formatDateTime(call.date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCallsPage;