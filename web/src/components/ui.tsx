import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3.5 py-2',
  };
  const variants = {
    primary: 'bg-brand-green hover:bg-brand-greenDark text-white',
    secondary: 'bg-paper border border-ink-200 hover:bg-ink-100 text-ink-900',
    danger: 'bg-brand-red hover:brightness-110 text-white',
    ghost: 'hover:bg-ink-100 text-ink-700',
  };
  return (
    <button
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'neutral';
  children: ReactNode;
}) {
  const tones = {
    green: 'bg-brand-green/10 text-brand-greenDark',
    red: 'bg-brand-red/10 text-brand-red',
    amber: 'bg-brand-amber/15 text-brand-amber',
    blue: 'bg-blue-500/10 text-blue-700',
    neutral: 'bg-ink-100 text-ink-500',
  };
  return <span className={clsx('pill', tones[tone])}>{children}</span>;
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx('card p-5', className)}>{children}</div>;
}

export function StatTile({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'green' | 'amber' | 'red' | 'neutral';
}) {
  const tones = {
    green: 'text-brand-greenDark bg-brand-green/10',
    amber: 'text-brand-amber bg-brand-amber/15',
    red: 'text-brand-red bg-brand-red/10',
    neutral: 'text-ink-500 bg-ink-100',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      {icon && (
        <div className={clsx('w-10 h-10 rounded-lg grid place-items-center', tones[tone])}>
          {icon}
        </div>
      )}
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
          {label}
        </div>
        <div className="text-2xl font-semibold leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  accent,
  actions,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="h-display">
          {title}
          {accent && <> <span className="accent">{accent}</span></>}
        </h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <div className="text-lg font-semibold mb-1">{title}</div>
      {body && <div className="text-ink-500 text-sm mb-4">{body}</div>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-brand-red/30 bg-brand-red/5 text-brand-red px-3 py-2 text-sm">
      {message}
    </div>
  );
}
