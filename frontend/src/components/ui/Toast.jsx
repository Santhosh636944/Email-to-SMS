import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

// Lightweight event-based toaster so any page can raise a toast without
// threading React context through the tree.
// eslint-disable-next-line react-refresh/only-export-components
export function toast(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('mailsense:toast', { detail: { message, type } }));
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: '#22C55E',
  error: '#F87171',
  warning: '#F59E0B',
  info: '#22D3EE',
};

let counter = 0;

const Toaster = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const id = ++counter;
      setItems((prev) => [...prev, { id, ...e.detail }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    };
    window.addEventListener('mailsense:toast', handler);
    return () => window.removeEventListener('mailsense:toast', handler);
  }, []);

  const dismiss = (id) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]">
      {items.map((t) => {
        const Icon = ICONS[t.type] || Info;
        const color = COLORS[t.type] || COLORS.info;
        return (
          <div
            key={t.id}
            className="card animate-slide-in-right flex items-start gap-3 p-3.5 pr-2"
            style={{ borderColor: `${color}55` }}
          >
            <Icon size={18} style={{ color }} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-xs text-slate-200 leading-relaxed">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-white p-1">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toaster;
