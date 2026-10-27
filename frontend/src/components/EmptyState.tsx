import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-navy-900/30 rounded-2xl border border-slate-800/80 my-4">
      <div className="w-14 h-14 rounded-2xl bg-navy-850 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-subtle">
        <Icon className="w-7 h-7 text-brand-cyan/80" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 rounded-lg text-sm font-medium transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
