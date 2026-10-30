import React from 'react';

const StatCard = ({ title, value, icon, accent = '#8B5CF6', subtitle, badge }) => {
  return (
    <div className="card card-hover p-5 relative overflow-hidden group">
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border"
          style={{ background: `${accent}1f`, borderColor: `${accent}40`, color: accent }}
        >
          {icon}
        </div>
      </div>

      <div className="relative flex items-baseline gap-2">
        <div className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</div>
        {badge && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: accent, background: `${accent}18`, borderColor: `${accent}40` }}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && <div className="relative mt-1.5 text-[11px] text-slate-500">{subtitle}</div>}
    </div>
  );
};

export default StatCard;
