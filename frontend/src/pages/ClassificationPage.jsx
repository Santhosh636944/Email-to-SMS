import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, RefreshCw, KeyRound, Filter, Zap, Sparkles, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { CategoryBadge, PriorityBadge } from '../components/ui/Badges';
import { EmptyState, ErrorState, SkeletonRow } from '../components/ui/States';
import { formatDateTime, truncate } from '../lib/format';

const CATEGORY_CARDS = [
  { cat: 'Urgent', desc: 'Critical, immediate action', color: '#F87171' },
  { cat: 'Important', desc: 'Needs attention soon', color: '#F59E0B' },
  { cat: 'Normal', desc: 'Routine / personal', color: '#8B5CF6' },
  { cat: 'Promotions', desc: 'Marketing & offers', color: '#22D3EE' },
  { cat: 'Spam', desc: 'Junk / unwanted', color: '#64748B' },
];

const ROUTE_LABEL = {
  Urgent: 'SMS + Voice Call',
  Important: 'SMS',
  Normal: 'Save only',
  Promotions: 'None',
  Spam: 'None',
};

const ROUTE_COLOR = { Urgent: '#F87171', Important: '#F59E0B', Normal: '#8B5CF6', Promotions: '#22D3EE', Spam: '#64748B' };

const ClassificationPage = () => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [emailsRes, statsRes, settingsRes, systemRes] = await Promise.all([
        api.get('/emails?limit=40'),
        api.get('/dashboard/stats'),
        api.get('/settings'),
        api.get('/system/status'),
      ]);
      setEmails(emailsRes.data || []);
      setStats(statsRes.data);
      setSettings(settingsRes.data);
      setAiStatus((systemRes.data.services || []).find((s) => s.key === 'ai'));
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

  const breakdown = (stats?.categoryBreakdown || []).reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain size={20} className="text-[#A78BFA]" /> AI Classification
          </h2>
          <p className="text-xs text-slate-500 mt-1">How your inbox is triaged and which notifications each category triggers</p>
        </div>
        <button onClick={fetchData} className="btn-ghost p-2.5 rounded-xl"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {/* Provider status */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className={aiStatus?.connected ? 'text-[#22C55E]' : 'text-[#F59E0B]'} />
          <span className="text-xs font-semibold text-slate-200">{aiStatus?.label}:</span>
          <span className="text-xs" style={{ color: aiStatus?.connected ? '#22C55E' : '#F59E0B' }}>{aiStatus?.detail}</span>
        </div>
        {settings && (
          <>
            <span className="hidden sm:block w-px h-5 bg-white/[0.1]" />
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <KeyRound size={14} /> {settings.aiClassificationEnabled ? 'Gemini classification enabled' : 'Classification disabled'}
            </span>
            {!aiStatus?.connected && (
              <Link to="/settings" className="text-[11px] text-[#A78BFA] hover:underline flex items-center gap-1 ml-auto">
                Configure AI key <ArrowRight size={11} />
              </Link>
            )}
          </>
        )}
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {CATEGORY_CARDS.map((c) => (
          <div key={c.cat} className="card card-hover p-4" style={{ borderTop: `2px solid ${c.color}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold" style={{ color: c.color }}>{c.cat}</span>
              <span className="text-lg font-bold text-white">{breakdown[c.cat] || 0}</span>
            </div>
            <div className="text-[10px] text-slate-500">{c.desc}</div>
            <div
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border"
              style={{ color: ROUTE_COLOR[c.cat], borderColor: `${ROUTE_COLOR[c.cat]}40`, background: `${ROUTE_COLOR[c.cat]}12` }}
            >
              <Zap size={10} /> {ROUTE_LABEL[c.cat]}
            </div>
          </div>
        ))}
      </div>

      {/* Priority rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Filter size={15} className="text-[#A78BFA]" /> Priority Rules
          </h3>
          <div className="space-y-2.5">
            {['Urgent', 'Important', 'Normal', 'Promotions', 'Spam'].map((rule) => {
              const channels = settings?.priorityRules?.[rule] || [];
              const color = ROUTE_COLOR[rule];
              return (
                <div key={rule} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{rule}</div>
                    <div className="text-[10px] text-slate-500">{channels.length ? channels.join(' + ') : 'No notification'}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-3">Rules are configurable in Settings &gt; AI Classification.</p>
        </div>

        {/* Recent classified */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Classifications</h3>
            <Link to="/emails" className="text-[11px] text-[#A78BFA] hover:underline flex items-center gap-1">
              View all emails <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div>{[0, 1, 2, 3].map((i) => <SkeletonRow key={i} cols={3} />)}</div>
          ) : error ? (
            <ErrorState description={error} onRetry={fetchData} />
          ) : emails.length === 0 ? (
            <EmptyState icon={Brain} title="No emails classified yet" description="Emails are classified automatically as they arrive." />
          ) : (
            <div className="space-y-1">
              {emails.slice(0, 12).map((e) => (
                <div key={e._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 truncate">{e.subject}</div>
                    <div className="text-[10px] text-slate-500 truncate">{truncate(e.from, 60)}</div>
                  </div>
                  <CategoryBadge category={e.aiCategory} />
                  <PriorityBadge priority={e.priority} />
                  <span className="text-[10px] text-slate-600 hidden sm:block">{formatDateTime(e.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassificationPage;