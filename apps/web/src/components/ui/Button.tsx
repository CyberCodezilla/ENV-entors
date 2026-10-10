'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'glass' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 rounded-md';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-heat via-[#FFC53D] to-flood text-void font-bold shadow-glow hover:opacity-95',
    glass:
      'glass-panel text-ink hover:border-line-strong hover:bg-raised/80',
    ghost:
      'bg-transparent text-ink-2 hover:text-ink hover:bg-raised/50',
    danger:
      'bg-risk-4/20 text-risk-4 border border-risk-4/40 hover:bg-risk-4/30',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon}
      <span>{children}</span>
    </button>
  );
}