import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Tier } from '../types/database';
import type { BudgetStatus } from '../lib/pp-calculator';

// -- Button ---------------------------------------------------------
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}
export function Button({ variant = 'primary', className = '', ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-accent hover:bg-accent-hover text-white',
    secondary: 'bg-bg-tertiary hover:bg-bg-tertiary/70 text-slate-100 border border-border',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'text-slate-300 hover:text-white hover:bg-bg-tertiary',
  }[variant];
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

// -- TierBadge ------------------------------------------------------
export function TierBadge({ tier }: { tier: Tier }) {
  const color = {
    common: 'bg-tier-common/20 text-tier-common border-tier-common/40',
    rare: 'bg-tier-rare/20 text-tier-rare border-tier-rare/40',
    epic: 'bg-tier-epic/20 text-tier-epic border-tier-epic/40',
    legendary: 'bg-tier-legendary/20 text-tier-legendary border-tier-legendary/40',
  }[tier];
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${color}`}
    >
      {tier}
    </span>
  );
}

// -- PPBar ----------------------------------------------------------
export function PPBar({
  used,
  budget,
  status,
}: {
  used: number;
  budget: number;
  status: BudgetStatus;
}) {
  const pct = budget > 0 ? Math.min(used / budget, 1.5) * 100 : 0;
  const barColor = {
    under: 'bg-slate-500',
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    over: 'bg-red-500',
  }[status];
  const textColor = {
    under: 'text-slate-400',
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    over: 'text-red-400',
  }[status];
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Power Points</span>
        <span className={`text-sm font-mono font-semibold ${textColor}`}>
          {used.toFixed(1)} / {budget}
          {status === 'over' && ` (+${(used - budget).toFixed(1)} OVER)`}
        </span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {pct > 100 && (
          <div
            className="h-full -mt-2 bg-red-600 opacity-60"
            style={{ width: `${Math.min(pct - 100, 50)}%` }}
          />
        )}
      </div>
    </div>
  );
}

// -- Panel ----------------------------------------------------------
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-secondary border border-border rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}

// -- PageHeader -----------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

// -- EmptyState -----------------------------------------------------
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 bg-bg-secondary border border-dashed border-border rounded-lg">
      <p className="text-slate-400 mb-4">{message}</p>
      {action}
    </div>
  );
}
