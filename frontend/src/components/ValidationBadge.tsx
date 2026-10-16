import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationBadgeProps {
  status: 'passed' | 'warning' | 'failed' | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const normStatus = status.toLowerCase();

  const configs = {
    passed: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Passed',
    },
    approved: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Approved',
    },
    validated: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: CheckCircle2,
      label: 'Validated',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle,
      label: 'Warning',
    },
    failed: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      label: 'Failed',
    },
    draft: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: AlertTriangle,
      label: 'Draft',
    },
  };

  const current = (configs as any)[normStatus] || configs.draft;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${current.bg} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      <span>{current.label}</span>
    </span>
  );
};
