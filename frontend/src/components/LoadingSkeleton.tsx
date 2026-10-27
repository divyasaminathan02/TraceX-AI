import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse space-y-3">
      <div className="h-10 bg-navy-850/80 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 items-center p-3 bg-navy-900/40 rounded-lg border border-slate-800/60">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-800/70 rounded"
              style={{ width: `${Math.max(40, 100 - cIdx * 10)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-navy-900/60 rounded-xl border border-slate-800/80 animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="w-8 h-8 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-800 rounded w-1/2" />
      <div className="h-3 bg-slate-800/60 rounded w-2/3" />
    </div>
  );
};
