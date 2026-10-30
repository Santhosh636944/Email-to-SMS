import React, { useCallback, useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  MessageSquare,
  PhoneCall,
  Brain,
  Mail,
  Filter,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/States';
import { CONNECTION_META } from '../lib/format';
import useSystemStatus from '../lib/useSystemStatus';

const Toggle = ({ checked, onChange, label, sub }) => (
  <button
    onClick={() => onChange(!checked)}
    className="group flex items-center justify-between w-full p-4 rounded-xl border transition text-left"
    style={{
      background: checked ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.02)',
      borderColor: checked ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.07)',
    }}
  >
    <div>
      <div className="text-xs font-bold" style={{ color: checked ? '#F8FAFC' : '#94A3B8' }}>{label}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
    <span
      className="w-10 h-5 rounded-full p-0.5 transition shrink-0"
      style={{ background: checked ? '#8B5CF6' : '#334155' }}
    >
      <span
        className={`block w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </span>
  </button>
);

const Section = ({ icon: Icon, title, desc, children, accent = '#8B5CF6' }) => (
  <div className="card p-6 space-y-5">
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
        style={{ background: `${accent}1a`, borderColor: `${accent}40`, color: accent }}
      >
        <Icon size={17} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
        {desc && <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
    </div>
    {children}
  </div>
);

const SettingsPage = () => {
  const { status } = useSystemStatus(30000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsConfig, setSmsConfig] = useState({ apiUrl: '', hasApiKey: false, fromPhone: '', toPhone: '' });
  const [smsApiKey, setSmsApiKey] = useState('');

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceConfig, setVoiceConfig] = useState({ toPhone: '', retryLimit: 2, cooldownSeconds: 300 });

  const [aiEnabled, setAiEnabled] = useState(true);
  const [priorityRules, setPriorityRules] = useState({});
  const [filterKeywords, setFilterKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');

  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('ms:refresh') !== '0');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      const s = res.data;
      setSmsEnabled(s.smsEnabled ?? true);
      setSmsConfig({
        apiUrl: s.smsConfig?.apiUrl || '',
        hasApiKey: s.smsConfig?.hasApiKey || false,
        fromPhone: s.smsConfig?.fromPhone || '',
        toPhone: s.smsConfig?.toPhone || '',
      });
      setVoiceEnabled(s.voiceEnabled ?? true);
      setVoiceConfig({
        toPhone: s.voiceConfig?.toPhone || '',
        retryLimit: s.voiceConfig?.retryLimit ?? 2,
        cooldownSeconds: s.voiceConfig?.cooldownSeconds ?? 300,
      });
      setAiEnabled(s.aiClassificationEnabled ?? true);
      setPriorityRules(s.priorityRules || {});
      setFilterKeywords(s.filterKeywords || []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    localStorage.setItem('ms:refresh', autoRefresh ? '1' : '0');
  }, [autoRefresh]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        smsEnabled,
        smsConfig: {
          apiUrl: smsConfig.apiUrl,
          fromPhone: smsConfig.fromPhone,
          toPhone: smsConfig.toPhone,
          apiKey: smsApiKey || undefined,
          hasApiKey: smsConfig.hasApiKey,
        },
        voiceEnabled,
        voiceConfig,
        aiClassificationEnabled: aiEnabled,
        priorityRules,
        filterKeywords,
      };
      await api.put('/settings', payload);
      toast('Settings saved to MongoDB', 'success');
      setSmsApiKey('');
      fetchSettings();
    } catch (err) {
      toast(`Failed to save settings: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const testSms = async () => {
    try {
      const res = await api.post('/sms/send', { message: 'Test SMS from MailSense AI settings' });
      toast(res.data?.mock ? 'SMS simulated (mock mode)' : 'SMS sent via gateway', res.data?.mock ? 'warning' : 'success');
    } catch (err) {
      toast(`SMS failed: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const testVoice = async () => {
    try {
      const res = await api.post('/voice/test', { message: 'Test voice call from MailSense AI settings' });
      toast(res.data?.mock ? 'Voice call simulated (mock mode)' : 'Voice call initiated', res.data?.mock ? 'warning' : 'success');
    } catch (err) {
      toast(`Voice call failed: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const addKeyword = () => {
    const k = keywordInput.trim().toLowerCase();
    if (k && !filterKeywords.includes(k)) setFilterKeywords((prev) => [...prev, k]);
    setKeywordInput('');
  };

  const imap = (status?.services || []).find((s) => s.key === 'imap');
  const voiceSvc = (status?.services || []).find((s) => s.key === 'voice');
  const smsSvc = (status?.services || []).find((s) => s.key === 'sms');
  const aiSvc = (status?.services || []).find((s) => s.key === 'ai');

  const connChip = (svc) => {
    const m = CONNECTION_META[svc?.state] || CONNECTION_META.unknown;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border"
        style={{ color: m.color, borderColor: `${m.color}40`, background: `${m.color}12` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} /> {m.label}
      </span>
    );
  };

  const toggleRule = (cat, channel) => {
    setPriorityRules((prev) => {
      const cur = prev[cat] || [];
      return {
        ...prev,
        [cat]: cur.includes(channel) ? cur.filter((c) => c !== channel) : [...cur, channel],
      };
    });
  };

  const NumberField = ({ label, value, onChange, min = 0, suffix }) => (
    <div>
      <label className="block text-slate-400 font-semibold text-[11px] mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field w-full px-3 py-2 rounded-xl"
        />
        {suffix && <span className="text-[11px] text-slate-500 ml-2">{suffix}</span>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-40 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon size={20} className="text-[#A78BFA]" /> Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure email monitoring, AI triage and the two notification channels: SMS + AI Voice Call.
        </p>
      </div>

      {loadError && (
        <div className="card p-4 flex items-center gap-3 border-[#F87171]/30">
          <AlertCircle size={17} className="text-[#F87171]" />
          <span className="text-xs text-slate-300">Could not load settings: {loadError}</span>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        {/* Email settings */}
        <Section icon={Mail} title="Email Monitoring" desc="Gmail IMAP — configured in backend/.env" accent="#8B5CF6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-xs font-semibold text-slate-200">Connected account</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{imap?.detail || 'Checking…'}</div>
            </div>
            {connChip(imap)}
          </div>
          <p className="text-[10px] text-slate-600">
            Credentials (<code>EMAIL_USER</code>, <code>EMAIL_PASSWORD</code>) and check interval live in <code>backend/.env</code>. Never enter them here.
          </p>
        </Section>

        {/* AI settings */}
        <Section icon={Brain} title="AI Classification" desc="Gemini, with keyword fallback" accent="#A78BFA">
          <Toggle checked={aiEnabled} onChange={setAiEnabled} label="Enable AI classification" sub={aiSvc?.detail} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Filter size={13} /> Priority rules (which channels fire)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Urgent', 'Important'].map((cat) => (
                <div key={cat} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-xs font-bold text-slate-200 mb-2">{cat}</div>
                  <div className="flex gap-2">
                    {['sms', 'voice'].map((ch) => (
                      <button
                        type="button"
                        key={ch}
                        onClick={() => toggleRule(cat, ch)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition"
                        style={
                          (priorityRules[cat] || []).includes(ch)
                            ? { background: '#8B5CF6', borderColor: '#8B5CF6', color: '#fff' }
                            : { color: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)' }
                        }
                      >
                        {ch === 'sms' ? 'SMS' : 'Voice'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              Normal, Promotions and Spam emails never trigger notifications by default.
            </p>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold text-[11px] mb-1">Filter Keywords (fallback classifier)</label>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="e.g. urgent, exam, assignment"
                className="input-field flex-1 px-3 py-2 rounded-xl"
              />
              <button type="button" onClick={addKeyword} className="btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {filterKeywords.map((k) => (
                <span key={k} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5" style={{ color: '#A78BFA', borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)' }}>
                  {k}
                  <button type="button" onClick={() => setFilterKeywords((prev) => prev.filter((x) => x !== k))} className="text-slate-500 hover:text-[#F87171]">
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* SMS settings */}
        <Section icon={MessageSquare} title="SMS Settings" desc="httpSMS gateway (unchanged)" accent="#22C55E">
          <div className="flex items-center justify-between gap-3">
            <Toggle checked={smsEnabled} onChange={setSmsEnabled} label="Enable SMS channel" sub={smsSvc?.detail} />
            <button type="button" onClick={testSms} className="btn-ghost px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0">
              Test SMS
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1">Gateway API Endpoint</label>
              <input value={smsConfig.apiUrl} onChange={(e) => setSmsConfig((p) => ({ ...p, apiUrl: e.target.value }))} placeholder="https://api.httpsms.com/v1/messages/send" className="input-field w-full px-3 py-2 rounded-xl" />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                <KeyRound size={12} /> API Key {smsConfig.hasApiKey && <span className="text-[10px] text-[#22C55E]">(configured)</span>}
              </label>
              <input type="password" value={smsApiKey} onChange={(e) => setSmsApiKey(e.target.value)} placeholder={smsConfig.hasApiKey ? 'Leave blank to keep current key' : 'Enter API key'} className="input-field w-full px-3 py-2 rounded-xl" />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1">Sender Phone (Android)</label>
              <input value={smsConfig.fromPhone} onChange={(e) => setSmsConfig((p) => ({ ...p, fromPhone: e.target.value }))} placeholder="+91…" className="input-field w-full px-3 py-2 rounded-xl" />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1">Recipient Phone</label>
              <input value={smsConfig.toPhone} onChange={(e) => setSmsConfig((p) => ({ ...p, toPhone: e.target.value }))} placeholder="+91…" className="input-field w-full px-3 py-2 rounded-xl" />
            </div>
          </div>
        </Section>

        {/* Voice settings */}
        <Section icon={PhoneCall} title="Voice Call Settings" desc="Twilio Voice for urgent emails only" accent="#22D3EE">
          <div className="flex items-center justify-between gap-3">
            <Toggle checked={voiceEnabled} onChange={setVoiceEnabled} label="Enable AI voice calls" sub={voiceSvc?.detail} />
            <button type="button" onClick={testVoice} className="btn-ghost px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0">
              Test Call
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1">Recipient Phone (ALERT_PHONE_NUMBER)</label>
              <input value={voiceConfig.toPhone} onChange={(e) => setVoiceConfig((p) => ({ ...p, toPhone: e.target.value }))} placeholder="+91…" className="input-field w-full px-3 py-2 rounded-xl" />
            </div>
            <NumberField label="Call retry limit" value={voiceConfig.retryLimit} onChange={(v) => setVoiceConfig((p) => ({ ...p, retryLimit: Math.max(0, Number(v)) }))} min={0} />
            <NumberField label="Cooldown between retries" value={voiceConfig.cooldownSeconds} onChange={(v) => setVoiceConfig((p) => ({ ...p, cooldownSeconds: Math.max(0, Number(v)) }))} min={0} suffix="sec" />
          </div>
          <p className="text-[10px] text-slate-600">
            Twilio credentials (<code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_PHONE_NUMBER</code>) live only in <code>backend/.env</code>.
          </p>
        </Section>

        {/* General */}
        <Section icon={ShieldCheck} title="General" desc="Preferences & safety" accent="#94A3B8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Toggle checked={autoRefresh} onChange={setAutoRefresh} label="Auto-refresh dashboard" sub="Updates data every few seconds" />
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-2.5">
              <RefreshCw size={16} className="text-slate-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">Theme</div>
                <div className="text-[10px] text-slate-500">Midnight (dark) — fixed</div>
              </div>
            </div>
          </div>
          {(status?.mockMode) && (
            <div className="p-3 rounded-xl border flex items-center gap-2.5" style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.06)' }}>
              <AlertCircle size={15} className="text-[#22D3EE] shrink-0" />
              <span className="text-[11px] text-slate-300">Mock mode active in backend — no real SMS or calls will be sent.</span>
            </div>
          )}
          <div className="p-3 rounded-xl border flex items-center gap-2.5" style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.05)' }}>
            <CheckCircle2 size={15} className="text-[#22C55E] shrink-0" />
            <span className="text-[11px] text-slate-300">API keys are masked and never returned to the browser.</span>
          </div>
        </Section>

        {/* Save */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Spinner size={15} /> : <Save size={15} />} {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;