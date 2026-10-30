import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  Star,
  Bell,
  Brain,
  PhoneCall,
  FileSpreadsheet,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  X,
} from 'lucide-react';
import useSystemStatus from '../lib/useSystemStatus';
import { CONNECTION_META } from '../lib/format';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/emails', icon: Mail, label: 'All Emails' },
  { to: '/important', icon: Star, label: 'Important Emails' },
  { to: '/notifications', icon: Bell, label: 'Notification Logs' },
  { to: '/classification', icon: Brain, label: 'AI Classification' },
  { to: '/voice', icon: PhoneCall, label: 'AI Voice Calls' },
  { to: '/reports', icon: FileSpreadsheet, label: 'Export Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const NavItem = ({ item, collapsed, onNavigate }) => {
  const location = useLocation();
  const isActive = item.end
    ? location.pathname === item.to
    : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        collapsed ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'
      } ${
        isActive
          ? 'text-white'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
      }`}
    >
      {isActive && (
        <span
          className="absolute inset-0 rounded-xl -z-0"
          style={{
            background: 'linear-gradient(90deg, rgba(139,92,246,0.22), rgba(139,92,246,0.02))',
            border: '1px solid rgba(139,92,246,0.35)',
          }}
        />
      )}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all ${
          isActive ? 'h-6 bg-[#A78BFA]' : 'h-0'
        }`}
      />
      <Icon
        size={19}
        className={`relative z-10 shrink-0 ${isActive ? 'text-[#A78BFA]' : ''}`}
      />
      {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
    </Link>
  );
};

const Sidebar = ({ collapsed, onToggle, mobileOpen, onCloseMobile }) => {
  const { status } = useSystemStatus(30000);
  const services = status?.services || [];
  const overall = services.length
    ? services.every((s) => s.connected) ? 'connected' : (services.some((s) => !s.connected) ? 'partial' : 'unknown')
    : 'unknown';
  const dotColor =
    overall === 'connected' ? '#22C55E' : overall === 'partial' ? '#F59E0B' : '#64748B';

  const content = (
    <aside
      className={`flex flex-col h-full bg-[#0D1120] border-r border-white/[0.06] transition-[width] duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 h-16 border-b border-white/[0.06] ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-lg shadow-[#8B5CF6]/40">
          <Sparkles size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-[15px] leading-none text-white tracking-tight">MailSense AI</div>
            <div className="text-[10px] font-medium text-[#A78BFA] tracking-wider uppercase mt-1">
              Email → SMS + Voice
            </div>
          </div>
        )}
        <button
          onClick={onCloseMobile}
          className="ml-auto lg:hidden text-slate-400 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto no-scrollbar py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
        ))}
      </nav>

      {/* Connection footer */}
      <div className={`border-t border-white/[0.06] ${collapsed ? 'p-2' : 'p-3'}`}>
        {collapsed ? (
          <div className="flex justify-center py-2" title="Connection status">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse-soft" style={{ background: dotColor }} />
          </div>
        ) : (
          <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Wifi size={14} style={{ color: dotColor }} />
              <span className="text-xs font-semibold text-slate-200 flex-1">Connection Status</span>
            </div>
            <div className="space-y-1.5">
              {services.length === 0 && <div className="text-[11px] text-slate-500">Checking services…</div>}
              {services.map((s) => {
                const meta = CONNECTION_META[s.state] || CONNECTION_META.unknown;
                return (
                  <div key={s.key} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                    <span className="text-slate-400 truncate flex-1">{s.label}</span>
                    <span className="font-medium shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          className={`hidden lg:flex items-center gap-2 mt-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] transition ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block sticky top-0 h-screen z-30">{content}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full animate-slide-in-right">{content}</div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
