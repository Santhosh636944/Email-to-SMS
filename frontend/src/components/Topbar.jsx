import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, RefreshCw, Bell, User, ChevronRight, Sparkles } from 'lucide-react';
import useSystemStatus from '../lib/useSystemStatus';
import { toast } from './ui/Toast';

const TITLES = {
  '/': { title: 'Overview', crumb: ['Dashboard'] },
  '/emails': { title: 'All Emails', crumb: ['Mailbox', 'All Emails'] },
  '/important': { title: 'Important Emails', crumb: ['Mailbox', 'Important'] },
  '/notifications': { title: 'Notification Logs', crumb: ['Notifications', 'History'] },
  '/classification': { title: 'AI Classification', crumb: ['Intelligence', 'Classification'] },
  '/voice': { title: 'AI Voice Calls', crumb: ['Notifications', 'Voice Calls'] },
  '/reports': { title: 'Export Reports', crumb: ['Analytics', 'Reports'] },
  '/settings': { title: 'Settings', crumb: ['System', 'Settings'] },
};

const Topbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, refresh } = useSystemStatus(30000);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef(null);

  const meta = TITLES[location.pathname] || { title: 'MailSense AI', crumb: [] };

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/emails?search=${encodeURIComponent(query.trim())}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    window.dispatchEvent(new CustomEvent('mailsense:refresh'));
    setTimeout(() => {
      setRefreshing(false);
      toast('Data refreshed', 'success');
    }, 700);
  };

  const problems = (status?.services || []).filter((s) => !s.connected && s.state !== 'mock');

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#080B16]/80 border-b border-white/[0.06]">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden btn-ghost p-2 rounded-lg"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Title + breadcrumbs */}
        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
            {meta.crumb.map((c, i) => (
              <span key={c} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={11} />}
                <span className={i === meta.crumb.length - 1 ? 'text-slate-400' : ''}>{c}</span>
              </span>
            ))}
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">{meta.title}</h1>
        </div>

        {/* Search */}
        <form onSubmit={submitSearch} className="hidden md:flex flex-1 justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails by sender or subject…"
              className="input-field w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {/* System problems indicator */}
          <button
            onClick={() => navigate('/settings')}
            title={problems.length ? `${problems.length} service(s) need attention` : 'All systems nominal'}
            className="relative btn-ghost p-2 rounded-lg"
          >
            <Bell size={17} />
            {problems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F59E0B] text-[9px] font-bold text-black flex items-center justify-center">
                {problems.length}
              </span>
            )}
          </button>

          <button
            onClick={handleRefresh}
            className="btn-ghost p-2 rounded-lg hidden sm:flex"
            title="Refresh data"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#3B1E7A] border border-white/10 hover:brightness-110 transition"
            >
              <User size={16} className="text-white" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 card p-3 animate-fade">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[0.06]">
                  <Sparkles size={14} className="text-[#A78BFA]" />
                  <div>
                    <div className="text-xs font-semibold text-white">MailSense AI</div>
                    <div className="text-[10px] text-slate-500">Email to SMS Converter v2.1</div>
                  </div>
                </div>
                <button onClick={() => { setMenuOpen(false); navigate('/settings'); }} className="w-full text-left text-xs text-slate-300 hover:text-white py-1.5">
                  Preferences
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/notifications'); }} className="w-full text-left text-xs text-slate-300 hover:text-white py-1.5">
                  Notification logs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
