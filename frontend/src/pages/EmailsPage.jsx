import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  MessageSquare,
  PhoneCall,
  Star,
} from 'lucide-react';
import api from '../lib/api';
import { fetchEmails as fetchEmailList } from '../lib/emailApi';
import { PriorityBadge, CategoryBadge } from '../components/ui/Badges';
import { SkeletonRow, EmptyState, ErrorState } from '../components/ui/States';
import { toast } from '../components/ui/Toast';
import { formatDateTime, truncate } from '../lib/format';

const PAGE_SIZE = 10;
const PRIORITIES = ['All', 'URGENT', 'IMPORTANT', 'NORMAL', 'PROMOTIONS', 'SPAM'];
const CATEGORIES = ['All', 'Urgent', 'Important', 'Normal', 'Promotions', 'Spam'];

const EmailsPage = ({ presetPriority }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [priority, setPriority] = useState(presetPriority || 'All');
  const [category, setCategory] = useState('All');
  const [range, setRange] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showMock, setShowMock] = useState(false);

  const [mockFrom, setMockFrom] = useState('student@university.edu');
  const [mockSubject, setMockSubject] = useState('URGENT: MCA Project Submission Deadline Extended');
  const [mockBody, setMockBody] = useState('Final project documentation and demo must be submitted by 5:00 PM tomorrow. Important updates inside.');

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchEmailList({ limit: 300 });
      setEmails(list);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const onRefresh = () => fetchEmails();
    window.addEventListener('mailsense:refresh', onRefresh);
    return () => window.removeEventListener('mailsense:refresh', onRefresh);
  }, [fetchEmails]);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges = { today: 86400000, week: 604800000, month: 2592000000 };
    return emails
      .filter((e) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          (e.subject || '').toLowerCase().includes(q) ||
          (e.from || '').toLowerCase().includes(q) ||
          (e.body || '').toLowerCase().includes(q);
        const matchesPriority = priority === 'All' || e.priority === priority;
        const matchesCategory = category === 'All' || e.aiCategory === category;
        const matchesRange =
          range === 'all' || (now - new Date(e.date).getTime()) <= ranges[range];
        return matchesSearch && matchesPriority && matchesCategory && matchesRange;
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sort === 'oldest' ? da - db : db - da;
      });
  }, [emails, search, priority, category, range, sort]);

  useEffect(() => setPage(1), [search, priority, category, range, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleMock = async (e) => {
    e.preventDefault();
    try {
      await api.post('/emails/mock', { from: mockFrom, subject: mockSubject, body: mockBody });
      setShowMock(false);
      toast('Mock email injected and processed', 'success');
      fetchEmails();
    } catch (err) {
      toast(`Failed to add mock email: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-5 animate-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail size={20} className="text-[#A78BFA]" />
            {presetPriority === 'IMPORTANT' ? 'Important Emails' : 'All Emails'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Parsed from IMAP and classified by AI · {emails.length} records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEmails} className="btn-ghost px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowMock(true)} className="btn-primary px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Plus size={15} /> Simulate Email
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchParams(e.target.value ? { search: e.target.value } : {});
            }}
            placeholder="Search by sender, subject, or body…"
            className="input-field w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <FilterGroup label="Priority" options={PRIORITIES} value={priority} onChange={setPriority} />
          {!presetPriority && <FilterGroup label="Category" options={CATEGORIES} value={category} onChange={setCategory} />}
          <FilterGroup
            label="Date"
            options={[{ v: 'all', l: 'All time' }, { v: 'today', l: 'Today' }, { v: 'week', l: '7 days' }, { v: 'month', l: '30 days' }]}
            value={range}
            onChange={setRange}
          />
          <FilterGroup
            label="Sort"
            options={[{ v: 'newest', l: 'Newest' }, { v: 'oldest', l: 'Oldest' }]}
            value={sort}
            onChange={setSort}
          />
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-white/[0.05]">
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={4} />)}
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={fetchEmails} />
        ) : pageItems.length === 0 ? (
          <EmptyState
            icon={Star}
            title={emails.length === 0 ? 'No emails received yet' : 'No emails match your filters'}
            description={
              emails.length === 0
                ? 'Incoming emails will appear here automatically once the mailbox is checked.'
                : 'Try changing the filters, or simulate an email to test the workflow.'
            }
            action={<button onClick={() => setShowMock(true)} className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold">Simulate Email</button>}
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {pageItems.map((email) => (
              <button
                key={email._id}
                onClick={() => setSelected(email)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/[0.03] transition"
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={15} className="text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100 truncate">{email.subject}</span>
                    <PriorityBadge priority={email.priority} />
                    <CategoryBadge category={email.aiCategory} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    From {truncate(email.from, 70)}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 truncate">{truncate(email.body, 110)}</div>
                </div>
                <div className="text-[10px] text-slate-500 whitespace-nowrap hidden sm:block">{formatDateTime(email.date)}</div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06] text-xs text-slate-400">
            <span>{filtered.length} results · page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
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

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-xl h-full bg-[#0D1120] border-l border-white/[0.08] overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-[#0D1120]/95 backdrop-blur border-b border-white/[0.08] p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white break-words">{selected.subject}</h3>
                <p className="text-xs text-slate-400 mt-1 break-words">{selected.from}</p>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-2 rounded-lg shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={selected.priority} />
                <CategoryBadge category={selected.aiCategory} />
                {selected.aiConfidence > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Sparkles size={11} className="text-[#F59E0B]" /> {Math.round(selected.aiConfidence * 100)}% confidence
                  </span>
                )}
                <span className="text-[11px] text-slate-500 ml-auto">{formatDateTime(selected.date)}</span>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Email Content</div>
                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selected.body || '(No body content)'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Notification Status</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NotificationTile
                    icon={<MessageSquare size={15} />}
                    label="SMS"
                    color="#22C55E"
                    status={(selected.notificationsSent || []).find((n) => n.channel === 'sms')?.status}
                  />
                  <NotificationTile
                    icon={<PhoneCall size={15} />}
                    label="AI Voice Call"
                    color="#22D3EE"
                    status={selected.voiceCall?.status}
                    detail={selected.voiceCall?.providerCallId || selected.voiceCall?.error}
                    control={selected.voiceCall?.status && selected.voiceCall.status !== 'NotStarted'}
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-600 font-mono break-all">DB ID: {selected._id}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mock modal */}
      {showMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMock(false)} />
          <form onSubmit={handleMock} className="relative card w-full max-w-lg p-6 space-y-4 border border-white/[0.1] animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#A78BFA]" /> Simulate Incoming Email
              </h3>
              <button type="button" onClick={() => setShowMock(false)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Runs the real classification and notification workflow. Use mock mode to avoid real delivery.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Sender</label>
                <input value={mockFrom} onChange={(e) => setMockFrom(e.target.value)} className="input-field w-full px-3 py-2 rounded-xl" />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subject</label>
                <input value={mockSubject} onChange={(e) => setMockSubject(e.target.value)} className="input-field w-full px-3 py-2 rounded-xl" required />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Body</label>
                <textarea rows="4" value={mockBody} onChange={(e) => setMockBody(e.target.value)} className="input-field w-full px-3 py-2 rounded-xl" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowMock(false)} className="btn-ghost px-4 py-2 rounded-xl text-xs font-semibold">Cancel</button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold">Inject Email</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const FilterGroup = ({ label, options, value, onChange }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    <div className="flex items-center gap-1 flex-wrap">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.v;
        const l = typeof opt === 'string' ? opt : opt.l;
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
              active
                ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/40'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  </div>
);

const NotificationTile = ({ icon, label, color, status, detail, control }) => (
  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
    <div className="flex items-center gap-2 mb-1.5" style={{ color }}>
      {icon}
      <span className="text-xs font-semibold text-slate-200">{label}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      {status ? (control ? status : status) : 'Not triggered'}
    </div>
    {detail && <div className="text-[10px] text-slate-600 mt-1 break-all">{detail}</div>}
  </div>
);

export default EmailsPage;
