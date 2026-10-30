import React from 'react';
import { Loader2, Inbox, AlertTriangle } from 'lucide-react';

export const Spinner = ({ size = 18, className = '' }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} />
);

export const SkeletonRow = ({ cols = 4 }) => (
  <div className="flex items-center gap-4 p-4">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="skeleton h-4" style={{ width: i === 0 ? '40%' : '18%' }} />
    ))}
  </div>
);

export const SkeletonCard = ({ height = 96 }) => (
  <div className="card p-5">
    <div className="skeleton h-3 w-24 mb-4" />
    <div className="skeleton" style={{ height }} />
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.25)]">
      <Icon size={24} className="text-[#A78BFA]" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]">
      <AlertTriangle size={24} className="text-[#F87171]" />
    </div>
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    {onRetry && (
      <button onClick={onRetry} className="btn-ghost mt-4 px-4 py-2 rounded-xl text-xs font-semibold">
        Try again
      </button>
    )}
  </div>
);
