import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, ShieldAlert } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    smsFromNumber: '',
    smsToNumber: '',
    smsApiKey: '',
    filterKeywords: []
  });
  
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/settings`);
        setSettings(res.data);
      } catch (err) {
        console.error('Failed to load settings');
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_BASE}/settings`, settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !settings.filterKeywords.includes(keywordInput.trim().toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        filterKeywords: [...prev.filterKeywords, keywordInput.trim().toLowerCase()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw) => {
    setSettings(prev => ({
      ...prev,
      filterKeywords: prev.filterKeywords.filter(k => k !== kw)
    }));
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <h1 className="card-title">Configuration Settings</h1>
      </div>

      {message && (
        <div style={{
          padding: '1rem', marginBottom: '1.5rem', borderRadius: '0.5rem',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {message.text}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSave}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} className="text-muted" /> SMS Gateway Configuration
          </h3>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">API Key (httpSMS)</label>
              <input 
                type="password" 
                className="form-control" 
                name="smsApiKey"
                value={settings.smsApiKey || ''} 
                onChange={handleChange}
                placeholder="Enter Gateway API Key"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Default Target Number</label>
              <input 
                type="text" 
                className="form-control" 
                name="smsToNumber"
                value={settings.smsToNumber || ''} 
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '-0.5rem' }}>
             <label className="form-label">Sender Phone Number (Android Device)</label>
              <input 
                type="text" 
                className="form-control" 
                name="smsFromNumber"
                value={settings.smsFromNumber || ''} 
                onChange={handleChange}
                placeholder="+0987654321"
              />
              <small className="text-muted text-sm mt-4 d-block">
                This is the number of the Android phone running the gateway app.
              </small>
          </div>

          <hr style={{ borderColor: 'var(--panel-border)', margin: '2rem 0' }} />

          <h3 style={{ marginBottom: '1.5rem' }}>Email Filter Keywords</h3>
          <p className="text-muted text-sm mb-4">
            Only emails containing these keywords in the subject or body will trigger an SMS. 
            Leave empty to forward ALL emails.
          </p>

          <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. URGENT, ASSIGNMENT"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <button type="button" className="btn btn-primary" onClick={addKeyword}>
              Add
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
            {settings.filterKeywords && settings.filterKeywords.map(kw => (
              <span key={kw} className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
              </span>
            ))}
            {(!settings.filterKeywords || settings.filterKeywords.length === 0) && (
              <span className="text-muted text-sm italic">No filters active (All emails will be forwarded).</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
