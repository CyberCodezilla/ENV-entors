'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'warn' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  durationMs?: number;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { ...item, id };

      setToasts((prev) => [newToast, ...prev].slice(0, 3)); // Max 3 toasts
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast viewport: bottom-left (z 50) */}
      <div
        role="region"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { message, variant = 'info', action, durationMs = 4500 } = item;

  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  const borderColors: Record<ToastVariant, string> = {
    info: 'border-flood/40 text-flood',
    success: 'border-conf-good/40 text-conf-good',
    warn: 'border-conf-moderate/40 text-conf-moderate',
    error: 'border-risk-4/40 text-risk-4',
  };

  const icons: Record<ToastVariant, React.ReactNode> = {
    info: <Info className="w-4 h-4 text-flood shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-conf-good shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-conf-moderate shrink-0" />,
    error: <XCircle className="w-4 h-4 text-risk-4 shrink-0" />,
  };

  return (
    <div
      className={`pointer-events-auto glass-panel p-3 rounded-md flex items-center justify-between gap-3 border ${borderColors[variant]} shadow-glass animate-in fade-in slide-in-from-bottom-2 duration-200`}
    >
      <div className="flex items-center gap-2.5 text-xs text-ink">
        {icons[variant]}
        <span className="leading-snug">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className="text-xs font-mono font-semibold px-2 py-1 rounded bg-raised text-ink hover:text-white transition"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Dismiss toast"
          className="text-ink-3 hover:text-ink transition p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}