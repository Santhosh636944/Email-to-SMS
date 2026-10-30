import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Download, FileText, Table, Calendar, Filter, Eye, ScrollText } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge, CategoryBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/States';

const FORMATS = [
  { fmt: 'pdf', label: 'PDF Document', desc: 'Styled summary report ready to print or submit as project documentation', icon: FileText, color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
  { fmt: 'excel', label: 'Excel Spreadsheet', desc: 'Structured .xlsx with styled headers, column widths and status formatting', icon: Table, color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  { fmt: 'csv', label: 'CSV Data File', desc: 'Raw comma-separated data for databases, pandas or any analysis tool', icon: FileSpreadsheet, color: '#A78BFA', bg: 'rgba(139,92,246,0.18)' },
];

const ReportsPage = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [channel, setChannel] = useState('all');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (dateFrom) p.append('from', dateFrom);
      if (dateTo) p.append('to', dateTo);
      if (channel !== 'all') p.append('type', channel);
      setPreview((await api.get(`/export/preview?${p.toString()}`)).data);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, channel]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleExport = (format) => {
    const p = new URLSearchParams();
    if (dateFrom) p.append('from', dateFrom);
    if (dateTo) p.append('to', dateTo);
    if (channel !== 'all') p.append('type', channel);
    window.open(`/api/export/${format}?${p.toString()}`, '_blank');
  };

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setChannel('all'); };

  return (
    <div className="space-y-5 animate-fade">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ScrollText size={20} className="text-[#A78BFA]" /> Export Reports &amp; Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Downloadable audit reports for the two active channels — SMS &amp; AI Voice Call — with custom date filters.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Filter size={15} className="text-[#A78BFA]" /> Report Criteria
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5"><Calendar size={13} /> Start Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field w-full px-3 py-2 rounded-xl" />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5"><Calendar size={13} /> End Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field w-full px-3 py-2 rounded-xl" />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input-field w-full px-3 py-2 rounded-xl">
              <option value="all">All Channels (SMS + Voice)</option>
              <option value="sms">SMS Only (httpSMS)</option>
              <option value="voice">AI Voice Only (Twilio)</option>
            </select>
          </div>
        </div>
        {(dateFrom || dateTo || channel !== 'all') && (
          <div className="flex justify-end">
            <button onClick={clearFilters} className="text-[11px] text-[#A78BFA] hover:underline font-semibold">Clear filters</button>
          </div>
        )}
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FORMATS.map(({ fmt, label, desc, icon: Icon, color, bg }) => (
          <div key={fmt} className="card card-hover p-5 flex flex-col justify-between gap-4" style={{ borderTop: `2px solid ${color}` }}>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl border flex items-center justify-center" style={{ color, borderColor: `${color}40`, background: bg }}>
                  <Icon size={20} />
                </div>
                <span className="font-bold text-sm text-white">{label}</span>
              </div>
              <p className="text-[11px] text-slate-500">{desc}</p>
            </div>
            <button onClick={() => handleExport(fmt)} className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
              <Download size={14} /> Download {label.split(' ')[0]}
            </button>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Eye size={15} className="text-[#A78BFA]" /> Data Preview ({preview?.total || 0} records)
          </h3>
          <span className="text-[10px] text-slate-500">Showing first 20</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading report preview…</div>
        ) : !preview || preview.logs.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No records found" description="Adjust the date range or channel filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Recipient</th>
                  <th className="px-3 py-3">Subject / Message</th>
                  <th className="px-3 py-3">AI Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {preview.logs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/[0.025] transition">
                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{new Date(log.date).toLocaleString()}</td>
                    <td className="px-3 py-3 font-bold uppercase text-slate-200">{log.channel === 'voice' ? 'AI Voice' : 'SMS'}</td>
                    <td className="px-3 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-3 py-3 text-slate-300 font-mono">{log.recipient || '—'}</td>
                    <td className="px-3 py-3 text-slate-200 truncate max-w-[240px]">{log.emailId?.subject || log.message || '—'}</td>
                    <td className="px-3 py-3"><CategoryBadge category={log.emailId?.aiCategory} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;