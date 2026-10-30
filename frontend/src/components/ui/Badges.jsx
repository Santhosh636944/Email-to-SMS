import React from 'react';
import { priorityMeta, categoryMeta, statusMeta } from '../../lib/format';

export const PriorityBadge = ({ priority }) => {
  const m = priorityMeta(priority);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  const m = categoryMeta(category);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{
        color: m.color,
        background: `${m.color}18`,
        borderColor: `${m.color}40`,
      }}
    >
      {m.label}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const m = statusMeta(status);
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {m.label}
    </span>
  );
};
